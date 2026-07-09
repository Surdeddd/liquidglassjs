import { describe, expect, it } from 'vitest'
import { colorWithOpacity } from '../src/color'

describe('colorWithOpacity', () => {
  it('converts six-digit hex to rgba', () => {
    expect(colorWithOpacity('#7c5cff', 0.28)).toBe('rgba(124, 92, 255, 0.28)')
  })

  it('converts three-digit hex to rgba', () => {
    expect(colorWithOpacity('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
  })

  it('falls back to color-mix for non-hex colors', () => {
    expect(colorWithOpacity('oklch(70% 0.1 200)', 0.3)).toBe(
      'color-mix(in srgb, oklch(70% 0.1 200) 30%, transparent)'
    )
  })
})
