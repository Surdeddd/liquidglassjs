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
  it('parses ior, magnify and motion-light attributes', () => {
    define()
    const el = document.createElement('liquid-glass') as HTMLElement & {
      glass?: { set(options: object): void }
    }
    el.setAttribute('ior', '1.8')
    el.setAttribute('magnify', '0.03')
    el.setAttribute('motion-light', '')
    document.body.appendChild(el)
    expect(el.getAttribute('data-liquid-glass')).toBe('clear')
    el.setAttribute('ior', '2.0')
    expect(el.getAttribute('data-liquid-glass')).toBe('clear')
    el.remove()
  })
  it('groups children into a shared merge group with spacing', async () => {
    define()
    const group = document.createElement('liquid-glass-group')
    group.setAttribute('spacing', '48')
    const a = document.createElement('liquid-glass')
    const b = document.createElement('liquid-glass')
    group.append(a, b)
    document.body.appendChild(group)
    await new Promise(resolve => queueMicrotask(() => resolve(undefined)))
    expect(a.getAttribute('merge')).toBe(b.getAttribute('merge'))
    expect(a.getAttribute('merge')).toMatch(/^lg-group-/)
    expect(a.getAttribute('merge-strength')).toBe('48')
    expect(a.getAttribute('backend')).toBe('webgl-overlay')
    group.remove()
  })
})
