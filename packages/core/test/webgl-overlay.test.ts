import { describe, expect, it } from 'vitest'
import { webglOverlayBackend } from '../src/backends/webgl-overlay'
import type { BackendSurface } from '../src/backends/types'
import { resolveMaterial } from '../src/material'
import { NO_CAPABILITIES } from '../src/probe'

function makeSurface(): BackendSurface {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return {
    element,
    preset: 'clear',
    material: resolveMaterial({ preset: 'clear' }),
    state: { rect: { x: 0, y: 0, width: 200, height: 100 }, visible: true },
    backdrop: null,
    sceneImage: null
  }
}

describe('webgl-overlay backend', () => {
  it('requires webgl2 support', () => {
    expect(webglOverlayBackend.isSupported(NO_CAPABILITIES)).toBe(false)
    expect(webglOverlayBackend.isSupported({ ...NO_CAPABILITIES, webgl2: true })).toBe(true)
  })

  it('stays auto-selectable at low priority', () => {
    expect(webglOverlayBackend.autoSelect).not.toBe(false)
    expect(webglOverlayBackend.priority).toBeLessThan(20)
  })

  it('applies base glass styles even without webgl2 runtime', () => {
    const surface = makeSurface()
    const instance = webglOverlayBackend.mount(surface)
    const style = (surface.element as HTMLElement).style
    expect(style.getPropertyValue('backdrop-filter')).toContain('blur')
    expect(document.querySelector('canvas[data-liquid-glass-overlay]')).toBeNull()
    expect(() => {
      instance.update(surface)
      instance.sync(surface)
      instance.destroy()
    }).not.toThrow()
    expect(style.getPropertyValue('backdrop-filter')).toBe('')
    surface.element.remove()
  })
})
