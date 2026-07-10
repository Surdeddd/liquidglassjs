import { describe, expect, it } from 'vitest'
import { lensProfile, interiorZoomOffset } from '../src/optics'

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
    expect(dx).toBeCloseTo(-1, 5) // (150-100) * -0.02
    expect(dy).toBeCloseTo(0.2, 5) // (40-50) * -0.02
  })

  it('is zero at the center and with magnify 0', () => {
    expect(interiorZoomOffset(100, 50, 100, 50, 0.05)).toEqual([0, 0])
    expect(interiorZoomOffset(10, 10, 100, 50, 0)).toEqual([0, 0])
  })
})
