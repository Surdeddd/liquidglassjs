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

  it('carries the lens params with iOS-parity defaults', () => {
    const material = resolveMaterial({ preset: 'clear' })
    expect(material.ior).toBe(1.5)
    expect(material.magnify).toBeCloseTo(0.02)
    expect(material.bevelWidth).toBe('auto')
  })

  it('clamps ior and magnify', () => {
    const material = resolveMaterial({ ior: 9, magnify: 3 })
    expect(material.ior).toBe(2.5)
    expect(material.magnify).toBe(0.1)
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

  it('replaces non-finite numbers with their defaults', () => {
    const material = clampMaterial({
      ...MATERIAL_DEFAULTS,
      blur: Number.NaN,
      ior: Number.POSITIVE_INFINITY,
      dispersion: Number.NaN
    })
    expect(material.blur).toBe(MATERIAL_DEFAULTS.blur)
    expect(material.ior).toBe(MATERIAL_DEFAULTS.ior)
    expect(material.dispersion).toBe(MATERIAL_DEFAULTS.dispersion)
  })

  it('coerces numeric strings that arrive from attributes', () => {
    const material = clampMaterial({
      ...MATERIAL_DEFAULTS,
      blur: '12' as unknown as number,
      frost: 'nope' as unknown as number
    })
    expect(material.blur).toBe(12)
    expect(material.frost).toBe(MATERIAL_DEFAULTS.frost)
  })

  it('keeps auto thickness and bevel width symbolic', () => {
    const material = clampMaterial({ ...MATERIAL_DEFAULTS, thickness: 'auto', bevelWidth: 'auto' })
    expect(material.thickness).toBe('auto')
    expect(material.bevelWidth).toBe('auto')
  })

  it('falls back to a string tint and a known shape', () => {
    const material = clampMaterial({
      ...MATERIAL_DEFAULTS,
      tint: 42 as unknown as string,
      shape: 'blob' as unknown as 'rounded'
    })
    expect(material.tint).toBe(MATERIAL_DEFAULTS.tint)
    expect(material.shape).toBe('rounded')
  })

  it('drops a non-numeric radius to the default', () => {
    const material = clampMaterial({ ...MATERIAL_DEFAULTS, radius: 'huge' as unknown as number })
    expect(material.radius).toBe(MATERIAL_DEFAULTS.radius)
  })
})
