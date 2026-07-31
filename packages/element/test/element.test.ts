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

  it('groups children when defined under a custom tag', async () => {
    define('x-glass')
    const group = document.createElement('x-glass-group')
    const a = document.createElement('x-glass')
    const b = document.createElement('x-glass')
    group.append(a, b)
    document.body.appendChild(group)
    await new Promise(resolve => queueMicrotask(() => resolve(undefined)))
    expect(a.getAttribute('merge')).toBe(b.getAttribute('merge'))
    expect(a.getAttribute('merge')).toMatch(/^lg-group-/)
    group.remove()
  })

  it('exposes the whole option surface through attributes', () => {
    define()
    const el = document.createElement('liquid-glass')
    el.setAttribute('dispersion', '0.4')
    el.setAttribute('blur', '12')
    el.setAttribute('tint', '#00ff00')
    el.setAttribute('tint-opacity', '0.5')
    el.setAttribute('frost', '0.25')
    el.setAttribute('radius', 'auto')
    el.setAttribute('bevel-width', '18')
    el.setAttribute('adaptive', 'false')
    document.body.appendChild(el)
    expect(el.options).toMatchObject({
      dispersion: 0.4,
      blur: 12,
      tint: '#00ff00',
      tintOpacity: 0.5,
      frost: 0.25,
      radius: 'auto',
      bevelWidth: 18,
      adaptive: false
    })
    el.remove()
  })

  it('re-emits engine events as dom events', () => {
    define()
    const el = document.createElement('liquid-glass')
    document.body.appendChild(el)
    const seen: string[] = []
    el.addEventListener('liquid-glass:press', () => seen.push('press'))
    el.addEventListener('liquid-glass:release', () => seen.push('release'))
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 3, clientY: 3 }))
    el.dispatchEvent(new PointerEvent('pointerup'))
    expect(seen).toEqual(['press', 'release'])
    el.remove()
  })

  it('stops emitting dom events once removed', () => {
    define()
    const el = document.createElement('liquid-glass')
    document.body.appendChild(el)
    let count = 0
    el.addEventListener('liquid-glass:press', () => {
      count += 1
    })
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 1 }))
    expect(count).toBe(1)
    el.remove()
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 1 }))
    expect(count).toBe(1)
  })

  it('resets numeric attributes to defaults on removal', () => {
    define()
    const el = document.createElement('liquid-glass') as HTMLElement & {
      glass?: { set(options: object): void }
    }
    el.setAttribute('backend', 'css-fallback')
    el.setAttribute('physics', 'false')
    el.setAttribute('ior', '1.8')
    document.body.appendChild(el)
    const calls: object[] = []
    const glass = el.glass
    if (!glass) throw new Error('no handle')
    const original = glass.set.bind(glass)
    glass.set = (options: object) => {
      calls.push(options)
      original(options)
    }
    el.removeAttribute('ior')
    expect(calls).toContainEqual({ ior: undefined })
    el.remove()
  })
})
