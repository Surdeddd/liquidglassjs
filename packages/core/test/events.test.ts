import { describe, expect, it } from 'vitest'
import { attach, createEmitter } from '../src/index'

function press(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 4, clientY: 4 }))
}

describe('createEmitter', () => {
  it('subscribes, emits and unsubscribes', () => {
    const emitter = createEmitter()
    const seen: string[] = []
    const off = emitter.on('press', detail => seen.push(detail))
    emitter.emit('press', 'a')
    off()
    emitter.emit('press', 'b')
    expect(seen).toEqual(['a'])
  })

  it('survives throwing listeners', () => {
    const emitter = createEmitter()
    const seen: string[] = []
    emitter.on('press', () => {
      throw new Error('boom')
    })
    emitter.on('press', detail => seen.push(detail))
    emitter.emit('press', 'x')
    expect(seen).toEqual(['x'])
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

  it('emits backendchange on forced backend switch', () => {
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
