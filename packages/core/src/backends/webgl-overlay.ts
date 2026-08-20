import { buildLuminanceGrid, setLuminanceGrid } from '../quality/contrast'
import { resolveRadiusPx } from '../displacement'
import {
  GlRenderer,
  MAX_SHAPES,
  scaleMaterialToDevice,
  unionRect,
  type GlDraw,
  type GlRect,
  type GlShape
} from '../gl/renderer'
import { getQuality } from '../quality/profile'
import { colorWithOpacity } from '../color'
import { glassShadowCss } from '../material'
import { pinUsedMargins } from '../runtime/layout'
import { onViewport } from '../runtime/scheduler'
import { captureInlineStyles } from '../style-restore'
import type { Backend, BackendInstance, BackendSurface } from './types'

const DEFAULT_MERGE_K = 30

const MAX_SNAPSHOT_SIDE = 4096

const SNAPSHOT_TEXEL_DENSITY = 0.75

const SCROLL_QUIET_MS = 180

function isStyleable(element: Element): element is HTMLElement {
  return typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
}

function dpr(): number {
  return Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, getQuality().maxDpr)
}

const ANCHOR_MARGIN = 72
const MAX_CANVAS_SIDE = 8192

export function requiredOverlayBox(rects: GlRect[], margin = ANCHOR_MARGIN): GlRect {
  const union = unionRect(rects, margin)
  return {
    x: Math.floor(union.x),
    y: Math.floor(union.y),
    width: Math.ceil(union.width),
    height: Math.ceil(union.height)
  }
}

export function needsReanchor(current: GlRect | null, required: GlRect): boolean {
  if (!current) return true
  if (
    required.x < current.x ||
    required.y < current.y ||
    required.x + required.width > current.x + current.width ||
    required.y + required.height > current.y + current.height
  ) {
    return true
  }
  const currentArea = current.width * current.height
  const requiredArea = Math.max(required.width * required.height, 1)
  return currentArea > requiredArea * 2.5
}

class OverlayManager {
  static #instance: OverlayManager | null = null

  static acquire(): OverlayManager | null {
    if (OverlayManager.#instance) return OverlayManager.#instance
    if (typeof document === 'undefined' || !document.body) return null
    const canvas = document.createElement('canvas')
    canvas.setAttribute('data-liquid-glass-overlay', 'true')
    canvas.setAttribute('aria-hidden', 'true')
    const style = canvas.style
    style.position = 'absolute'
    style.left = '0'
    style.top = '0'
    style.pointerEvents = 'none'
    style.zIndex = String(getQuality().overlayZIndex)
    style.willChange = 'transform'
    document.body.appendChild(canvas)
    const renderer = GlRenderer.create(canvas)
    if (!renderer) {
      canvas.remove()
      return null
    }
    const manager = new OverlayManager(canvas, renderer)
    renderer.onContextRestored(() => manager.scheduleSnapshot())
    OverlayManager.#instance = manager
    return manager
  }

  #canvas: HTMLCanvasElement
  #renderer: GlRenderer
  #surfaces = new Set<BackendSurface>()
  #renderFrame = 0
  #snapshotTimer: ReturnType<typeof setTimeout> | null = null
  #snapshotting = false
  #snapshotDirty = false
  #mutationObserver: MutationObserver | null = null
  #anchor: GlRect | null = null
  #quietUntil = 0
  #unwatchViewport: (() => void) | null = null

  #onResize = (): void => {
    this.scheduleRender()
  }

  #onMotionSettled = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[data-liquid-glass], [data-liquid-glass-overlay]')) return
    if (!this.#touchesSurfaces(target)) return
    this.scheduleSnapshot()
  }

  private constructor(canvas: HTMLCanvasElement, renderer: GlRenderer) {
    this.#canvas = canvas
    this.#renderer = renderer
    window.addEventListener('resize', this.#onResize, { passive: true })
    document.addEventListener('transitionend', this.#onMotionSettled, { capture: true, passive: true })
    document.addEventListener('animationend', this.#onMotionSettled, { capture: true, passive: true })
    this.#unwatchViewport = onViewport(() => {
      this.#quietUntil = Date.now() + SCROLL_QUIET_MS
    })
    if (typeof MutationObserver !== 'undefined') {
      this.#mutationObserver = new MutationObserver(records => {
        for (const record of records) {
          const target = record.target
          if (target instanceof Element && target.closest('[data-liquid-glass], [data-liquid-glass-overlay]')) {
            continue
          }
          if (!this.#touchesSurfaces(target)) continue
          this.scheduleSnapshot()
          return
        }
      })
      this.#mutationObserver.observe(document.body, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true
      })
    }
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (fn: () => void) => setTimeout(fn, 180)
    idle(() => {
      if (!this.#destroyed) this.scheduleSnapshot()
    })
  }

  #touchesSurfaces(target: Node): boolean {
    if (!(target instanceof Element)) return true
    const el = target
    if (typeof el.getBoundingClientRect !== 'function') return true
    const box = el.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) return true
    const reach = 240
    for (const surface of this.#surfaces) {
      const glass = surface.element.getBoundingClientRect()
      if (
        box.left < glass.right + reach &&
        box.right > glass.left - reach &&
        box.top < glass.bottom + reach &&
        box.bottom > glass.top - reach
      ) {
        return true
      }
    }
    return false
  }

  add(surface: BackendSurface): void {
    this.#surfaces.add(surface)
    this.scheduleRender()
    this.#syncPoll()
  }

  remove(surface: BackendSurface): void {
    this.#surfaces.delete(surface)
    if (this.#surfaces.size === 0) {
      this.#teardown()
      return
    }
    this.scheduleRender()
    this.#syncPoll()
  }

  #pollFrame = 0
  #pollSignature = ''

  #needsPoll(surface: BackendSurface): boolean {
    if (surface.merge) return true
    if (typeof getComputedStyle !== 'function') return false
    const computed = getComputedStyle(surface.element)
    if (computed.position === 'fixed' || computed.position === 'sticky') return true
    return computed.transform !== '' && computed.transform !== 'none'
  }

  #syncPoll(): void {
    const needsPoll = [...this.#surfaces].some(surface => this.#needsPoll(surface))
    if (!needsPoll && this.#pollFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#pollFrame)
      this.#pollFrame = 0
      return
    }
    if (needsPoll && !this.#pollFrame && typeof requestAnimationFrame === 'function') {
      const loop = (): void => {
        this.#pollFrame = 0
        const polled = [...this.#surfaces].filter(surface => this.#needsPoll(surface))
        if (polled.length === 0) return
        let signature = ''
        for (const surface of polled) {
          const box = surface.element.getBoundingClientRect()
          signature += `${box.left.toFixed(1)},${box.top.toFixed(1)},${box.width.toFixed(1)},${box.height.toFixed(1)};`
        }
        if (signature !== this.#pollSignature) {
          this.#pollSignature = signature
          this.#render()
        }
        this.#pollFrame = requestAnimationFrame(loop)
      }
      this.#pollFrame = requestAnimationFrame(loop)
    }
  }

  #snapshotDeadline = 0

  scheduleSnapshot(): void {
    const throttle = getQuality().snapshotThrottleMs
    const now = Date.now()
    if (now < this.#quietUntil) {
      if (this.#snapshotTimer) clearTimeout(this.#snapshotTimer)
      this.#snapshotTimer = setTimeout(() => {
        this.#snapshotTimer = null
        this.scheduleSnapshot()
      }, this.#quietUntil - now)
      return
    }
    if (this.#snapshotDeadline === 0) this.#snapshotDeadline = now + throttle * 4
    if (now >= this.#snapshotDeadline) {
      if (this.#snapshotTimer) clearTimeout(this.#snapshotTimer)
      this.#snapshotTimer = null
      this.#snapshotDeadline = 0
      void this.#snapshot()
      return
    }
    if (this.#snapshotTimer) clearTimeout(this.#snapshotTimer)
    this.#snapshotTimer = setTimeout(() => {
      this.#snapshotTimer = null
      this.#snapshotDeadline = 0
      void this.#snapshot()
    }, throttle)
  }

  scheduleRender(): void {
    if (this.#renderFrame || typeof requestAnimationFrame !== 'function') return
    this.#renderFrame = requestAnimationFrame(() => {
      this.#renderFrame = 0
      this.#render()
    })
  }

  #texBand: { y: number; height: number; fullHeight: number } | null = null

  #snapshotBand(pageH: number): { y: number; height: number } {
    if (typeof window === 'undefined') return { y: 0, height: pageH }
    const bodyTop = document.body.getBoundingClientRect().top + window.scrollY
    let top = Infinity
    let bottom = -Infinity
    for (const surface of this.#surfaces) {
      const box = surface.element.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      top = Math.min(top, box.top + window.scrollY - bodyTop)
      bottom = Math.max(bottom, box.bottom + window.scrollY - bodyTop)
    }
    if (!Number.isFinite(top)) return { y: 0, height: pageH }
    const margin = Math.max(window.innerHeight, 600)
    const y = Math.max(0, Math.floor(top - margin))
    const height = Math.min(pageH, Math.ceil(bottom + margin)) - y
    if (height >= pageH * 0.8) return { y: 0, height: pageH }
    return { y, height: Math.max(1, height) }
  }

  async #snapshot(): Promise<void> {
    if (this.#snapshotting || this.#destroyed) {
      this.#snapshotDirty = !this.#destroyed
      return
    }
    this.#snapshotting = true
    let restorePins: Array<() => void> = []
    try {
      const { toSvg } = await import('html-to-image')
      if (this.#destroyed) return
      const body = document.body
      const pageW = Math.max(body.scrollWidth, 1)
      const pageH = Math.max(body.scrollHeight, 1)
      const band = this.#snapshotBand(pageH)
      const bandBottom = band.y + band.height
      const partial = band.height < pageH
      const scrollYAtStart = window.scrollY
      const bodyTop = body.getBoundingClientRect().top + scrollYAtStart
      const scale = Math.min(
        SNAPSHOT_TEXEL_DENSITY,
        MAX_SNAPSHOT_SIDE / Math.max(pageW, band.height, 1)
      )
      restorePins = pinUsedMargins(
        [...this.#surfaces].map(surface => surface.element),
        body
      )
      const svgUrl = await toSvg(body, {
        width: pageW,
        height: pageH,
        filter: node => {
          if (!(node instanceof Element)) return true
          if (
            node.hasAttribute('data-liquid-glass') ||
            node.hasAttribute('data-liquid-glass-overlay') ||
            node.hasAttribute('data-liquid-glass-ignore')
          ) {
            return false
          }
          if (!partial || node === body || typeof node.getBoundingClientRect !== 'function') {
            return true
          }
          const box = node.getBoundingClientRect()
          if (box.height === 0 && box.width === 0) return true
          return box.top + scrollYAtStart - bodyTop < bandBottom
        }
      })
      if (this.#destroyed) return
      const image = new Image()
      image.decoding = 'async'
      image.src = svgUrl
      if (typeof image.decode === 'function') {
        await image.decode()
      } else {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('snapshot image failed'))
        })
      }
      if (this.#destroyed) return
      const snapshot = document.createElement('canvas')
      snapshot.width = Math.max(1, Math.round(pageW * scale))
      snapshot.height = Math.max(1, Math.round(band.height * scale))
      const context = snapshot.getContext('2d')
      if (!context) throw new Error('snapshot 2d context unavailable')
      context.scale(scale, scale)
      context.drawImage(image, 0, -band.y)
      this.#texBand = { y: band.y, height: band.height, fullHeight: pageH }
      this.#renderer.setTexture(snapshot)
      const gridIdle =
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback
          : (fn: () => void) => setTimeout(fn, 120)
      gridIdle(() => {
        if (this.#destroyed) return
        setLuminanceGrid(buildLuminanceGrid(snapshot, pageW, band.height, 48, bodyTop + band.y))
      })
      this.scheduleRender()
    } catch {
      this.#snapshotDirty = false
      return
    } finally {
      for (const restore of restorePins) restore()
      this.#snapshotting = false
    }
    if (this.#snapshotDirty) {
      this.#snapshotDirty = false
      this.scheduleSnapshot()
    }
  }

  #render(): void {
    if (typeof document !== 'undefined' && document.hidden) return
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const draws: GlDraw[] = []
    const groups = new Map<string, { shapes: GlShape[]; surface: BackendSurface; mergeK: number }>()
    for (const surface of this.#surfaces) {
      const box = surface.element.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      const shape: GlShape = {
        rect: {
          x: box.left + scrollX,
          y: box.top + scrollY,
          width: box.width,
          height: box.height
        },
        radius: resolveRadiusPx(surface.material.radius, surface.element, box.width, box.height)
      }
      if (surface.merge) {
        const key = surface.merge
        const group = groups.get(key)
        const mergeK = surface.mergeStrength ?? DEFAULT_MERGE_K
        if (group) {
          if (group.shapes.length < MAX_SHAPES) group.shapes.push(shape)
          group.mergeK = Math.max(group.mergeK, mergeK)
        } else {
          groups.set(key, { shapes: [shape], surface, mergeK })
        }
        continue
      }
      draws.push({ quad: shape.rect, shapes: [shape], material: surface.material, mergeK: 1 })
    }
    for (const group of groups.values()) {
      const quad = unionRect(
        group.shapes.map(shape => shape.rect),
        group.mergeK
      )
      if (quad.width < 1 || quad.height < 1) continue
      draws.push({ quad, shapes: group.shapes, material: group.surface.material, mergeK: group.mergeK })
    }
    if (draws.length === 0) return

    const required = requiredOverlayBox(draws.map(draw => draw.quad))
    if (needsReanchor(this.#anchor, required)) {
      this.#anchor = required
      const style = this.#canvas.style
      style.width = `${required.width}px`
      style.height = `${required.height}px`
      style.transform = `translate(${required.x}px, ${required.y}px)`
    }
    const anchor = this.#anchor
    if (!anchor) return
    const ratio = Math.min(
      dpr(),
      MAX_CANVAS_SIDE / Math.max(anchor.width, anchor.height, 1)
    )
    this.#renderer.resize(Math.round(anchor.width * ratio), Math.round(anchor.height * ratio))

    const toCanvas = (rect: GlRect): GlRect => ({
      x: (rect.x - anchor.x) * ratio,
      y: (rect.y - anchor.y) * ratio,
      width: rect.width * ratio,
      height: rect.height * ratio
    })
    const canvasDraws: GlDraw[] = draws.map(draw => ({
      quad: toCanvas(draw.quad),
      shapes: draw.shapes.map(shape => ({
        rect: toCanvas(shape.rect),
        radius: shape.radius * ratio
      })),
      material: scaleMaterialToDevice(draw.material, {
        radius: draw.shapes[0]?.radius ?? 0,
        width: draw.quad.width,
        height: draw.quad.height,
        ratio
      }),
      pxRatio: ratio,
      mergeK: draw.mergeK * ratio
    }))
    const bodyBox = document.body.getBoundingClientRect()
    const band = this.#texBand
    if (band && band.height < band.fullHeight) {
      const bodyTop = bodyBox.top + scrollY
      for (const draw of draws) {
        const top = draw.quad.y - bodyTop
        if (
          (band.y > 0 && top < band.y + 160) ||
          (band.y + band.height < band.fullHeight &&
            top + draw.quad.height > band.y + band.height - 160)
        ) {
          this.scheduleSnapshot()
          break
        }
      }
    }
    const bandScale = band ? bodyBox.height / Math.max(band.fullHeight, 1) : 1
    this.#renderer.render(canvasDraws, {
      x: (bodyBox.left + scrollX - anchor.x) * ratio,
      y: (bodyBox.top + scrollY + (band ? band.y * bandScale : 0) - anchor.y) * ratio,
      width: bodyBox.width * ratio,
      height: (band ? band.height * bandScale : bodyBox.height) * ratio
    })
  }

  #destroyed = false

  #teardown(): void {
    this.#destroyed = true
    setLuminanceGrid(null)
    window.removeEventListener('resize', this.#onResize)
    document.removeEventListener('transitionend', this.#onMotionSettled, { capture: true })
    document.removeEventListener('animationend', this.#onMotionSettled, { capture: true })
    this.#unwatchViewport?.()
    this.#unwatchViewport = null
    this.#mutationObserver?.disconnect()
    this.#mutationObserver = null
    if (this.#snapshotTimer) clearTimeout(this.#snapshotTimer)
    if (this.#renderFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#renderFrame)
    }
    if (this.#pollFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#pollFrame)
      this.#pollFrame = 0
    }
    this.#renderer.destroy()
    this.#canvas.remove()
    if (OverlayManager.#instance === this) OverlayManager.#instance = null
  }
}

function applyBaseStyles(surface: BackendSurface): void {
  if (!isStyleable(surface.element)) return
  const { material } = surface
  const style = surface.element.style
  const filter = `blur(${material.blur}px) saturate(${material.saturation}) brightness(${material.brightness})`
  style.setProperty('backdrop-filter', filter)
  style.setProperty('-webkit-backdrop-filter', filter)
  style.setProperty('background', colorWithOpacity(material.tint, material.tintOpacity))
  if (typeof material.radius === 'number') {
    style.setProperty('border-radius', `${material.radius}px`)
  }
  const cast = surface.merge
    ? ''
    : glassShadowCss(material.shadow, surface.element.getBoundingClientRect().height)
  if (cast) style.setProperty('box-shadow', cast)
  else style.removeProperty('box-shadow')
  if (typeof getComputedStyle === 'function') {
    const computed = getComputedStyle(surface.element)
    if (computed.position === 'static') style.setProperty('position', 'relative')
    if (computed.zIndex === 'auto' || computed.zIndex === '0') {
      style.setProperty('z-index', String(getQuality().overlayZIndex + 1))
    }
  }
}

const TOUCHED = [
  'backdrop-filter',
  '-webkit-backdrop-filter',
  'background',
  'border-radius',
  'box-shadow',
  'position',
  'z-index'
]

export const webglOverlayBackend: Backend = {
  id: 'webgl-overlay',
  priority: 10,
  isSupported(capabilities) {
    return capabilities.webgl2
  },
  mount(surface) {
    const restore = captureInlineStyles(surface.element, TOUCHED)
    applyBaseStyles(surface)
    const manager = OverlayManager.acquire()
    if (!manager) {
      const fallback: BackendInstance = {
        update(next) {
          applyBaseStyles(next)
        },
        sync() {},
        destroy() {
          restore()
        }
      }
      return fallback
    }
    manager.add(surface)
    let wasVisible = surface.state.visible
    return {
      update(next) {
        applyBaseStyles(next)
        manager.add(next)
      },
      sync(next) {
        if (next.state.visible && !wasVisible) manager.scheduleSnapshot()
        wasVisible = next.state.visible
        manager.scheduleRender()
      },
      destroy() {
        manager.remove(surface)
        restore()
      }
    }
  }
}
