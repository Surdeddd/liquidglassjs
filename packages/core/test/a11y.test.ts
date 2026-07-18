import { describe, expect, it } from 'vitest'
import {
  adaptTintToTone,
  applyReducedTransparency,
  parseColor,
  relativeLuminance,
  sampleTone
} from '../src/quality/a11y'
import { MATERIAL_DEFAULTS } from '../src/material'

describe('parseColor', () => {
  it('parses hex and rgb forms', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1])
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30, 1])
    expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30, 0.5])
    expect(parseColor('rgb(10 20 30 / 0.25)')).toEqual([10, 20, 30, 0.25])
  })

  it('rejects unknown formats', () => {
    expect(parseColor('linear-gradient(red, blue)')).toBeNull()
    expect(parseColor('transparent')).toBeNull()
  })
})

describe('relativeLuminance', () => {
  it('orders black, grey and white correctly', () => {
    const black = relativeLuminance(0, 0, 0)
    const grey = relativeLuminance(128, 128, 128)
    const white = relativeLuminance(255, 255, 255)
    expect(black).toBeCloseTo(0, 4)
    expect(white).toBeCloseTo(1, 4)
    expect(grey).toBeGreaterThan(black)
    expect(grey).toBeLessThan(white)
  })
})

describe('sampleTone', () => {
  it('detects a light solid ancestor', () => {
    const parent = document.createElement('div')
    parent.style.backgroundColor = '#f4f5f7'
    const el = document.createElement('div')
    parent.appendChild(el)
    document.body.appendChild(parent)
    expect(sampleTone(el, null)).toBe('light')
    parent.remove()
  })

  it('detects a dark solid ancestor', () => {
    const parent = document.createElement('div')
    parent.style.backgroundColor = '#101418'
    const el = document.createElement('div')
    parent.appendChild(el)
    document.body.appendChild(parent)
    expect(sampleTone(el, null)).toBe('dark')
    parent.remove()
  })

  it('gives up when a gradient hides the true tone', () => {
    const parent = document.createElement('div')
    parent.style.backgroundImage = 'linear-gradient(#000, #fff)'
    const el = document.createElement('div')
    parent.appendChild(el)
    document.body.appendChild(parent)
    expect(sampleTone(el, null)).toBeNull()
    parent.remove()
  })

  it('prefers the backdrop reference when given', () => {
    const backdrop = document.createElement('div')
    backdrop.style.backgroundColor = '#ffffff'
    document.body.appendChild(backdrop)
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(sampleTone(el, backdrop)).toBe('light')
    backdrop.remove()
    el.remove()
  })
})

describe('applyReducedTransparency', () => {
  it('makes the material opaque and distortion-free', () => {
    const material = applyReducedTransparency(MATERIAL_DEFAULTS)
    expect(material.tintOpacity).toBeGreaterThanOrEqual(0.85)
    expect(material.refraction).toBe(0)
    expect(material.dispersion).toBe(0)
    expect(material.blur).toBeLessThanOrEqual(4)
  })
})

describe('adaptTintToTone', () => {
  it('flips the default tint to dark over light backdrops', () => {
    const material = adaptTintToTone(MATERIAL_DEFAULTS, 'light', MATERIAL_DEFAULTS.tint)
    expect(material.tint).toBe('#141414')
  })

  it('keeps custom tints untouched', () => {
    const custom = { ...MATERIAL_DEFAULTS, tint: '#7c5cff' }
    expect(adaptTintToTone(custom, 'light', MATERIAL_DEFAULTS.tint)).toBe(custom)
  })

  it('does nothing over dark or unknown backdrops', () => {
    expect(adaptTintToTone(MATERIAL_DEFAULTS, 'dark', MATERIAL_DEFAULTS.tint)).toBe(
      MATERIAL_DEFAULTS
    )
    expect(adaptTintToTone(MATERIAL_DEFAULTS, null, MATERIAL_DEFAULTS.tint)).toBe(MATERIAL_DEFAULTS)
  })
})
