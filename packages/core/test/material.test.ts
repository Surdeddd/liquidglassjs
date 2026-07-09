import { describe, expect, it } from 'vitest'
import { clampMaterial, MATERIAL_DEFAULTS, MATERIAL_PRESETS, resolveMaterial } from '../src/material'

describe('resolveMaterial', () => {
  it('uses clear preset by default', () => {
    const material = resolveMaterial({})
    expect(material.blur).toBe(MATERIAL_PRESETS.clear.blur)
    expect(material.tint).toBe(MATERIAL_DEFAULTS.tint)
  })

  it('applies preset overrides on top of defaults', () => {
    const material = resolveMaterial({ preset: 'tinted' })
    expect(material.tint).toBe('#7c5cff')
    expect(material.thickness).toBe(MATERIAL_DEFAULTS.thickness)
  })

  it('explicit params win over preset', () => {
    const material = resolveMaterial({ preset: 'frosted', blur: 30, tint: '#000000' })
    expect(material.blur).toBe(30)
    expect(material.tint).toBe('#000000')
    expect(material.frost).toBe(MATERIAL_PRESETS.frosted.frost)
  })

  it('clamps out-of-range values', () => {
    const material = resolveMaterial({ blur: 999, tintOpacity: 5, dispersion: -2 })
    expect(material.blur).toBe(100)
    expect(material.tintOpacity).toBe(1)
    expect(material.dispersion).toBe(0)
  })
})

describe('clampMaterial', () => {
  it('normalizes negative numeric radius', () => {
    const material = clampMaterial({ ...MATERIAL_DEFAULTS, radius: -10 })
    expect(material.radius).toBe(0)
  })

  it('keeps auto radius untouched', () => {
    const material = clampMaterial({ ...MATERIAL_DEFAULTS, radius: 'auto' })
    expect(material.radius).toBe('auto')
  })
})
