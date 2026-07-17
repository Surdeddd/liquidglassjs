import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeOffsets } from '../src/displacement'
import {
  configure,
  deviceTier,
  getQuality,
  resetQuality,
  watchFps,
  _pushFrameSample
} from '../src/quality'

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
    expect(field.width).toBeLessThanOrEqual(322)
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

  it('stays quiet on healthy frame rates', () => {
    const degrade = vi.fn()
    const stop = watchFps(degrade)
    for (let i = 0; i < 600; i++) _pushFrameSample(1 / 60)
    expect(degrade).not.toHaveBeenCalled()
    stop()
  })
})
