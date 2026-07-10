import { describe, expect, it } from 'vitest'
import { cssSvgBackend } from '../src/backends/css-svg'
import type { BackendSurface } from '../src/backends/types'
import { resolveMaterial } from '../src/material'
import { NO_CAPABILITIES } from '../src/probe'

function makeSurface(): BackendSurface {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return {
    element,
    preset: 'frosted',
    material: resolveMaterial({ preset: 'frosted' }),
    state: { rect: { x: 0, y: 0, width: 240, height: 120 }, visible: true },
    backdrop: null,
    sceneImage: null
  }
}

describe('css-svg backend', () => {
  it('requires backdrop-filter url support', () => {
    expect(cssSvgBackend.isSupported(NO_CAPABILITIES)).toBe(false)
    expect(cssSvgBackend.isSupported({ ...NO_CAPABILITIES, backdropFilterUrl: true })).toBe(true)
  })

  it('mounts an svg filter and points backdrop-filter at it', () => {
    const surface = makeSurface()
    const instance = cssSvgBackend.mount(surface)
    const filter = document.querySelector('svg defs filter')
    expect(filter).not.toBeNull()
    const id = filter?.getAttribute('id') ?? ''
    const style = (surface.element as HTMLElement).style
    expect(style.getPropertyValue('backdrop-filter')).toBe(`url("#${id}")`)
    expect(filter?.querySelector('feDisplacementMap')).not.toBeNull()
    expect(filter?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')).toBe('14')
    instance.destroy()
    surface.element.remove()
  })

  it('removes the filter and styles on destroy', () => {
    const surface = makeSurface()
    const instance = cssSvgBackend.mount(surface)
    const countBefore = document.querySelectorAll('svg defs filter').length
    instance.destroy()
    expect(document.querySelectorAll('svg defs filter').length).toBe(countBefore - 1)
    expect((surface.element as HTMLElement).style.getPropertyValue('backdrop-filter')).toBe('')
    surface.element.remove()
  })

  it('scales displacement from refraction and thickness', () => {
    const surface = makeSurface()
    surface.material = resolveMaterial({ refraction: 0.5, thickness: 20 })
    const instance = cssSvgBackend.mount(surface)
    const scale = document
      .querySelector('svg defs filter:last-of-type feDisplacementMap')
      ?.getAttribute('scale')
    expect(scale).toBe('20')
    instance.destroy()
    surface.element.remove()
  })
})
