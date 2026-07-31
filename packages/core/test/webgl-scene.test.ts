import { describe, expect, it } from 'vitest'
import { webglSceneBackend } from '../src/backends/webgl-scene'
import type { BackendSurface } from '../src/backends/types'
import { parseTint } from '../src/gl/renderer'
import { resolveMaterial } from '../src/material'
import { NO_CAPABILITIES } from '../src/quality/probe'

function makeSurface(): BackendSurface {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return {
    element,
    preset: 'clear',
    material: resolveMaterial({}),
    state: { rect: { x: 0, y: 0, width: 320, height: 150 }, visible: true },
    backdrop: null,
    sceneImage: 'data:image/png;base64,'
  }
}

describe('webgl-scene backend', () => {
  it('requires webgl2 and never auto-selects', () => {
    expect(webglSceneBackend.autoSelect).toBe(false)
    expect(webglSceneBackend.isSupported(NO_CAPABILITIES)).toBe(false)
    expect(webglSceneBackend.isSupported({ ...NO_CAPABILITIES, webgl2: true })).toBe(true)
  })

  it('degrades to a noop without webgl2 runtime support', () => {
    const surface = makeSurface()
    const instance = webglSceneBackend.mount(surface)
    expect(surface.element.querySelector('canvas')).toBeNull()
    expect(() => {
      instance.update(surface)
      instance.sync(surface)
      instance.destroy()
    }).not.toThrow()
    surface.element.remove()
  })
})

function fakeGl(): Record<string, unknown> {
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
    getUniformLocation: () => ({}),
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
    uniform1f: noop,
    uniform2f: noop,
    uniform4f: noop,
    uniform1fv: noop,
    uniform4fv: noop,
    uniform3f: noop,
    drawArrays: noop
  }
}

describe('scene context sharing', () => {
  it('creates one webgl2 context no matter how many scenes mount', () => {
    let contexts = 0
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string) {
      if (id === 'webgl2') {
        contexts += 1
        const gl = fakeGl()
        gl['canvas'] = this
        return gl as unknown as WebGL2RenderingContext
      }
      return null
    } as typeof original

    const surfaces = [makeSurface(), makeSurface(), makeSurface()]
    const instances = surfaces.map(surface => webglSceneBackend.mount(surface))
    expect(contexts).toBe(1)
    expect(
      surfaces.every(surface => surface.element.querySelector('canvas[data-liquid-glass-layer="scene"]'))
    ).toBe(true)

    instances[0]!.destroy()
    const joiner = makeSurface()
    const joined = webglSceneBackend.mount(joiner)
    expect(contexts, 'context was torn down while other scenes still held it').toBe(1)

    joined.destroy()
    instances[1]!.destroy()
    instances[2]!.destroy()
    surfaces.forEach(surface => surface.element.remove())
    joiner.element.remove()

    const after = makeSurface()
    const revived = webglSceneBackend.mount(after)
    expect(contexts, 'context was not recreated after the last scene left').toBe(2)
    revived.destroy()
    after.element.remove()

    HTMLCanvasElement.prototype.getContext = original
  })
})

describe('parseTint', () => {
  it('parses six-digit hex into unit rgb', () => {
    const [r, g, b] = parseTint('#7c5cff')
    expect(r).toBeCloseTo(124 / 255, 5)
    expect(g).toBeCloseTo(92 / 255, 5)
    expect(b).toBeCloseTo(1, 5)
  })

  it('parses shorthand hex', () => {
    expect(parseTint('#fff')).toEqual([1, 1, 1])
  })

  it('falls back to white for unknown formats', () => {
    expect(parseTint('oklch(70% 0.1 200)')).toEqual([1, 1, 1])
  })
})
