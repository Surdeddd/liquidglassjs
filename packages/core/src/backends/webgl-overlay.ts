import { colorWithOpacity } from '../color'
import { GlRenderer, MAX_SHAPES, unionRect, type GlDraw, type GlShape } from '../gl/renderer'
import type { Backend, BackendInstance, BackendSurface } from './types'

const DEFAULT_MERGE_K = 30

const MAX_SNAPSHOT_SIDE = 4096
const SNAPSHOT_DEBOUNCE_MS = 300

function isStyleable(element: Element): element is HTMLElement {
  return typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
}

function effectiveRadius(surface: BackendSurface): number {
  if (typeof surface.material.radius === 'number') return surface.material.radius
  if (isStyleable(surface.element) && typeof getComputedStyle === 'function') {
    const parsed = parseFloat(getComputedStyle(surface.element).borderRadius)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function dpr(): number {
  return Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2)
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
    style.position = 'fixed'
    style.inset = '0'
    style.width = '100vw'
    style.height = '100vh'
    style.pointerEvents = 'none'
    style.zIndex = '2147483000'
    document.body.appendChild(canvas)
    const renderer = GlRenderer.create(canvas)
    if (!renderer) {
      canvas.remove()
      return null
    }
    OverlayManager.#instance = new OverlayManager(canvas, renderer)
    return OverlayManager.#instance
  }

  #canvas: HTMLCanvasElement
  #renderer: GlRenderer
  #surfaces = new Set<BackendSurface>()
  #renderFrame = 0
  #snapshotTimer: ReturnType<typeof setTimeout> | null = null
  #snapshotting = false
  #snapshotDirty = false
  #mutationObserver: MutationObserver | null = null

  #onViewport = (): void => {
    this.scheduleRender()
  }

  #onResize = (): void => {
    this.scheduleRender()
  }

  private constructor(canvas: HTMLCanvasElement, renderer: GlRenderer) {
    this.#canvas = canvas
    this.#renderer = renderer
    window.addEventListener('scroll', this.#onViewport, { passive: true, capture: true })
    window.addEventListener('resize', this.#onResize, { passive: true })
    if (typeof MutationObserver !== 'undefined') {
      this.#mutationObserver = new MutationObserver(records => {
        for (const record of records) {
          const target = record.target
          if (target instanceof Element && target.closest('[data-liquid-glass], [data-liquid-glass-overlay]')) {
            continue
          }
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
    this.scheduleSnapshot()
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

  #syncPoll(): void {
    const needsPoll = [...this.#surfaces].some(surface => surface.merge)
    if (!needsPoll && this.#pollFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#pollFrame)
      this.#pollFrame = 0
      return
    }
    if (needsPoll && !this.#pollFrame && typeof requestAnimationFrame === 'function') {
      const loop = (): void => {
        this.#pollFrame = 0
        if (![...this.#surfaces].some(surface => surface.merge)) return
        let signature = ''
        for (const surface of this.#surfaces) {
          if (!surface.merge) continue
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

  scheduleSnapshot(): void {
    if (this.#snapshotTimer) clearTimeout(this.#snapshotTimer)
    this.#snapshotTimer = setTimeout(() => {
      this.#snapshotTimer = null
      void this.#snapshot()
    }, SNAPSHOT_DEBOUNCE_MS)
  }

  scheduleRender(): void {
    if (this.#renderFrame || typeof requestAnimationFrame !== 'function') return
    this.#renderFrame = requestAnimationFrame(() => {
      this.#renderFrame = 0
      this.#render()
    })
  }

  async #snapshot(): Promise<void> {
    if (this.#snapshotting) {
      this.#snapshotDirty = true
      return
    }
    this.#snapshotting = true
    try {
      const { toCanvas } = await import('html-to-image')
      const body = document.body
      const scale = Math.min(
        1,
        MAX_SNAPSHOT_SIDE / Math.max(body.scrollWidth, body.scrollHeight, 1)
      )
      const snapshot = await toCanvas(body, {
        pixelRatio: scale,
        filter: node =>
          !(
            node instanceof Element &&
            (node.hasAttribute('data-liquid-glass') || node.hasAttribute('data-liquid-glass-overlay'))
          )
      })
      this.#renderer.setTexture(snapshot)
      this.scheduleRender()
    } catch {
      this.#snapshotDirty = false
      return
    } finally {
      this.#snapshotting = false
    }
    if (this.#snapshotDirty) {
      this.#snapshotDirty = false
      this.scheduleSnapshot()
    }
  }

  #render(): void {
    if (typeof document !== 'undefined' && document.hidden) return
    const ratio = dpr()
    const width = Math.round(window.innerWidth * ratio)
    const height = Math.round(window.innerHeight * ratio)
    this.#renderer.resize(width, height)
    const draws: GlDraw[] = []
    const groups = new Map<string, { shapes: GlShape[]; surface: BackendSurface; mergeK: number }>()
    for (const surface of this.#surfaces) {
      const box = surface.element.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      const offscreen =
        box.bottom < 0 || box.right < 0 || box.top > window.innerHeight || box.left > window.innerWidth
      const shape: GlShape = {
        rect: {
          x: box.left * ratio,
          y: box.top * ratio,
          width: box.width * ratio,
          height: box.height * ratio
        },
        radius: effectiveRadius(surface) * ratio
      }
      if (surface.merge) {
        const key = surface.merge
        const group = groups.get(key)
        const mergeK = (surface.mergeStrength ?? DEFAULT_MERGE_K) * ratio
        if (group) {
          if (group.shapes.length < MAX_SHAPES) group.shapes.push(shape)
          group.mergeK = Math.max(group.mergeK, mergeK)
        } else {
          groups.set(key, { shapes: [shape], surface, mergeK })
        }
        continue
      }
      if (offscreen) continue
      draws.push({ quad: shape.rect, shapes: [shape], material: surface.material, mergeK: 1 })
    }
    for (const group of groups.values()) {
      const quad = unionRect(
        group.shapes.map(shape => shape.rect),
        group.mergeK
      )
      if (quad.width < 1 || quad.height < 1) continue
      if (quad.y + quad.height < 0 || quad.x + quad.width < 0 || quad.y > height || quad.x > width) {
        continue
      }
      draws.push({ quad, shapes: group.shapes, material: group.surface.material, mergeK: group.mergeK })
    }
    const bodyBox = document.body.getBoundingClientRect()
    this.#renderer.render(draws, {
      x: bodyBox.left * ratio,
      y: bodyBox.top * ratio,
      width: bodyBox.width * ratio,
      height: bodyBox.height * ratio
    })
  }

  #teardown(): void {
    window.removeEventListener('scroll', this.#onViewport, true)
    window.removeEventListener('resize', this.#onResize)
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
    OverlayManager.#instance = null
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
  if (typeof getComputedStyle === 'function') {
    const computed = getComputedStyle(surface.element)
    if (computed.position === 'static') style.setProperty('position', 'relative')
    if (computed.zIndex === 'auto' || computed.zIndex === '0') {
      style.setProperty('z-index', '2147483001')
    }
  }
}

function clearBaseStyles(element: Element): void {
  if (!isStyleable(element)) return
  const style = element.style
  style.removeProperty('backdrop-filter')
  style.removeProperty('-webkit-backdrop-filter')
  style.removeProperty('background')
  style.removeProperty('border-radius')
  style.removeProperty('position')
  style.removeProperty('z-index')
}

export const webglOverlayBackend: Backend = {
  id: 'webgl-overlay',
  priority: 10,
  isSupported(capabilities) {
    return capabilities.webgl2
  },
  mount(surface) {
    applyBaseStyles(surface)
    const manager = OverlayManager.acquire()
    if (!manager) {
      const fallback: BackendInstance = {
        update(next) {
          applyBaseStyles(next)
        },
        sync() {},
        destroy() {
          clearBaseStyles(surface.element)
        }
      }
      return fallback
    }
    manager.add(surface)
    return {
      update(next) {
        applyBaseStyles(next)
        manager.add(next)
      },
      sync() {
        manager.scheduleRender()
      },
      destroy() {
        manager.remove(surface)
        clearBaseStyles(surface.element)
      }
    }
  }
}
