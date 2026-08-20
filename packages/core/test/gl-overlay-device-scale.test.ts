import { describe, expect, it, vi } from 'vitest'
import { webglOverlayBackend } from '../src/backends/webgl-overlay'
import type { BackendSurface } from '../src/backends/types'
import { resolveMaterial } from '../src/material'
import { configure, getQuality, resetQuality } from '../src/quality/profile'

vi.mock('html-to-image', () => ({
  toCanvas: async (): Promise<HTMLCanvasElement> => document.createElement('canvas')
}))

const HOST_WIDTH = 200
const HOST_HEIGHT = 100
const BEVEL_WIDTH = 24
const THICKNESS = 20

function fakeGl(uniforms: Map<string, number>): Record<string, unknown> {
  const noop = (): void => {}
  return {
    canvas: null,
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    BLEND: 8,
    SRC_ALPHA: 9,
    ONE_MINUS_SRC_ALPHA: 10,
    TEXTURE_2D: 11,
    TEXTURE0: 12,
    RGBA: 13,
    UNSIGNED_BYTE: 14,
    COLOR_BUFFER_BIT: 15,
    createShader: () => ({}),
    shaderSource: noop,
    compileShader: noop,
    getShaderParameter: () => true,
    deleteShader: noop,
    createProgram: () => ({}),
    attachShader: noop,
    linkProgram: noop,
    getProgramParameter: () => true,
    deleteProgram: noop,
    createBuffer: () => ({}),
    deleteBuffer: noop,
    bindBuffer: noop,
    bufferData: noop,
    enableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    getUniformLocation: (_program: unknown, name: string) => name,
    useProgram: noop,
    enable: noop,
    blendFunc: noop,
    getExtension: () => null,
    createTexture: () => ({}),
    activeTexture: noop,
    bindTexture: noop,
    pixelStorei: noop,
    texImage2D: noop,
    texParameteri: noop,
    deleteTexture: noop,
    viewport: noop,
    clearColor: noop,
    clear: noop,
    uniform1i: noop,
    uniform1f: (name: string, value: number) => uniforms.set(name, value),
    uniform2f: noop,
    uniform4f: noop,
    uniform1fv: noop,
    uniform4fv: noop,
    uniform3f: noop,
    drawArrays: noop
  }
}

function makeSurface(): BackendSurface {
  const element = document.createElement('div')
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: HOST_WIDTH,
      bottom: HOST_HEIGHT,
      width: HOST_WIDTH,
      height: HOST_HEIGHT
    }) as DOMRect
  document.body.appendChild(element)
  return {
    element,
    preset: 'clear',
    material: resolveMaterial({
      preset: 'clear',
      bevelWidth: BEVEL_WIDTH,
      thickness: THICKNESS,
      radius: 12
    }),
    state: { rect: { x: 0, y: 0, width: HOST_WIDTH, height: HOST_HEIGHT }, visible: true },
    backdrop: null,
    sceneImage: null
  }
}

async function overlayUniformsAt(ratio: number): Promise<Map<string, number>> {
  const uniforms = new Map<string, number>()
  const originalContext = HTMLCanvasElement.prototype.getContext
  const originalDpr = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio')

  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string) {
    if (id !== 'webgl2') return null
    const gl = fakeGl(uniforms)
    gl['canvas'] = this
    return gl as unknown as WebGL2RenderingContext
  } as typeof originalContext

  Object.defineProperty(globalThis, 'devicePixelRatio', { value: ratio, configurable: true })
  configure({ maxDpr: ratio })
  vi.useFakeTimers()

  const surface = makeSurface()
  const instance = webglOverlayBackend.mount(surface)
  try {
    await vi.advanceTimersByTimeAsync(getQuality().snapshotThrottleMs * 6)
  } finally {
    instance.destroy()
    surface.element.remove()
    vi.useRealTimers()
    HTMLCanvasElement.prototype.getContext = originalContext
    if (originalDpr) Object.defineProperty(globalThis, 'devicePixelRatio', originalDpr)
    resetQuality()
  }
  return uniforms
}

describe('webgl-overlay hands the shader device pixels', () => {
  it('draws the same css rim at 1x and at 2x', async () => {
    const oneX = await overlayUniformsAt(1)
    const retina = await overlayUniformsAt(2)
    expect(oneX.get('u_bevelWidth')).toBe(BEVEL_WIDTH)
    expect(retina.get('u_bevelWidth')).toBe(BEVEL_WIDTH * 2)
  })

  it('sends the pixel ratio it scaled those lengths by', async () => {
    expect((await overlayUniformsAt(2)).get('u_pxRatio')).toBe(2)
  })

  it('keeps thickness on the same ratio as the rim', async () => {
    expect((await overlayUniformsAt(2)).get('u_thickness')).toBe(THICKNESS * 2)
  })
})
