import { describe, expect, it } from 'vitest'
import { FROSTED_DARK, FROST_FLIP_LUMINANCE, adaptMaterial, frostTone } from '../src/quality/adapt'
import { attach } from '../src/engine'
import { resolveMaterial } from '../src/material'

const gray = (material: ReturnType<typeof resolveMaterial>, input: number): number => {
  const brightened = input * material.brightness
  return brightened * (1 - material.tintOpacity) + 1 * material.tintOpacity
}

describe('presets reproduce the measured Apple transfer on grey', () => {
  it('clear lifts every level by about 0.077 with a 1.035 gain', () => {
    const clear = resolveMaterial({ preset: 'clear' })
    expect(gray(clear, 0)).toBeCloseTo(19.5 / 255, 2)
    expect(gray(clear, 124 / 255)).toBeCloseTo(148 / 255, 2)
    expect(gray(clear, 188 / 255)).toBeCloseTo(215 / 255, 1)
    expect(clear.saturation).toBe(1)
  })

  it('frosted compresses the light range into 0.86..0.99 and keeps chroma alive', () => {
    const frosted = resolveMaterial({ preset: 'frosted' })
    expect(gray(frosted, 52 / 255)).toBeCloseTo(226 / 255, 1)
    expect(gray(frosted, 243 / 255)).toBeCloseTo(251 / 255, 1)
    expect(frosted.saturation * frosted.brightness * (1 - frosted.tintOpacity)).toBeCloseTo(0.72, 1)
  })
})

describe('adaptMaterial', () => {
  const frosted = resolveMaterial({ preset: 'frosted' })

  it('leaves clear and tinted untouched in every situation', () => {
    const clear = resolveMaterial({ preset: 'clear' })
    expect(adaptMaterial(clear, 'clear', 'dark', {})).toBe(clear)
    const tinted = resolveMaterial({ preset: 'tinted' })
    expect(adaptMaterial(tinted, 'tinted', 'dark', {})).toBe(tinted)
  })

  it('turns frosted into dark smoke in a dark appearance', () => {
    const dark = adaptMaterial(frosted, 'frosted', 'dark', {})
    expect(dark).toMatchObject(FROSTED_DARK)
    expect(adaptMaterial(frosted, 'frosted', 'light', {})).toBe(frosted)
  })

  it('keeps options the author set explicitly', () => {
    const dark = adaptMaterial(frosted, 'frosted', 'dark', { tintOpacity: 0.3, saturation: 1.2 })
    expect(dark.tintOpacity).toBe(frosted.tintOpacity)
    expect(dark.saturation).toBe(frosted.saturation)
    expect(dark.brightness).toBe(FROSTED_DARK.brightness)
  })
})

describe('frosted glass in a dark appearance', () => {
  it('turns to smoke and asks for light text, whatever the page behind it', () => {
    const element = document.createElement('div')
    element.style.setProperty('color-scheme', 'dark')
    document.body.append(element)
    const handle = attach(element, { preset: 'frosted', backend: 'css-fallback', physics: false })
    expect(element.getAttribute('data-liquid-glass-tone')).toBe('dark')
    expect(element.style.getPropertyValue('--lg-on-glass')).toBe('#f5f5f7')
    expect(element.style.getPropertyValue('background')).toContain('30, 30, 30')
    handle.destroy()
    element.remove()
  })

  it('leaves clear glass reading the backdrop tone', () => {
    const element = document.createElement('div')
    element.style.setProperty('color-scheme', 'dark')
    document.body.append(element)
    const handle = attach(element, { preset: 'clear', backend: 'css-fallback', physics: false })
    expect(element.getAttribute('data-liquid-glass-tone')).toBe('light')
    handle.destroy()
    element.remove()
  })
})

describe('frostTone', () => {
  it('follows a declared appearance first', () => {
    expect(frostTone('dark', 0.9, null)).toBe('dark')
  })

  it('flips a light appearance to dark over dark surroundings, with hysteresis', () => {
    expect(frostTone('light', 0.04, null)).toBe('dark')
    expect(frostTone('light', 0.5, null)).toBe('light')
    expect(frostTone('light', FROST_FLIP_LUMINANCE + 0.01, 'dark')).toBe('dark')
    expect(frostTone('light', FROST_FLIP_LUMINANCE - 0.01, 'light')).toBe('light')
  })

  it('stays light when nothing is known', () => {
    expect(frostTone(null, null, null)).toBe('light')
  })
})
