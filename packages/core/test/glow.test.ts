import { describe, expect, it } from 'vitest'
import { attach } from '../src/engine'
import { mountGlow } from '../src/glow'
import { resolveThicknessPx } from '../src/displacement'

describe('mountGlow', () => {
  it('mounts an aria-hidden glow layer and tracks the press point', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const glow = mountGlow(host)
    const el = host.querySelector('[data-liquid-glass-layer="glow"]') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.opacity).toBe('0')
    glow.press(42, 17)
    expect(el.style.getPropertyValue('--lg-glow-x')).toBe('42px')
    expect(el.style.getPropertyValue('--lg-glow-y')).toBe('17px')
    expect(el.style.opacity).toBe('1')
    glow.release()
    expect(el.style.opacity).toBe('0')
    glow.destroy()
    expect(host.querySelector('[data-liquid-glass-layer="glow"]')).toBeNull()
    host.remove()
  })
})

describe('press optics', () => {
  it('marks the host pressed and lights the glow on pointerdown', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const handle = attach(host, { physics: true, adaptive: false })
    host.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 5, bubbles: true }))
    expect(host.getAttribute('data-liquid-glass-pressed')).toBe('true')
    expect(host.querySelector('[data-liquid-glass-layer="glow"]')).not.toBeNull()
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    expect(host.hasAttribute('data-liquid-glass-pressed')).toBe(false)
    handle.destroy()
    expect(host.querySelector('[data-liquid-glass-layer="glow"]')).toBeNull()
    host.remove()
  })
})

describe('resolveThicknessPx', () => {
  it('passes numbers through with clamping', () => {
    expect(resolveThicknessPx(12, 240, 110)).toBe(12)
    expect(resolveThicknessPx(500, 240, 110)).toBe(100)
  })

  it('scales auto thickness with surface size', () => {
    const small = resolveThicknessPx('auto', 120, 48)
    const medium = resolveThicknessPx('auto', 420, 200)
    const large = resolveThicknessPx('auto', 380, 640)
    expect(small).toBeCloseTo(12 * 0.85, 3)
    expect(medium).toBeGreaterThan(small)
    expect(large).toBeCloseTo(12 * 1.6, 3)
  })
})
