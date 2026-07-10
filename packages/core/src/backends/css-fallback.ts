import { colorWithOpacity } from '../color'
import { squircleClipPath } from '../displacement'
import type { Backend, BackendInstance, BackendSurface } from './types'

function isStyleable(element: Element): element is HTMLElement {
  return typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
}

function apply(surface: BackendSurface): void {
  if (!isStyleable(surface.element)) return
  const { material } = surface
  const style = surface.element.style
  const filter = `blur(${material.blur}px) saturate(${material.saturation}) brightness(${material.brightness})`
  style.setProperty('background', colorWithOpacity(material.tint, material.tintOpacity))
  style.setProperty('backdrop-filter', filter)
  style.setProperty('-webkit-backdrop-filter', filter)
  if (typeof material.radius === 'number') {
    style.setProperty('border-radius', `${material.radius}px`)
  }
  if (material.shape === 'squircle') {
    style.setProperty('clip-path', squircleClipPath())
  } else {
    style.removeProperty('clip-path')
  }
}

function clear(element: Element): void {
  if (!isStyleable(element)) return
  const style = element.style
  style.removeProperty('background')
  style.removeProperty('backdrop-filter')
  style.removeProperty('-webkit-backdrop-filter')
  style.removeProperty('border-radius')
  style.removeProperty('clip-path')
}

export const cssFallbackBackend: Backend = {
  id: 'css-fallback',
  priority: 0,
  isSupported() {
    return true
  },
  mount(surface) {
    apply(surface)
    const instance: BackendInstance = {
      update(next) {
        apply(next)
      },
      sync() {},
      destroy() {
        clear(surface.element)
      }
    }
    return instance
  }
}
