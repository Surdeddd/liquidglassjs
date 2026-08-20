import { afterEach, describe, expect, it, vi } from 'vitest'
import { SurfaceTracker } from '../src/runtime/dom-sync'

type IntersectionCb = (entries: Array<{ isIntersecting: boolean }>) => void

interface FakeObserver {
  notify: IntersectionCb
  init: IntersectionObserverInit | undefined
}

function stubIntersectionObserver(): FakeObserver {
  const captured: FakeObserver = { notify: () => {}, init: undefined }
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionCb, init?: IntersectionObserverInit) {
        captured.notify = cb
        captured.init = init
      }
      observe(): void {}
      disconnect(): void {}
    }
  )
  return captured
}

function twoFrames(): Promise<void> {
  return new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SurfaceTracker', () => {
  it('starts and stops without throwing', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const tracker = new SurfaceTracker(el, () => {})
    expect(() => tracker.start()).not.toThrow()
    expect(() => tracker.stop()).not.toThrow()
    expect(() => tracker.stop()).not.toThrow()
    el.remove()
  })

  it('exposes current state', () => {
    const el = document.createElement('div')
    const tracker = new SurfaceTracker(el, () => {})
    expect(tracker.state.visible).toBe(true)
    expect(tracker.state.rect.width).toBe(0)
  })

  it('emits when the measured rect changes', () => {
    const el = document.createElement('div')
    const rect = { x: 10, y: 20, width: 300, height: 100 }
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect as DOMRect)
    const listener = vi.fn()
    const tracker = new SurfaceTracker(el, listener)
    tracker.start()
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ rect: { x: 10, y: 20, width: 300, height: 100 } })
    )
    tracker.stop()
  })

  it('watches a band around the viewport so a surface is ready before it shows', () => {
    const observer = stubIntersectionObserver()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const tracker = new SurfaceTracker(el, () => {})
    tracker.start()
    expect(observer.init?.rootMargin).toBe('200px')
    tracker.stop()
    el.remove()
  })

  it('does not measure an offscreen surface on viewport ticks', async () => {
    const observer = stubIntersectionObserver()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const box = { x: 0, y: 0, width: 10, height: 10 }
    const measure = vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => box as DOMRect)
    const tracker = new SurfaceTracker(el, () => {})
    tracker.start()

    observer.notify([{ isIntersecting: false }])
    measure.mockClear()
    window.dispatchEvent(new Event('scroll'))
    await twoFrames()
    expect(measure).not.toHaveBeenCalled()

    observer.notify([{ isIntersecting: true }])
    measure.mockClear()
    window.dispatchEvent(new Event('scroll'))
    await twoFrames()
    expect(measure).toHaveBeenCalled()

    tracker.stop()
    el.remove()
  })

  it('reports a fresh rect on the callback that turns a surface visible', () => {
    const observer = stubIntersectionObserver()
    const el = document.createElement('div')
    document.body.appendChild(el)
    let box = { x: 0, y: 0, width: 10, height: 10 }
    vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => box as DOMRect)
    const listener = vi.fn()
    const tracker = new SurfaceTracker(el, listener)
    tracker.start()

    observer.notify([{ isIntersecting: false }])
    box = { x: 40, y: 900, width: 10, height: 10 }
    listener.mockClear()
    observer.notify([{ isIntersecting: true }])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      rect: { x: 40, y: 900, width: 10, height: 10 },
      visible: true
    })

    tracker.stop()
    el.remove()
  })
})
