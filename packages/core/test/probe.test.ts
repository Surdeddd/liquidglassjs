import { afterEach, describe, expect, it } from 'vitest'
import { probeCapabilities, resetCapabilitiesCache } from '../src/probe'

afterEach(() => {
  resetCapabilitiesCache()
})

describe('probeCapabilities', () => {
  it('returns a full boolean capability map', () => {
    const caps = probeCapabilities()
    for (const value of Object.values(caps)) {
      expect(typeof value).toBe('boolean')
    }
  })

  it('caches the result until reset', () => {
    const first = probeCapabilities()
    expect(probeCapabilities()).toBe(first)
    resetCapabilitiesCache()
    expect(probeCapabilities()).not.toBe(first)
  })

  it('supports forced re-probe', () => {
    const first = probeCapabilities()
    expect(probeCapabilities(true)).not.toBe(first)
  })

  it('keeps htmlInCanvas off until the api stabilizes', () => {
    expect(probeCapabilities().htmlInCanvas).toBe(false)
  })
})
