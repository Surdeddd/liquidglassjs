import { describe, expect, it } from 'vitest'
import { define } from '../src/index'

describe('liquid-glass element', () => {
  it('registers and attaches on connect', () => {
    define()
    const el = document.createElement('liquid-glass')
    el.setAttribute('preset', 'frosted')
    document.body.appendChild(el)
    expect(el.getAttribute('data-liquid-glass')).toBe('frosted')
    el.remove()
    expect(el.hasAttribute('data-liquid-glass')).toBe(false)
  })

  it('reacts to preset attribute changes', () => {
    define()
    const el = document.createElement('liquid-glass')
    document.body.appendChild(el)
    el.setAttribute('preset', 'tinted')
    expect(el.getAttribute('data-liquid-glass')).toBe('tinted')
    el.remove()
  })

  it('is idempotent', () => {
    define()
    expect(() => define()).not.toThrow()
  })

  it('exposes the engine handle via the glass getter', () => {
    define()
    const el = document.createElement('liquid-glass') as HTMLElement & {
      glass?: { backend: string }
    }
    document.body.appendChild(el)
    expect(el.glass?.backend).toBeTruthy()
    el.remove()
    expect(el.glass).toBeUndefined()
  })
})
