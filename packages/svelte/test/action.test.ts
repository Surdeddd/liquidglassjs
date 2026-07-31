import { describe, expect, it } from 'vitest'
import { colorWithOpacity, glass, glassOf, liquidGlass } from '../src/index'

describe('svelte 5 attachment', () => {
  it('attaches on mount and tears down through the returned cleanup', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const cleanup = glass({ backend: 'css-fallback', preset: 'frosted', physics: false })(el)
    expect(el.getAttribute('data-liquid-glass')).toBe('frosted')
    expect(glassOf(el)?.backend).toBe('css-fallback')
    cleanup()
    expect(el.hasAttribute('data-liquid-glass')).toBe(false)
    expect(glassOf(el)).toBeUndefined()
    el.remove()
  })

  it('answers undefined for a node it never touched', () => {
    expect(glassOf(null)).toBeUndefined()
    expect(glassOf(document.createElement('div'))).toBeUndefined()
  })
})

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

  it('resets options dropped between updates', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const action = liquidGlass(el, {
      backend: 'css-fallback',
      adaptive: false,
      physics: false,
      tint: '#ff0000',
      tintOpacity: 1
    })
    expect(el.style.getPropertyValue('background')).toBe(colorWithOpacity('#ff0000', 1))
    action.update({ backend: 'css-fallback', adaptive: false, physics: false })
    expect(el.style.getPropertyValue('background')).not.toBe(colorWithOpacity('#ff0000', 1))
    action.destroy()
    el.remove()
  })
})
