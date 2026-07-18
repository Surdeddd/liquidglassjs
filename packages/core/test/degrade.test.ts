import { afterEach, describe, expect, it } from 'vitest'
import { attach, registerBackend } from '../src/index'
import type { Backend, BackendId } from '../src/index'
import { resetDegradation } from '../src/engine'
import { _pushFrameSample, resetQuality } from '../src/quality/profile'

const fakeOverlay: Backend = {
  id: 'webgl-overlay' as BackendId,
  priority: 99,
  isSupported: () => true,
  mount: () => ({ update() {}, sync() {}, destroy() {} })
}

afterEach(() => {
  resetQuality()
  resetDegradation()
  registerBackend({ ...fakeOverlay, isSupported: () => false })
  document.body.innerHTML = ''
})

describe('fps watchdog degradation', () => {
  it('re-mounts auto-selected overlay instances onto a cheaper backend once fps stays low', () => {
    registerBackend(fakeOverlay)
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { physics: false, adaptive: false })
    expect(handle.backend).toBe('webgl-overlay')
    for (let i = 0; i < 400; i++) _pushFrameSample(1 / 24)
    expect(handle.backend).toBe('css-fallback')
    expect(el.getAttribute('data-liquid-glass-degraded')).toBe('true')
    handle.set({ blur: 10 })
    expect(handle.backend).toBe('css-fallback')
    handle.destroy()
  })

  it('leaves forced backends alone', () => {
    registerBackend(fakeOverlay)
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'webgl-overlay', physics: false, adaptive: false })
    for (let i = 0; i < 400; i++) _pushFrameSample(1 / 24)
    expect(handle.backend).toBe('webgl-overlay')
    expect(el.hasAttribute('data-liquid-glass-degraded')).toBe(false)
    handle.destroy()
  })

  it('new auto attaches after degradation avoid the overlay backend', () => {
    registerBackend(fakeOverlay)
    const first = document.createElement('div')
    document.body.appendChild(first)
    const a = attach(first, { physics: false, adaptive: false })
    for (let i = 0; i < 400; i++) _pushFrameSample(1 / 24)
    const second = document.createElement('div')
    document.body.appendChild(second)
    const b = attach(second, { physics: false, adaptive: false })
    expect(b.backend).toBe('css-fallback')
    a.destroy()
    b.destroy()
  })
})
