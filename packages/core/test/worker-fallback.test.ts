import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateLensMap, lensMapKey, renderLensPixels } from '../src/displacement'
import { requestLensMap, resetLensWorker } from '../src/worker/host'

const OPTS = {
  width: 240,
  height: 120,
  radius: 24,
  shape: 'rounded' as const,
  band: 24,
  ior: 1.5,
  thickness: 12,
  magnify: 0.02
}

afterEach(() => {
  resetLensWorker()
})

describe('requestLensMap fallback path', () => {
  it('resolves synchronously without a worker and matches the sync generator', () => {
    const results: number[] = []
    requestLensMap(OPTS, map => results.push(map.maxOffset))
    expect(results.length).toBe(1)
    const sync = generateLensMap(OPTS)
    expect(results[0]).toBe(sync?.maxOffset)
  })

  it('serves repeat requests from the cache', () => {
    const spy = vi.fn()
    requestLensMap(OPTS, spy)
    requestLensMap(OPTS, spy)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0]?.[0]).toBe(spy.mock.calls[1]?.[0])
  })

  it('renderLensPixels produces neutral-centered rgba data', () => {
    const rendered = renderLensPixels(OPTS)
    expect(rendered.pixels.length).toBe(rendered.width * rendered.height * 4)
    expect(rendered.pixels[2]).toBe(128)
    expect(rendered.pixels[3]).toBe(255)
    expect(lensMapKey(OPTS)).toContain('240|120')
  })

  it('ignores zero-sized requests', () => {
    const spy = vi.fn()
    requestLensMap({ ...OPTS, width: 0 }, spy)
    expect(spy).not.toHaveBeenCalled()
  })
})
