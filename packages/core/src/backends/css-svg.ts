import { colorWithOpacity } from '../color'
import { generateLensMap, resolveBandPx, squircleClipPath } from '../displacement'
import { buildLensChain } from './filter-chain'
import type { LensChainNodes } from './filter-chain'
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
  #chain: LensChainNodes | null = null
  #chainKey = ''
  #band = 0
  #lastWidth = 0
  #lastHeight = 0
  #lastMapKey = ''

  constructor(surface: BackendSurface, defs: SVGDefsElement) {
    this.#id = `lg-${++uid}`
    this.#filter = document.createElementNS(SVG_NS, 'filter')
    this.#filter.setAttribute('id', this.#id)
    this.#filter.setAttribute('x', '-20%')
    this.#filter.setAttribute('y', '-20%')
    this.#filter.setAttribute('width', '140%')
    this.#filter.setAttribute('height', '140%')
    this.#filter.setAttribute('color-interpolation-filters', 'sRGB')
    defs.appendChild(this.#filter)

    this.#applyStyles(surface)
    this.#refresh(surface, true)
  }

  update(surface: BackendSurface): void {
    this.#applyStyles(surface)
    this.#refresh(surface, true)
  }

  sync(surface: BackendSurface): void {
    this.#refresh(surface, false)
  }

  destroy(): void {
    this.#filter.remove()
  }

  debug(): { band: number } {
    return { band: this.#band }
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
    if (material.shape === 'squircle') {
      style.setProperty('clip-path', squircleClipPath())
    } else {
      style.removeProperty('clip-path')
    }
    const specularAlpha = material.specular * 0.25
    style.setProperty(
      'box-shadow',
      `inset 0 1px 0 rgba(255, 255, 255, ${specularAlpha.toFixed(3)}), inset 0 -1px 0 rgba(255, 255, 255, ${(specularAlpha * 0.35).toFixed(3)})`
    )
  }

  #refresh(surface: BackendSurface, force: boolean): void {
    const { width, height } = surfaceSize(surface)
    if (width < 1 || height < 1) return
    if (!force && Math.abs(width - this.#lastWidth) < 1 && Math.abs(height - this.#lastHeight) < 1) {
      return
    }
    this.#lastWidth = width
    this.#lastHeight = height
    const { material } = surface
    if (material.shape === 'squircle' && material.radius === 'auto' && isStyleable(surface.element)) {
      surface.element.style.setProperty(
        'border-radius',
        `${Math.round(Math.min(width, height) * 0.36)}px`
      )
    }
    const radius = effectiveRadius(surface)
    this.#band = resolveBandPx(material.bevelWidth, radius, width, height)
    const map = generateLensMap({
      width,
      height,
      radius,
      shape: material.shape,
      band: this.#band,
      ior: material.ior,
      thickness: material.thickness,
      magnify: material.magnify
    })
    if (!map) return
    const scale = 2 * map.maxOffset * material.refraction * 2
    const chainKey = `${material.dispersion > 0.001 ? 3 : 1}|${material.frost > 0}|${material.blur}|${material.saturation}|${material.brightness}|${material.dispersion}`
    if (!this.#chain || chainKey !== this.#chainKey) {
      this.#chain = buildLensChain({
        filter: this.#filter,
        material,
        scale,
        passes: material.dispersion > 0.001 ? 3 : 1
      })
      this.#chainKey = chainKey
      this.#lastMapKey = ''
    } else {
      this.#chain.setScale(scale)
    }
    const mapKey = map.url ?? ''
    if (map.url && mapKey !== this.#lastMapKey) {
      this.#chain.feImage.setAttribute('href', map.url)
      this.#lastMapKey = mapKey
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
  style.removeProperty('clip-path')
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
      },
      debug() {
        return instance.debug()
      }
    }
  }
}
