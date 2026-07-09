import { describe, expect, it } from 'vitest'
import { liquidGlass } from '../src/index'

describe('svelte action', () => {
  it('attaches, updates and destroys', () => {
    const el = document.createElement('div')
    const action = liquidGlass(el, { preset: 'frosted' })
    expect(el.getAttribute('data-liquid-glass')).toBe('frosted')
    action.update({ preset: 'tinted' })
    expect(el.getAttribute('data-liquid-glass')).toBe('tinted')
    action.destroy()
    expect(el.hasAttribute('data-liquid-glass')).toBe(false)
  })
})
