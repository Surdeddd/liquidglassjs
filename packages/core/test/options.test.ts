import { describe, expect, it } from 'vitest'
import { isOptionKey, OPTION_KEYS, resetMissingOptions } from '../src/options'

describe('isOptionKey', () => {
  it('accepts every public option and rejects anything else', () => {
    expect(isOptionKey('preset')).toBe(true)
    expect(isOptionKey('mergeStrength')).toBe(true)
    expect(isOptionKey('className')).toBe(false)
    expect(isOptionKey('onClick')).toBe(false)
    expect(OPTION_KEYS.size).toBeGreaterThan(20)
  })
})

describe('resetMissingOptions', () => {
  it('returns the next options untouched on the first pass', () => {
    const next = { preset: 'frosted' as const }
    expect(resetMissingOptions(undefined, next)).toBe(next)
  })

  it('clears keys that disappeared between renders', () => {
    const merged = resetMissingOptions({ tint: '#ff0000', blur: 4 }, { blur: 4 })
    expect(merged).toEqual({ tint: undefined, blur: 4 })
  })

  it('keeps changed keys and adds new ones', () => {
    const merged = resetMissingOptions({ blur: 4 }, { blur: 9, frost: 0.5 })
    expect(merged).toEqual({ blur: 9, frost: 0.5 })
  })

  it('does not clear a key that is present but undefined', () => {
    const merged = resetMissingOptions({ tint: '#fff' }, { tint: undefined })
    expect(Object.keys(merged)).toEqual(['tint'])
  })
})
