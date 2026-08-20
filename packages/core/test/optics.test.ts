import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BEVEL_DEPTH,
  domeExponent,
  interiorZoomOffset,
  lensProfile
} from '../src/optics'
import { MATERIAL_DEFAULTS } from '../src/material'

const opts = { band: 20, ior: 1.5, thickness: 12 }

describe('lensProfile', () => {
  it('is zero in the flat interior (depth >= band)', () => {
    expect(lensProfile(20, opts)).toBe(0)
    expect(lensProfile(35, opts)).toBe(0)
  })

  it('is zero outside the shape (negative depth)', () => {
    expect(lensProfile(-1, opts)).toBe(0)
  })

  it('increases monotonically toward the edge inside the band', () => {
    const inner = lensProfile(18, opts)
    const mid = lensProfile(10, opts)
    const outer = lensProfile(2, opts)
    expect(outer).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(inner)
  })

  it('caps the offset so the rim never folds (offset <= band * 0.9)', () => {
    expect(lensProfile(0.01, { band: 20, ior: 1.9, thickness: 100 })).toBeLessThanOrEqual(18)
  })

  it('ior = 1 refracts nothing', () => {
    expect(lensProfile(5, { ...opts, ior: 1 })).toBeCloseTo(0, 6)
  })

  it('higher ior bends more', () => {
    expect(lensProfile(5, { ...opts, ior: 1.8 })).toBeGreaterThan(lensProfile(5, { ...opts, ior: 1.2 }))
  })

  it('thicker glass bends more', () => {
    expect(lensProfile(5, { ...opts, thickness: 24 })).toBeGreaterThan(lensProfile(5, opts))
  })
})

describe('interiorZoomOffset', () => {
  it('pulls samples toward the element center (magnification)', () => {
    const [dx, dy] = interiorZoomOffset(150, 40, 100, 50, 0.02)
    expect(dx).toBeCloseTo(-1, 5)
    expect(dy).toBeCloseTo(0.2, 5)
  })

  it('is zero at the center and with magnify 0', () => {
    expect(interiorZoomOffset(100, 50, 100, 50, 0.05)).toEqual([0, 0])
    expect(interiorZoomOffset(10, 10, 100, 50, 0)).toEqual([0, 0])
  })
})

describe('bevelDepth', () => {
  it('maps the material knob onto the superellipse exponent', () => {
    expect(domeExponent(0)).toBe(2)
    expect(domeExponent(0.5)).toBe(4)
    expect(domeExponent(1)).toBe(6)
  })

  it('an omitted depth reads as the material default', () => {
    expect(lensProfile(5, opts)).toBe(lensProfile(5, { ...opts, bevelDepth: DEFAULT_BEVEL_DEPTH }))
  })

  it('the lens fallback tracks the material default, so an omitted depth cannot drift', () => {
    expect(DEFAULT_BEVEL_DEPTH).toBe(MATERIAL_DEFAULTS.bevelDepth)
  })

  it('bevelDepth 0.5 is the quartic dome that shipped before the knob was wired', () => {
    const quartic = (depth: number): number => {
      const u = 1 - depth / opts.band
      const slope = (opts.thickness / opts.band) * u ** 3 * (1 - u ** 4) ** -0.75
      const alpha = Math.atan(slope)
      return opts.thickness * Math.tan(alpha - Math.asin(Math.sin(alpha) / opts.ior))
    }
    for (const depth of [2, 6, 10, 16]) {
      expect(lensProfile(depth, { ...opts, bevelDepth: 0.5 })).toBeCloseTo(quartic(depth), 12)
    }
  })

  it('a circular bevel bends harder near the rim than the default shoulder', () => {
    expect(lensProfile(2, { ...opts, bevelDepth: 0 })).toBeGreaterThan(lensProfile(2, opts))
  })

  it('deeper bevels hold the surface flat and bend less', () => {
    const round = lensProfile(4, { ...opts, bevelDepth: 0 })
    const mid = lensProfile(4, { ...opts, bevelDepth: 0.5 })
    const square = lensProfile(4, { ...opts, bevelDepth: 1 })
    expect(round).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(square)
  })
})
