import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeOffsets } from '../src/displacement'
import {
  configure,
  deviceTier,
  getQuality,
  resetQuality,
  watchFps,
  _pushFrameSample
} from '../src/quality/profile'

afterEach(() => {
  resetQuality()
  vi.unstubAllGlobals()
})

describe('quality profile', () => {
  it('maps device signals to tiers', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 2 })
    expect(deviceTier()).toBe('low')
    vi.stubGlobal('navigator', { hardwareConcurrency: 10 })
    vi.stubGlobal('devicePixelRatio', 2)
    expect(deviceTier()).toBe('high')
    vi.stubGlobal('navigator', { hardwareConcurrency: 6 })
    vi.stubGlobal('devicePixelRatio', 1)
    expect(deviceTier()).toBe('mid')
  })

  it('configure overrides flow into lens map resolution', () => {
    configure({ mapSide: 320 })
    expect(getQuality().mapSide).toBe(320)
    const field = computeOffsets({
      width: 2000,
      height: 900,
      radius: 40,
      shape: 'rounded',
      band: 24,
      ior: 1.5,
      thickness: 12,
      magnify: 0.02
    })
    const generous = (() => {
      configure({ mapSide: 600 })
      return computeOffsets({
        width: 2000,
        height: 900,
        radius: 40,
        shape: 'rounded',
        band: 24,
        ior: 1.5,
        thickness: 12,
        magnify: 0.02
      })
    })()
    // The budget is an area now, not a longest side, so the knob still has to move
    // resolution. The band floor is an aim rather than a guarantee: on a low tier
    // holding a 2000x900 surface the tier ceiling outvotes it, which is the right
    // way round. It still lands far above the ~2.7 texels the old longest-side
    // model left across the same band.
    expect(field.width).toBeLessThan(generous.width)
    expect(24 * field.scale).toBeGreaterThan(6)
    expect(24 * generous.scale).toBeGreaterThanOrEqual(8)
  })

  it('resetQuality restores tier defaults', () => {
    configure({ caPasses: 1 })
    resetQuality()
    expect([1, 3]).toContain(getQuality().caPasses)
    expect(getQuality().mapSide).toBeGreaterThanOrEqual(320)
  })
})

describe('fps watchdog', () => {
  it('fires degrade once after sustained slow frames and never again', () => {
    const degrade = vi.fn()
    const stop = watchFps(degrade)
    for (let i = 0; i < 400; i++) _pushFrameSample(1 / 24)
    expect(degrade).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 400; i++) _pushFrameSample(1 / 24)
    expect(degrade).toHaveBeenCalledTimes(1)
    stop()
  })

  it('lets a single surface override the profile without touching the rest', () => {
    const tier = getQuality()
    const local = getQuality({ mapSide: 128 })
    expect(local.mapSide).toBe(128)
    expect(local.caPasses).toBe(tier.caPasses)
    expect(local.maxDpr).toBe(tier.maxDpr)
    expect(getQuality().mapSide).toBe(tier.mapSide)
  })

  it('layers a surface override on top of the global configure', () => {
    configure({ mapSide: 400, caPasses: 1 })
    expect(getQuality({ mapSide: 200 })).toMatchObject({ mapSide: 200, caPasses: 1 })
    expect(getQuality()).toMatchObject({ mapSide: 400, caPasses: 1 })
  })

  it('renders a smaller field when a surface asks for a smaller map', () => {
    const opts = {
      width: 300,
      height: 160,
      radius: 24,
      shape: 'rounded' as const,
      band: 20,
      ior: 1.5,
      thickness: 12,
      magnify: 0.02
    }
    const full = computeOffsets({ ...opts, mapSide: 600 })
    const cheap = computeOffsets({ ...opts, mapSide: 200 })
    expect(cheap.width).toBeLessThan(full.width)
    expect(cheap.height).toBeLessThan(full.height)
  })

  it('stays quiet on healthy frame rates', () => {
    const degrade = vi.fn()
    const stop = watchFps(degrade)
    for (let i = 0; i < 600; i++) _pushFrameSample(1 / 60)
    expect(degrade).not.toHaveBeenCalled()
    stop()
  })
})
