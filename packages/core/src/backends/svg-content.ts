import { colorWithOpacity } from '../color'
import { generateDisplacementMap, squircleClipPath } from '../displacement'
import type { Backend, BackendInstance, BackendSurface } from './types'

const SVG_NS = 'http://www.w3.org/2000/svg'

let uid = 0
let defsRoot: SVGDefsElement | null = null

function ensureDefs(): SVGDefsElement | null {
  if (typeof document === 'undefined' || !document.body) return null
  if (defsRoot && defsRoot.isConnected) return defsRoot
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.style.left = '-9999px'
  const defs = document.createElementNS(SVG_NS, 'defs')
  svg.appendChild(defs)
  document.body.appendChild(svg)
  defsRoot = defs
  return defs
}

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

function surfaceSize(surface: BackendSurface): { width: number; height: number } {
  const { rect } = surface.state
  if (rect.width > 0 && rect.height > 0) return { width: rect.width, height: rect.height }
  const box = surface.element.getBoundingClientRect()
  return { width: box.width, height: box.height }
}

class SvgContentInstance implements BackendInstance {
  #defs: SVGDefsElement
  #filter: SVGFilterElement | null = null
  #feImage: SVGFEImageElement | null = null
  #feDisplacement: SVGFEDisplacementMapElement | null = null
  #feBlur: SVGFEGaussianBlurElement | null = null
  #feSaturate: SVGFEColorMatrixElement | null = null
  #layer: HTMLElement | null = null
  #clone: Element | null = null
  #source: Element | null = null
  #mutationObserver: MutationObserver | null = null
  #cloneFrame = 0
  #hadInlinePosition = false
  #lastWidth = 0
  #lastHeight = 0

  constructor(surface: BackendSurface, defs: SVGDefsElement) {
    this.#defs = defs
    this.#applyBaseStyles(surface)
    this.#syncLayer(surface)
  }

  update(surface: BackendSurface): void {
    this.#applyBaseStyles(surface)
    this.#syncLayer(surface)
    this.#refreshMap(surface, true)
  }

  sync(surface: BackendSurface): void {
    this.#position(surface)
    this.#refreshMap(surface, false)
  }

  destroy(): void {
    this.#teardownLayer()
    const host = this.#host
    if (!host || !isStyleable(host)) return
    const style = host.style
    style.removeProperty('backdrop-filter')
    style.removeProperty('-webkit-backdrop-filter')
    style.removeProperty('background')
    style.removeProperty('border-radius')
    style.removeProperty('box-shadow')
    style.removeProperty('isolation')
    style.removeProperty('clip-path')
    if (!this.#hadInlinePosition) style.removeProperty('position')
  }

  #host: Element | null = null

  #applyBaseStyles(surface: BackendSurface): void {
    this.#host = surface.element
    if (!isStyleable(surface.element)) return
    const { material } = surface
    const style = surface.element.style
    this.#hadInlinePosition = style.getPropertyValue('position') !== ''
    const filter = `blur(${material.blur}px) saturate(${material.saturation}) brightness(${material.brightness})`
    style.setProperty('backdrop-filter', filter)
    style.setProperty('-webkit-backdrop-filter', filter)
    style.setProperty('background', colorWithOpacity(material.tint, material.tintOpacity))
    if (typeof material.radius === 'number') {
      style.setProperty('border-radius', `${material.radius}px`)
    }
    if (material.shape === 'squircle') {
      style.setProperty('clip-path', squircleClipPath())
    } else {
      style.removeProperty('clip-path')
    }
    const specularAlpha = material.specular * 0.55
    style.setProperty(
      'box-shadow',
      `inset 0 1px 0 rgba(255, 255, 255, ${specularAlpha.toFixed(3)}), inset 0 -1px 0 rgba(255, 255, 255, ${(specularAlpha * 0.35).toFixed(3)})`
    )
    style.setProperty('isolation', 'isolate')
    if (typeof getComputedStyle === 'function' && getComputedStyle(surface.element).position === 'static') {
      style.setProperty('position', 'relative')
    }
  }

  #syncLayer(surface: BackendSurface): void {
    if (surface.backdrop === this.#source) {
      this.#position(surface)
      return
    }
    this.#teardownLayer()
    this.#source = surface.backdrop
    if (!this.#source || !isStyleable(surface.element)) return

    const id = `lgc-${++uid}`
    const filter = document.createElementNS(SVG_NS, 'filter')
    filter.setAttribute('id', id)
    filter.setAttribute('x', '-20%')
    filter.setAttribute('y', '-20%')
    filter.setAttribute('width', '140%')
    filter.setAttribute('height', '140%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')

    const feImage = document.createElementNS(SVG_NS, 'feImage')
    feImage.setAttribute('result', 'lgMap')
    feImage.setAttribute('preserveAspectRatio', 'none')

    const feDisplacement = document.createElementNS(SVG_NS, 'feDisplacementMap')
    feDisplacement.setAttribute('in', 'SourceGraphic')
    feDisplacement.setAttribute('in2', 'lgMap')
    feDisplacement.setAttribute('xChannelSelector', 'R')
    feDisplacement.setAttribute('yChannelSelector', 'G')

    const feBlur = document.createElementNS(SVG_NS, 'feGaussianBlur')
    const feSaturate = document.createElementNS(SVG_NS, 'feColorMatrix')
    feSaturate.setAttribute('type', 'saturate')

    filter.append(feImage, feDisplacement, feBlur, feSaturate)
    this.#defs.appendChild(filter)
    this.#filter = filter
    this.#feImage = feImage
    this.#feDisplacement = feDisplacement
    this.#feBlur = feBlur
    this.#feSaturate = feSaturate

    const layer = document.createElement('div')
    layer.setAttribute('data-liquid-glass-layer', 'refract')
    layer.setAttribute('aria-hidden', 'true')
    const layerStyle = layer.style
    layerStyle.position = 'absolute'
    layerStyle.inset = '0'
    layerStyle.overflow = 'hidden'
    layerStyle.borderRadius = 'inherit'
    layerStyle.zIndex = '-1'
    layerStyle.pointerEvents = 'none'
    layerStyle.filter = `url("#${id}")`
    surface.element.insertBefore(layer, surface.element.firstChild)
    this.#layer = layer

    this.#recloneNow(surface)
    this.#observeSource()
    this.#refreshMap(surface, true)
  }

  #observeSource(): void {
    if (!this.#source || typeof MutationObserver === 'undefined') return
    this.#mutationObserver = new MutationObserver(records => {
      for (const record of records) {
        const target = record.target
        if (
          target instanceof Element &&
          target.closest('[data-liquid-glass], [data-liquid-glass-layer], [data-liquid-glass-overlay]')
        ) {
          continue
        }
        this.#scheduleReclone()
        return
      }
    })
    this.#mutationObserver.observe(this.#source, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true
    })
  }

  #scheduleReclone(): void {
    if (this.#cloneFrame || typeof requestAnimationFrame !== 'function') return
    this.#cloneFrame = requestAnimationFrame(() => {
      this.#cloneFrame = 0
      if (this.#lastSurface) this.#recloneNow(this.#lastSurface)
    })
  }

  #lastSurface: BackendSurface | null = null

  #recloneNow(surface: BackendSurface): void {
    this.#lastSurface = surface
    if (!this.#layer || !this.#source) return
    this.#clone?.remove()
    const clone = this.#source.cloneNode(true) as Element
    for (const glass of clone.querySelectorAll(
      'liquid-glass, [data-liquid-glass], [data-liquid-glass-layer], [data-liquid-glass-overlay]'
    )) {
      glass.remove()
    }
    if (isStyleable(clone)) {
      clone.style.margin = '0'
      clone.style.pointerEvents = 'none'
    }
    clone.removeAttribute('id')
    this.#layer.appendChild(clone)
    this.#clone = clone
    this.#position(surface)
  }

  #position(surface: BackendSurface): void {
    const clone = this.#clone
    if (!clone || !this.#source || !isStyleable(clone)) return
    const sourceBox = this.#source.getBoundingClientRect()
    const glassBox = surface.element.getBoundingClientRect()
    const borderLeft = surface.element.clientLeft
    const borderTop = surface.element.clientTop
    const style = clone.style
    style.inset = ''
    style.position = 'absolute'
    style.left = `${sourceBox.left - glassBox.left - borderLeft}px`
    style.top = `${sourceBox.top - glassBox.top - borderTop}px`
    style.width = `${sourceBox.width}px`
    style.height = `${sourceBox.height}px`
  }

  #refreshMap(surface: BackendSurface, force: boolean): void {
    if (!this.#feImage || !this.#feDisplacement) return
    const { width, height } = surfaceSize(surface)
    if (width < 1 || height < 1) return
    if (!force && Math.abs(width - this.#lastWidth) < 1 && Math.abs(height - this.#lastHeight) < 1) {
      return
    }
    this.#lastWidth = width
    this.#lastHeight = height
    this.#feDisplacement.setAttribute(
      'scale',
      String(Math.round(surface.material.refraction * surface.material.thickness * 2))
    )
    this.#feBlur?.setAttribute('stdDeviation', String(surface.material.blur))
    this.#feSaturate?.setAttribute('values', String(surface.material.saturation))
    const map = generateDisplacementMap({
      width,
      height,
      radius: effectiveRadius(surface),
      bevelWidth: surface.material.bevelWidth,
      bevelDepth: surface.material.bevelDepth,
      shape: surface.material.shape
    })
    if (map) {
      this.#feImage.setAttribute('href', map.toDataURL())
    }
  }

  #teardownLayer(): void {
    this.#mutationObserver?.disconnect()
    this.#mutationObserver = null
    if (this.#cloneFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#cloneFrame)
      this.#cloneFrame = 0
    }
    this.#clone?.remove()
    this.#clone = null
    this.#layer?.remove()
    this.#layer = null
    this.#filter?.remove()
    this.#filter = null
    this.#feImage = null
    this.#feDisplacement = null
    this.#feBlur = null
    this.#feSaturate = null
    this.#source = null
  }
}

export const svgContentBackend: Backend = {
  id: 'svg-content',
  priority: 20,
  isSupported(capabilities) {
    return capabilities.svgFilterOnContent
  },
  mount(surface) {
    const defs = ensureDefs()
    if (!defs) {
      return { update() {}, sync() {}, destroy() {} }
    }
    const instance = new SvgContentInstance(surface, defs)
    return {
      update(next) {
        instance.update(next)
      },
      sync(next) {
        instance.sync(next)
      },
      destroy() {
        instance.destroy()
      }
    }
  }
}
