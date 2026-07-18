import { afterEach, describe, expect, it, vi } from 'vitest'
import { attach, colorWithOpacity, registerBackend, resolveMaterial } from '../src/index'
import type { Backend, BackendId } from '../src/index'

const lightCalls = vi.hoisted(() => [] as Array<{ motion: boolean }>)

vi.mock('../src/fx/light', async importOriginal => {
  const mod = await importOriginal<typeof import('../src/fx/light')>()
  return {
    ...mod,
    registerLight(client: { motion: boolean }) {
      lightCalls.push({ motion: client.motion })
      return () => {}
    }
  }
})

type MediaListener = (event: { matches: boolean }) => void
const mediaListeners = new Map<string, Set<MediaListener>>()

function stubMatchMedia(): void {
  vi.stubGlobal('matchMedia', (query: string) => {
    const bucket = mediaListeners.get(query) ?? new Set<MediaListener>()
    mediaListeners.set(query, bucket)
    return {
      matches: false,
      addEventListener: (_: string, cb: MediaListener) => bucket.add(cb),
      removeEventListener: (_: string, cb: MediaListener) => bucket.delete(cb)
    }
  })
}

function fireMedia(query: string, matches: boolean): void {
  for (const cb of mediaListeners.get(query) ?? []) cb({ matches })
}

function mounted(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function press(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 4, clientY: 4 }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  mediaListeners.clear()
  document.body.innerHTML = ''
})

describe('handle.set dynamic options', () => {
  it('re-selects the best backend when returning to auto', () => {
    const fake: Backend = {
      id: 'webgpu' as BackendId,
      priority: 99,
      isSupported: () => true,
      mount: () => ({ update() {}, sync() {}, destroy() {} })
    }
    registerBackend(fake)
    const el = mounted()
    const handle = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    expect(handle.backend).toBe('css-fallback')
    handle.set({ backend: undefined })
    expect(handle.backend).toBe('webgpu')
    expect(el.getAttribute('data-liquid-glass-backend')).toBe('webgpu')
    handle.destroy()
    registerBackend({ ...fake, isSupported: () => false })
  })

  it('resets removed material params to defaults', () => {
    const el = mounted()
    const handle = attach(el, {
      backend: 'css-fallback',
      physics: false,
      adaptive: false,
      tint: '#ff0000',
      tintOpacity: 1
    })
    expect(el.style.getPropertyValue('background')).toBe(colorWithOpacity('#ff0000', 1))
    handle.set({ tint: undefined, tintOpacity: undefined })
    const preset = resolveMaterial({})
    expect(el.style.getPropertyValue('background')).toBe(
      colorWithOpacity(preset.tint, preset.tintOpacity)
    )
    handle.destroy()
  })

  it('re-enables default physics when the key is reset', () => {
    const el = mounted()
    const handle = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    press(el)
    expect(el.hasAttribute('data-liquid-glass-pressed')).toBe(false)
    handle.set({ physics: undefined })
    press(el)
    expect(el.hasAttribute('data-liquid-glass-pressed')).toBe(true)
    handle.destroy()
  })

  it('honors live reduced-motion state in later physics rebuilds', () => {
    stubMatchMedia()
    const el = mounted()
    const handle = attach(el, { backend: 'css-fallback', adaptive: false })
    fireMedia('(prefers-reduced-motion: reduce)', true)
    handle.set({ physics: true })
    press(el)
    expect(el.hasAttribute('data-liquid-glass-pressed')).toBe(false)
    fireMedia('(prefers-reduced-motion: reduce)', false)
    handle.set({ physics: true })
    press(el)
    expect(el.hasAttribute('data-liquid-glass-pressed')).toBe(true)
    handle.destroy()
  })

  it('resubscribes the light driver when motionLight changes', () => {
    const el = mounted()
    const handle = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    const before = lightCalls.length
    expect(lightCalls[before - 1]?.motion).toBe(false)
    handle.set({ motionLight: true })
    expect(lightCalls.length).toBe(before + 1)
    expect(lightCalls[lightCalls.length - 1]?.motion).toBe(true)
    handle.destroy()
  })
})
