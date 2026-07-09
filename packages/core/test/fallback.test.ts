import { describe, expect, it } from 'vitest'
import { attach } from '../src/index'

describe('css-fallback backend', () => {
  it('applies backdrop-filter and tint styles', () => {
    const el = document.createElement('div')
    attach(el, { preset: 'frosted', backend: 'css-fallback' })
    expect(el.style.getPropertyValue('backdrop-filter')).toContain('blur(14px)')
    expect(el.style.getPropertyValue('background')).toContain('rgba(255, 255, 255')
    expect(el.getAttribute('data-liquid-glass-backend')).toBe('css-fallback')
  })

  it('updates styles through set', () => {
    const el = document.createElement('div')
    const handle = attach(el)
    handle.set({ blur: 42 })
    expect(el.style.getPropertyValue('backdrop-filter')).toContain('blur(42px)')
  })

  it('applies numeric radius and skips auto', () => {
    const el = document.createElement('div')
    const handle = attach(el, { radius: 20 })
    expect(el.style.getPropertyValue('border-radius')).toBe('20px')
    handle.destroy()
    const auto = document.createElement('div')
    attach(auto)
    expect(auto.style.getPropertyValue('border-radius')).toBe('')
  })

  it('clears styles on destroy', () => {
    const el = document.createElement('div')
    const handle = attach(el, { preset: 'tinted' })
    handle.destroy()
    expect(el.style.getPropertyValue('backdrop-filter')).toBe('')
    expect(el.style.getPropertyValue('background')).toBe('')
    expect(el.hasAttribute('data-liquid-glass-backend')).toBe(false)
  })

  it('exposes the active backend on the handle', () => {
    const el = document.createElement('div')
    const handle = attach(el, { backend: 'css-fallback' })
    expect(handle.backend).toBe('css-fallback')
  })
})
