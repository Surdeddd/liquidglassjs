import { colorWithOpacity } from '../color'
import { resolveRadiusPx, resolveThicknessPx } from '../displacement'
import { GlRenderer } from '../gl/renderer'
import type { Backend, BackendInstance, BackendSurface } from './types'

function isStyleable(element: Element): element is HTMLElement {
  return typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
}

class WebglSceneInstance implements BackendInstance {
  #canvas: HTMLCanvasElement
  #renderer: GlRenderer
  #image: HTMLImageElement | null = null
  #hadInlinePosition = false
  #host: HTMLElement

  constructor(surface: BackendSurface, host: HTMLElement, canvas: HTMLCanvasElement, renderer: GlRenderer) {
    this.#host = host
    this.#canvas = canvas
    this.#renderer = renderer
    this.#applyHostStyles(surface)
    this.#loadImage(surface)
    this.#draw(surface)
  }

  update(surface: BackendSurface): void {
    this.#applyHostStyles(surface)
    this.#loadImage(surface)
    this.#draw(surface)
  }

  sync(surface: BackendSurface): void {
    this.#draw(surface)
  }

  destroy(): void {
    this.#renderer.destroy()
    this.#canvas.remove()
    const style = this.#host.style
    style.removeProperty('background')
    style.removeProperty('border-radius')
    style.removeProperty('box-shadow')
    style.removeProperty('isolation')
    if (!this.#hadInlinePosition) style.removeProperty('position')
  }

  #applyHostStyles(surface: BackendSurface): void {
    const { material } = surface
    const style = this.#host.style
    this.#hadInlinePosition = style.getPropertyValue('position') !== ''
    style.setProperty('background', colorWithOpacity(material.tint, 0))
    if (typeof material.radius === 'number') {
      style.setProperty('border-radius', `${material.radius}px`)
    }
    style.setProperty('isolation', 'isolate')
    if (typeof getComputedStyle === 'function' && getComputedStyle(this.#host).position === 'static') {
      style.setProperty('position', 'relative')
    }
  }

  #loadImage(surface: BackendSurface): void {
    const src = surface.sceneImage
    if (!src || this.#image?.src === src) return
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      this.#renderer.setTexture(image)
      this.#draw(surface)
    }
    image.src = src
    this.#image = image
  }

  #draw(surface: BackendSurface): void {
    const dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2)
    const hostBox = this.#host.getBoundingClientRect()
    if (hostBox.width < 1 || hostBox.height < 1) return
    this.#renderer.resize(Math.round(hostBox.width * dpr), Math.round(hostBox.height * dpr))
    if (!this.#renderer.hasTexture) return
    const reference = surface.backdrop ?? this.#host
    const refBox = reference.getBoundingClientRect()
    const quad = { x: 0, y: 0, width: hostBox.width * dpr, height: hostBox.height * dpr }
    this.#renderer.render(
      [
        {
          quad,
          shapes: [
            {
              rect: quad,
              radius:
                resolveRadiusPx(surface.material.radius, surface.element, hostBox.width, hostBox.height) *
                dpr
            }
          ],
          material: {
            ...surface.material,
            thickness:
              resolveThicknessPx(surface.material.thickness, hostBox.width, hostBox.height) * dpr
          },
          mergeK: 1
        }
      ],
      {
        x: (refBox.left - hostBox.left) * dpr,
        y: (refBox.top - hostBox.top) * dpr,
        width: refBox.width * dpr,
        height: refBox.height * dpr
      }
    )
  }
}

export const webglSceneBackend: Backend = {
  id: 'webgl-scene',
  priority: 5,
  autoSelect: false,
  isSupported(capabilities) {
    return capabilities.webgl2
  },
  mount(surface) {
    if (!isStyleable(surface.element)) {
      return { update() {}, sync() {}, destroy() {} }
    }
    const canvas = document.createElement('canvas')
    canvas.setAttribute('data-liquid-glass-layer', 'scene')
    canvas.setAttribute('aria-hidden', 'true')
    const style = canvas.style
    style.position = 'absolute'
    style.inset = '0'
    style.width = '100%'
    style.height = '100%'
    style.zIndex = '-1'
    style.pointerEvents = 'none'
    style.borderRadius = 'inherit'
    surface.element.insertBefore(canvas, surface.element.firstChild)
    const renderer = GlRenderer.create(canvas)
    if (!renderer) {
      canvas.remove()
      return { update() {}, sync() {}, destroy() {} }
    }
    const instance = new WebglSceneInstance(surface, surface.element, canvas, renderer)
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
