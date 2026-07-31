import { colorWithOpacity } from '../color'
import { resolveRadiusPx, resolveThicknessPx } from '../displacement'
import { GlRenderer, type GlDraw, type GlRect } from '../gl/renderer'
import { getQuality } from '../quality/profile'
import { captureInlineStyles } from '../style-restore'
import type { Backend, BackendInstance, BackendSurface } from './types'

const TOUCHED = ['background', 'border-radius', 'box-shadow', 'isolation', 'position']

function isStyleable(element: Element): element is HTMLElement {
  return typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
}

class SceneGl {
  static #shared: SceneGl | null = null
  static #clients = 0

  #canvas: HTMLCanvasElement
  #renderer: GlRenderer
  #bound: TexImageSource | null = null

  private constructor(canvas: HTMLCanvasElement, renderer: GlRenderer) {
    this.#canvas = canvas
    this.#renderer = renderer
  }

  static acquire(): SceneGl | null {
    if (!SceneGl.#shared) {
      if (typeof document === 'undefined') return null
      const canvas = document.createElement('canvas')
      const renderer = GlRenderer.create(canvas)
      if (!renderer) return null
      SceneGl.#shared = new SceneGl(canvas, renderer)
    }
    SceneGl.#clients += 1
    return SceneGl.#shared
  }

  static release(): void {
    SceneGl.#clients = Math.max(0, SceneGl.#clients - 1)
    if (SceneGl.#clients > 0 || !SceneGl.#shared) return
    SceneGl.#shared.#renderer.destroy()
    SceneGl.#shared = null
  }

  bind(source: TexImageSource): void {
    if (this.#bound === source) return
    this.#renderer.setTexture(source)
    this.#bound = source
  }

  onContextRestored(cb: () => void): void {
    const previous = this.#restored
    this.#restored = () => {
      previous?.()
      cb()
    }
    this.#renderer.onContextRestored(() => {
      this.#bound = null
      this.#restored?.()
    })
  }

  #restored: (() => void) | null = null

  paint(width: number, height: number, draws: GlDraw[], texRect: GlRect): HTMLCanvasElement | null {
    if (!this.#renderer.hasTexture || this.#renderer.contextLost) return null
    this.#renderer.resize(width, height)
    this.#renderer.render(draws, texRect)
    return this.#canvas
  }
}

class WebglSceneInstance implements BackendInstance {
  #canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D | null
  #gl: SceneGl
  #image: HTMLImageElement | null = null
  #restore: () => void
  #host: HTMLElement

  constructor(surface: BackendSurface, host: HTMLElement, canvas: HTMLCanvasElement, gl: SceneGl) {
    this.#host = host
    this.#canvas = canvas
    this.#context = canvas.getContext('2d')
    this.#gl = gl
    this.#restore = captureInlineStyles(host, TOUCHED)
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
    SceneGl.release()
    this.#canvas.remove()
    this.#restore()
  }

  #applyHostStyles(surface: BackendSurface): void {
    const { material } = surface
    const style = this.#host.style
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
      this.#draw(surface)
    }
    image.src = src
    this.#image = image
  }

  #draw(surface: BackendSurface): void {
    const dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, getQuality().maxDpr)
    const hostBox = this.#host.getBoundingClientRect()
    if (hostBox.width < 1 || hostBox.height < 1) return
    const image = this.#image
    if (!image || !image.complete || image.naturalWidth === 0) return
    this.#gl.bind(image)
    const width = Math.round(hostBox.width * dpr)
    const height = Math.round(hostBox.height * dpr)
    const reference = surface.backdrop ?? this.#host
    const refBox = reference.getBoundingClientRect()
    const quad = { x: 0, y: 0, width: hostBox.width * dpr, height: hostBox.height * dpr }
    const painted = this.#gl.paint(
      width,
      height,
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
    if (!painted || !this.#context) return
    this.#canvas.width = width
    this.#canvas.height = height
    this.#context.clearRect(0, 0, width, height)
    this.#context.drawImage(painted, 0, 0)
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
    const gl = SceneGl.acquire()
    if (!gl) {
      return { update() {}, sync() {}, destroy() {} }
    }
    surface.element.insertBefore(canvas, surface.element.firstChild)
    const instance = new WebglSceneInstance(surface, surface.element, canvas, gl)
    gl.onContextRestored(() => instance.update(surface))
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
