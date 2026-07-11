import { colorWithOpacity } from '../color'
import { squircleClipPath } from '../displacement'
import { captureInlineStyles } from '../style-restore'
import type { Backend, BackendInstance, BackendSurface } from './types'

const TOUCHED = ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'border-radius', 'clip-path']

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

export const cssFallbackBackend: Backend = {
  id: 'css-fallback',
  priority: 0,
  isSupported() {
    return true
  },
  mount(surface) {
    const restore = captureInlineStyles(surface.element, TOUCHED)
    apply(surface)
    const instance: BackendInstance = {
      update(next) {
        apply(next)
      },
      sync() {},
      destroy() {
        restore()
      }
    }
    return instance
  }
}
