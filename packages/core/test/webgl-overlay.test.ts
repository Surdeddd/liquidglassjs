import { describe, expect, it } from 'vitest'
import { needsReanchor, requiredOverlayBox, webglOverlayBackend } from '../src/backends/webgl-overlay'
import type { BackendSurface } from '../src/backends/types'
import { resolveMaterial } from '../src/material'
import { NO_CAPABILITIES } from '../src/quality/probe'

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

  it('anchors the canvas around the union of glass rects with a margin', () => {
    const box = requiredOverlayBox(
      [
        { x: 100, y: 2000, width: 200, height: 100 },
        { x: 400, y: 2160, width: 120, height: 120 }
      ],
      72
    )
    expect(box).toEqual({ x: 28, y: 1928, width: 564, height: 424 })
  })

  it('reanchors only when the union escapes or the canvas is bloated', () => {
    const anchor = { x: 0, y: 1900, width: 600, height: 500 }
    expect(needsReanchor(null, anchor)).toBe(true)
    expect(needsReanchor(anchor, { x: 40, y: 1950, width: 500, height: 420 })).toBe(false)
    expect(needsReanchor(anchor, { x: 40, y: 1850, width: 300, height: 200 })).toBe(true)
    expect(needsReanchor(anchor, { x: 200, y: 2300, width: 500, height: 200 })).toBe(true)
    expect(needsReanchor(anchor, { x: 40, y: 1950, width: 300, height: 200 })).toBe(true)
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
