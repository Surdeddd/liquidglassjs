import { describe, expect, it } from 'vitest'
import { svgContentBackend } from '../src/backends/svg-content'
import type { BackendSurface } from '../src/backends/types'
import { resolveMaterial } from '../src/material'
import { NO_CAPABILITIES } from '../src/probe'

function makeSurface(backdrop: Element | null): BackendSurface {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return {
    element,
    preset: 'frosted',
    material: resolveMaterial({ preset: 'frosted' }),
    state: { rect: { x: 0, y: 0, width: 240, height: 120 }, visible: true },
    backdrop
  }
}

describe('svg-content backend', () => {
  it('requires svg filter on content support', () => {
    expect(svgContentBackend.isSupported(NO_CAPABILITIES)).toBe(false)
    expect(svgContentBackend.isSupported({ ...NO_CAPABILITIES, svgFilterOnContent: true })).toBe(
      true
    )
  })

  it('applies plain glass styles without a backdrop source', () => {
    const surface = makeSurface(null)
    const instance = svgContentBackend.mount(surface)
    const style = (surface.element as HTMLElement).style
    expect(style.getPropertyValue('backdrop-filter')).toContain('blur(14px)')
    expect(surface.element.querySelector('[data-liquid-glass-layer]')).toBeNull()
    instance.destroy()
    surface.element.remove()
  })

  it('builds a refract layer with a positioned clone when backdrop is given', () => {
    const source = document.createElement('div')
    source.className = 'bg'
    source.appendChild(document.createElement('span'))
    document.body.appendChild(source)
    const surface = makeSurface(source)
    const instance = svgContentBackend.mount(surface)
    const layer = surface.element.querySelector('[data-liquid-glass-layer="refract"]')
    expect(layer).not.toBeNull()
    expect((layer as HTMLElement).style.filter).toContain('url(')
    const clone = layer?.firstElementChild
    expect(clone?.className).toBe('bg')
    expect(clone?.querySelector('span')).not.toBeNull()
    instance.destroy()
    expect(surface.element.querySelector('[data-liquid-glass-layer]')).toBeNull()
    surface.element.remove()
    source.remove()
  })

  it('rebuilds the layer when the backdrop source changes', () => {
    const first = document.createElement('div')
    first.className = 'first'
    const second = document.createElement('div')
    second.className = 'second'
    document.body.append(first, second)
    const surface = makeSurface(first)
    const instance = svgContentBackend.mount(surface)
    surface.backdrop = second
    instance.update(surface)
    const clone = surface.element.querySelector('[data-liquid-glass-layer="refract"]')
      ?.firstElementChild
    expect(clone?.className).toBe('second')
    instance.destroy()
    surface.element.remove()
    first.remove()
    second.remove()
  })
})
