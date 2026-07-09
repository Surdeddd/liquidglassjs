import { colorWithOpacity } from '../color'
import { generateDisplacementMap } from '../displacement'
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

class CssSvgInstance implements BackendInstance {
  #id: string
  #filter: SVGFilterElement
  #feImage: SVGFEImageElement
  #feDisplacement: SVGFEDisplacementMapElement
  #feBlur: SVGFEGaussianBlurElement
  #feSaturate: SVGFEColorMatrixElement
  #lastWidth = 0
  #lastHeight = 0

  constructor(surface: BackendSurface, defs: SVGDefsElement) {
    this.#id = `lg-${++uid}`
    this.#filter = document.createElementNS(SVG_NS, 'filter')
    this.#filter.setAttribute('id', this.#id)
    this.#filter.setAttribute('x', '0%')
    this.#filter.setAttribute('y', '0%')
    this.#filter.setAttribute('width', '100%')
    this.#filter.setAttribute('height', '100%')
    this.#filter.setAttribute('color-interpolation-filters', 'sRGB')

    this.#feImage = document.createElementNS(SVG_NS, 'feImage')
    this.#feImage.setAttribute('result', 'lgMap')
    this.#feImage.setAttribute('preserveAspectRatio', 'none')
    this.#feImage.setAttribute('x', '0%')
    this.#feImage.setAttribute('y', '0%')
    this.#feImage.setAttribute('width', '100%')
    this.#feImage.setAttribute('height', '100%')

    this.#feDisplacement = document.createElementNS(SVG_NS, 'feDisplacementMap')
    this.#feDisplacement.setAttribute('in', 'SourceGraphic')
    this.#feDisplacement.setAttribute('in2', 'lgMap')
    this.#feDisplacement.setAttribute('xChannelSelector', 'R')
    this.#feDisplacement.setAttribute('yChannelSelector', 'G')

    this.#feBlur = document.createElementNS(SVG_NS, 'feGaussianBlur')
    this.#feSaturate = document.createElementNS(SVG_NS, 'feColorMatrix')
    this.#feSaturate.setAttribute('type', 'saturate')

    this.#filter.append(this.#feImage, this.#feDisplacement, this.#feBlur, this.#feSaturate)
    defs.appendChild(this.#filter)

    this.#applyStyles(surface)
    this.#refreshMap(surface, true)
  }

  update(surface: BackendSurface): void {
    this.#applyStyles(surface)
    this.#refreshMap(surface, true)
  }

  sync(surface: BackendSurface): void {
    this.#refreshMap(surface, false)
  }

  destroy(): void {
    this.#filter.remove()
  }

  #applyStyles(surface: BackendSurface): void {
    if (!isStyleable(surface.element)) return
    const { material } = surface
    const style = surface.element.style
    style.setProperty('backdrop-filter', `url("#${this.#id}")`)
    style.setProperty('-webkit-backdrop-filter', `url("#${this.#id}")`)
    style.setProperty('background', colorWithOpacity(material.tint, material.tintOpacity))
    if (typeof material.radius === 'number') {
      style.setProperty('border-radius', `${material.radius}px`)
    }
    const specularAlpha = material.specular * 0.55
    style.setProperty(
      'box-shadow',
      `inset 0 1px 0 rgba(255, 255, 255, ${specularAlpha.toFixed(3)}), inset 0 -1px 0 rgba(255, 255, 255, ${(specularAlpha * 0.35).toFixed(3)})`
    )
    this.#feDisplacement.setAttribute(
      'scale',
      String(Math.round(material.refraction * material.thickness * 2))
    )
    this.#feBlur.setAttribute('stdDeviation', String(material.blur))
    this.#feSaturate.setAttribute('values', String(material.saturation))
  }

  #refreshMap(surface: BackendSurface, force: boolean): void {
    const { width, height } = surfaceSize(surface)
    if (width < 1 || height < 1) return
    if (!force && Math.abs(width - this.#lastWidth) < 1 && Math.abs(height - this.#lastHeight) < 1) {
      return
    }
    this.#lastWidth = width
    this.#lastHeight = height
    const map = generateDisplacementMap({
      width,
      height,
      radius: effectiveRadius(surface),
      bevelWidth: surface.material.bevelWidth,
      bevelDepth: surface.material.bevelDepth
    })
    if (map) {
      this.#feImage.setAttribute('href', map.toDataURL())
    }
  }
}

function clearStyles(element: Element): void {
  if (!isStyleable(element)) return
  const style = element.style
  style.removeProperty('backdrop-filter')
  style.removeProperty('-webkit-backdrop-filter')
  style.removeProperty('background')
  style.removeProperty('border-radius')
  style.removeProperty('box-shadow')
}

export const cssSvgBackend: Backend = {
  id: 'css-svg',
  priority: 30,
  isSupported(capabilities) {
    return capabilities.backdropFilterUrl
  },
  mount(surface) {
    const defs = ensureDefs()
    if (!defs) {
      return { update() {}, sync() {}, destroy() {} }
    }
    const instance = new CssSvgInstance(surface, defs)
    return {
      update(next) {
        instance.update(next)
      },
      sync(next) {
        instance.sync(next)
      },
      destroy() {
        instance.destroy()
        clearStyles(surface.element)
      }
    }
  }
}
