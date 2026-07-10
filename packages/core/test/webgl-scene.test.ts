import { describe, expect, it } from 'vitest'
import { webglSceneBackend } from '../src/backends/webgl-scene'
import type { BackendSurface } from '../src/backends/types'
import { parseTint } from '../src/gl/renderer'
import { resolveMaterial } from '../src/material'
import { NO_CAPABILITIES } from '../src/probe'

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
