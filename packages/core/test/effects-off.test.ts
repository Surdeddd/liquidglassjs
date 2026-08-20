import { afterEach, describe, expect, it } from 'vitest'
import { attach } from '../src/index'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('effects: false', () => {
  it('leaves the element as authored and reports the inert backend', () => {
    const el = document.createElement('div')
    el.style.background = 'rebeccapurple'
    document.body.appendChild(el)

    const handle = attach(el, { effects: false })
    expect(handle.backend).toBe('inert')
    expect(el.style.background).toBe('rebeccapurple')
    expect(el.style.backdropFilter).toBe('')
    expect(el.querySelector('.lg-bezel')).toBeNull()
    handle.destroy()
  })

  it('comes back on when the switch is flipped, and goes away again', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    const handle = attach(el, { effects: false })
    expect(handle.backend).toBe('inert')

    handle.set({ effects: true })
    expect(handle.backend).not.toBe('inert')
    expect(el.style.backdropFilter === '' && el.style.background === '').toBe(false)

    handle.set({ effects: false })
    expect(handle.backend).toBe('inert')
    handle.destroy()
  })

  it('mounts no physics, so a press cannot transform the host', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { effects: false })
    el.dispatchEvent(new PointerEvent('pointerdown'))
    expect(el.style.transform).toBe('')
    handle.destroy()
  })
})
