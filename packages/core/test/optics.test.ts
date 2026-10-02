import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BEVEL_DEPTH,
  EDGE_REACH,
  appleBand,
  domeExponent,
  edgeDecay,
  interiorZoomOffset,
  lensProfile
} from '../src/optics'
import { MATERIAL_DEFAULTS } from '../src/material'

const opts = { band: 20, ior: 1.5, thickness: 12 }

describe('lensProfile', () => {
  it('is zero in the flat interior and outside the shape', () => {
    expect(lensProfile(20, opts)).toBe(0)
    expect(lensProfile(35, opts)).toBe(0)
    expect(lensProfile(-1, opts)).toBe(0)
  })

  it('grows monotonically toward the rim', () => {
    expect(lensProfile(2, opts)).toBeGreaterThan(lensProfile(10, opts))
    expect(lensProfile(10, opts)).toBeGreaterThan(lensProfile(18, opts))
  })

  it('reproduces the inward displacement measured on the iOS 26.5 renderer', () => {
    expect(lensProfile(4.5, opts)).toBeCloseTo(22.1, -0.2)
    expect(lensProfile(8.5, opts)).toBeCloseTo(10.9, -0.2)
    expect(lensProfile(12.5, opts)).toBeCloseTo(4.4, -0.1)
  })

  it('reaches past the band at the rim instead of folding', () => {
    expect(lensProfile(0, opts)).toBeCloseTo(EDGE_REACH * opts.band, 6)
    expect(lensProfile(0.01, opts)).toBeGreaterThan(opts.band)
  })

  it('ior = 1 refracts nothing and a higher ior bends more', () => {
    expect(lensProfile(5, { ...opts, ior: 1 })).toBe(0)
    expect(lensProfile(5, { ...opts, ior: 1.8 })).toBeGreaterThan(lensProfile(5, { ...opts, ior: 1.2 }))
  })
})

describe('appleBand', () => {
  it('is 20 css px once the short side reaches 60, and 0.7 of the half side below', () => {
    expect(appleBand(30)).toBeCloseTo(20, 6)
    expect(appleBand(110)).toBe(20)
    expect(appleBand(22)).toBeCloseTo(15.4, 6)
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
  it('maps the material knob onto the superellipse exponent of the lit dome', () => {
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

  it('the default depth decays like the measured Apple edge', () => {
    expect(edgeDecay(DEFAULT_BEVEL_DEPTH)).toBeCloseTo(0.31, 6)
  })

  it('deeper bevels hold the bend closer to the rim', () => {
    const soft = lensProfile(8, { ...opts, bevelDepth: 0 })
    const mid = lensProfile(8, { ...opts, bevelDepth: 0.5 })
    const tight = lensProfile(8, { ...opts, bevelDepth: 1 })
    expect(soft).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(tight)
  })
})
