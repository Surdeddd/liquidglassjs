import { describe, expect, it } from 'vitest'
import { attach, createEmitter, registerBackend } from '../src/index'
import type { Backend } from '../src/backends/types'

function press(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 4, clientY: 4 }))
}

describe('createEmitter', () => {
  it('subscribes, emits and unsubscribes', () => {
    const emitter = createEmitter()
    const seen: Array<{ x: number; y: number }> = []
    const off = emitter.on('press', detail => seen.push(detail))
    emitter.emit('press', { x: 1, y: 2 })
    off()
    emitter.emit('press', { x: 9, y: 9 })
    expect(seen).toEqual([{ x: 1, y: 2 }])
  })

  it('survives throwing listeners', () => {
    const emitter = createEmitter()
    const seen: Array<{ x: number; y: number }> = []
    emitter.on('press', () => {
      throw new Error('boom')
    })
    emitter.on('press', detail => seen.push(detail))
    emitter.emit('press', { x: 3, y: 4 })
    expect(seen).toEqual([{ x: 3, y: 4 }])
  })
})

describe('handle events', () => {
  it('emits press and release around pointer interaction', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', adaptive: false })
    const events: string[] = []
    handle.on('press', () => events.push('press'))
    handle.on('release', () => events.push('release'))
    press(el)
    el.dispatchEvent(new PointerEvent('pointerup'))
    expect(events).toEqual(['press', 'release'])
    handle.destroy()
    el.remove()
  })

  it('carries the press point in the event detail', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', adaptive: false })
    let point: { x: number; y: number } | null = null
    handle.on('press', detail => {
      point = detail
    })
    press(el)
    expect(point).not.toBeNull()
    expect(typeof (point as unknown as { x: number }).x).toBe('number')
    handle.destroy()
    el.remove()
  })

  it('emits backendchange when the backend actually changes', () => {
    const stub: Backend = {
      id: 'webgpu',
      priority: 0,
      isSupported: () => true,
      mount: () => ({
        update() {},
        sync() {},
        destroy() {}
      })
    }
    registerBackend(stub)
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', adaptive: false, physics: false })
    const seen: string[] = []
    handle.on('backendchange', detail => seen.push(detail))
    handle.set({ backend: 'webgpu' })
    expect(seen).toEqual(['webgpu'])
    expect(handle.backend).toBe('webgpu')
    handle.destroy()
    el.remove()
  })

  it('does not emit backendchange when the backend is unchanged', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', adaptive: false, physics: false })
    const seen: string[] = []
    handle.on('backendchange', detail => seen.push(detail))
    handle.set({ backend: 'css-fallback' })
    expect(seen).toEqual([])
    handle.destroy()
    el.remove()
  })

  it('reports the options it is running with', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', preset: 'frosted', adaptive: false })
    expect(handle.options).toMatchObject({ backend: 'css-fallback', preset: 'frosted' })
    handle.set({ preset: 'tinted' })
    expect(handle.options.preset).toBe('tinted')
    handle.destroy()
    el.remove()
  })

  it('stops emitting after destroy', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', adaptive: false })
    const seen: string[] = []
    handle.on('press', () => seen.push('press'))
    handle.destroy()
    press(el)
    expect(seen).toEqual([])
    el.remove()
  })
})
