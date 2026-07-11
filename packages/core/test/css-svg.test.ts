import { describe, expect, it } from 'vitest'
import { cssSvgBackend } from '../src/backends/css-svg'
import type { BackendSurface } from '../src/backends/types'
import { computeOffsets, resolveBandPx } from '../src/displacement'
import { resolveMaterial } from '../src/material'
import { NO_CAPABILITIES } from '../src/probe'

function makeSurface(options: Parameters<typeof resolveMaterial>[0] = { preset: 'frosted' }): BackendSurface {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return {
    element,
    preset: options.preset ?? 'frosted',
    material: resolveMaterial(options),
    state: { rect: { x: 0, y: 0, width: 240, height: 120 }, visible: true },
    backdrop: null,
    sceneImage: null
  }
}

function lastFilter(): SVGFilterElement {
  const filters = document.querySelectorAll('svg defs filter')
  return filters[filters.length - 1] as SVGFilterElement
}

describe('css-svg backend', () => {
  it('requires backdrop-filter url support', () => {
    expect(cssSvgBackend.isSupported(NO_CAPABILITIES)).toBe(false)
    expect(cssSvgBackend.isSupported({ ...NO_CAPABILITIES, backdropFilterUrl: true })).toBe(true)
  })

  it('mounts an svg filter and points backdrop-filter at it', () => {
    const surface = makeSurface()
    const instance = cssSvgBackend.mount(surface)
    const filter = lastFilter()
    expect(filter).not.toBeNull()
    const id = filter.getAttribute('id') ?? ''
    const style = (surface.element as HTMLElement).style
    expect(style.getPropertyValue('backdrop-filter')).toBe(`url("#${id}")`)
    expect(filter.querySelector('feDisplacementMap')).not.toBeNull()
    expect(filter.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')).toBe('10')
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

  it('widens the filter region so bent samples are not clipped', () => {
    const surface = makeSurface()
    const instance = cssSvgBackend.mount(surface)
    const filter = lastFilter()
    expect(filter.getAttribute('x')).toBe('-20%')
    expect(filter.getAttribute('width')).toBe('140%')
    instance.destroy()
    surface.element.remove()
  })

  it('drives intensity via scale = 2 * maxOffset * refraction gain', () => {
    const surface = makeSurface({ refraction: 0.5, thickness: 20, bevelWidth: 24 })
    const instance = cssSvgBackend.mount(surface)
    const scale = Number(lastFilter().querySelector('[data-lg-role="displace"]')?.getAttribute('scale'))
    const { maxOffset } = computeOffsets({
      width: 240,
      height: 120,
      radius: 0,
      shape: 'rounded',
      band: 24,
      ior: surface.material.ior,
      thickness: 20,
      magnify: surface.material.magnify
    })
    expect(scale).toBeGreaterThan(0)
    expect(scale).toBeCloseTo(2 * maxOffset * (0.5 * 2), 1)
    instance.destroy()
    surface.element.remove()
  })

  it('wires brightness through feComponentTransfer', () => {
    const surface = makeSurface({ brightness: 1.1 })
    const instance = cssSvgBackend.mount(surface)
    const funcs = lastFilter().querySelectorAll(
      'feComponentTransfer feFuncR, feComponentTransfer feFuncG, feComponentTransfer feFuncB'
    )
    expect(funcs.length).toBe(3)
    expect(funcs[0]?.getAttribute('slope')).toBe('1.1')
    instance.destroy()
    surface.element.remove()
  })

  it('adds fine turbulence micro-scatter only when frost > 0', () => {
    const frosted = makeSurface({ frost: 0.4 })
    const a = cssSvgBackend.mount(frosted)
    expect(lastFilter().querySelector('feTurbulence')).not.toBeNull()
    a.destroy()
    frosted.element.remove()

    const clear = makeSurface({ frost: 0 })
    const b = cssSvgBackend.mount(clear)
    expect(lastFilter().querySelector('feTurbulence')).toBeNull()
    b.destroy()
    clear.element.remove()
  })

  it('splits into three displacement passes when dispersion > 0', () => {
    const surface = makeSurface({ dispersion: 0.3 })
    const instance = cssSvgBackend.mount(surface)
    const f = lastFilter()
    expect(f.querySelectorAll('feDisplacementMap[data-lg-role^="displace"]').length).toBe(3)
    const r = Number(f.querySelector('[data-lg-role="displace-r"]')?.getAttribute('scale'))
    const g = Number(f.querySelector('[data-lg-role="displace"]')?.getAttribute('scale'))
    const b = Number(f.querySelector('[data-lg-role="displace-b"]')?.getAttribute('scale'))
    expect(r).toBeLessThan(g)
    expect(b).toBeGreaterThan(g)
    instance.destroy()
    surface.element.remove()
  })

  it('keeps a single displacement pass when dispersion is 0', () => {
    const surface = makeSurface({ dispersion: 0 })
    const instance = cssSvgBackend.mount(surface)
    expect(lastFilter().querySelectorAll('feDisplacementMap').length).toBe(1)
    instance.destroy()
    surface.element.remove()
  })

  it('auto bevelWidth resolves from the corner radius', () => {
    const surface = makeSurface()
    ;(surface.element as HTMLElement).style.borderRadius = '18px'
    const instance = cssSvgBackend.mount(surface)
    expect(instance.debug?.().band).toBe(18)
    instance.destroy()
    surface.element.remove()
  })
})

describe('resolveBandPx', () => {
  it('uses the corner radius capped by half the min side', () => {
    expect(resolveBandPx('auto', 24, 240, 120)).toBe(24)
    expect(resolveBandPx('auto', 200, 240, 120)).toBe(60)
  })

  it('keeps a minimum lens band on square corners', () => {
    expect(resolveBandPx('auto', 0, 240, 120)).toBe(12)
  })

  it('passes explicit numbers through', () => {
    expect(resolveBandPx(30, 4, 240, 120)).toBe(30)
  })
})
