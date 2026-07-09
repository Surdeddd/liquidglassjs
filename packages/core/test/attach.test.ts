import { describe, expect, it } from 'vitest'
import { attach, detach, getInstance } from '../src/index'

describe('attach', () => {
  it('applies the default preset marker', () => {
    const el = document.createElement('div')
    attach(el)
    expect(el.getAttribute('data-liquid-glass')).toBe('clear')
  })

  it('returns the same handle for the same element', () => {
    const el = document.createElement('div')
    const a = attach(el)
    const b = attach(el)
    expect(a).toBe(b)
  })

  it('updates options via set', () => {
    const el = document.createElement('div')
    const handle = attach(el)
    handle.set({ preset: 'frosted' })
    expect(el.getAttribute('data-liquid-glass')).toBe('frosted')
  })

  it('cleans up on destroy', () => {
    const el = document.createElement('div')
    const handle = attach(el)
    handle.destroy()
    expect(el.hasAttribute('data-liquid-glass')).toBe(false)
    expect(getInstance(el)).toBeUndefined()
  })

  it('detach destroys through the registry', () => {
    const el = document.createElement('div')
    attach(el)
    detach(el)
    expect(getInstance(el)).toBeUndefined()
  })
})
