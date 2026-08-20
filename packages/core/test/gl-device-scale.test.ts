import { describe, expect, it } from 'vitest'
import { webglSceneBackend } from '../src/backends/webgl-scene'
import type { BackendSurface } from '../src/backends/types'
import { resolveMaterial } from '../src/material'
import { configure, resetQuality } from '../src/quality/profile'

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
    ({ x: 0, y: 0, left: 0, top: 0, right: HOST_WIDTH, bottom: HOST_HEIGHT, width: HOST_WIDTH, height: HOST_HEIGHT }) as DOMRect
  document.body.appendChild(element)
  return {
    element,
    preset: 'clear',
    material: resolveMaterial({
      preset: 'clear',
      bevelWidth: BEVEL_WIDTH,
      thickness: THICKNESS,
      radius: 12,
      frost: 0.5
    }),
    state: { rect: { x: 0, y: 0, width: HOST_WIDTH, height: HOST_HEIGHT }, visible: true },
    backdrop: null,
    sceneImage: 'scene.png'
  }
}

/** The scene context is shared between mounts, so each paint runs and releases alone. */
function paintAt(ratio: number): Map<string, number> {
  const uniforms = new Map<string, number>()
  const originalContext = HTMLCanvasElement.prototype.getContext
  const originalImage = globalThis.Image
  const originalDpr = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio')

  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string) {
    if (id !== 'webgl2') return null
    const gl = fakeGl(uniforms)
    gl['canvas'] = this
    return gl as unknown as WebGL2RenderingContext
  } as typeof originalContext

  globalThis.Image = class {
    complete = true
    naturalWidth = 8
    naturalHeight = 8
    crossOrigin = ''
    src = ''
    onload: (() => void) | null = null
  } as unknown as typeof Image

  Object.defineProperty(globalThis, 'devicePixelRatio', { value: ratio, configurable: true })
  configure({ maxDpr: ratio })

  const surface = makeSurface()
  try {
    webglSceneBackend.mount(surface).destroy()
  } finally {
    surface.element.remove()
    HTMLCanvasElement.prototype.getContext = originalContext
    globalThis.Image = originalImage
    if (originalDpr) Object.defineProperty(globalThis, 'devicePixelRatio', originalDpr)
    resetQuality()
  }
  return uniforms
}

describe('gl backends hand the shader device pixels', () => {
  it('paints the same css rim on a retina display as on a 1x one', () => {
    const oneX = paintAt(1)
    const retina = paintAt(2)
    expect(oneX.get('u_bevelWidth')).toBe(BEVEL_WIDTH)
    expect(retina.get('u_bevelWidth')).toBe(BEVEL_WIDTH * 2)
  })

  it('scales thickness by the same ratio as the rim', () => {
    const retina = paintAt(2)
    expect(retina.get('u_thickness')).toBe(THICKNESS * 2)
  })

  it('tells the shader the pixel ratio so css-sized grain survives the dpr', () => {
    expect(paintAt(1).get('u_pxRatio')).toBe(1)
    expect(paintAt(2).get('u_pxRatio')).toBe(2)
  })
})
