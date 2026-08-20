import { describe, expect, it, vi } from 'vitest'
import { observeFrames, onFrame, onViewport } from '../src/runtime/scheduler'

function twoFrames(): Promise<void> {
  return new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
}

describe('scheduler', () => {
  it('runs a single shared loop for many subscribers and stops when empty', async () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')
    const a = vi.fn()
    const b = vi.fn()
    const offA = onFrame(a)
    const offB = onFrame(b)
    await twoFrames()
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
    expect(a.mock.calls.length).toBe(b.mock.calls.length)
    offA()
    offB()
    await twoFrames()
    raf.mockClear()
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(raf.mock.calls.length).toBeLessThanOrEqual(1)
    raf.mockRestore()
  })

  it('passes clamped dt seconds to frame callbacks', async () => {
    const samples: number[] = []
    const off = onFrame(dt => samples.push(dt))
    await twoFrames()
    off()
    expect(samples.length).toBeGreaterThan(0)
    for (const dt of samples) {
      expect(dt).toBeGreaterThan(0)
      expect(dt).toBeLessThanOrEqual(1 / 20)
    }
  })

  it('shares one scroll and one resize listener across viewport subscribers', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const off1 = onViewport(() => {})
    const off2 = onViewport(() => {})
    const scrolls = add.mock.calls.filter(call => call[0] === 'scroll').length
    const resizes = add.mock.calls.filter(call => call[0] === 'resize').length
    expect(scrolls).toBe(1)
    expect(resizes).toBe(1)
    off1()
    off2()
    const remove = vi.spyOn(window, 'removeEventListener')
    onViewport(() => {})()
    expect(remove.mock.calls.some(call => call[0] === 'scroll')).toBe(true)
    add.mockRestore()
    remove.mockRestore()
  })

  it('an observer never keeps the loop alive on its own', async () => {
    const observer = vi.fn()
    const off = observeFrames(observer)
    await twoFrames()
    const settled = observer.mock.calls.length
    await twoFrames()
    await twoFrames()
    expect(observer.mock.calls.length).toBe(settled)
    off()
  })

  it('an observer sees frames another subscriber asked for', async () => {
    const observer = vi.fn()
    const offObserve = observeFrames(observer)
    const idle = observer.mock.calls.length
    const offFrame = onFrame(() => {})
    await twoFrames()
    await twoFrames()
    expect(observer.mock.calls.length).toBeGreaterThan(idle + 1)
    offFrame()
    await twoFrames()
    const settled = observer.mock.calls.length
    await twoFrames()
    await twoFrames()
    expect(observer.mock.calls.length).toBe(settled)
    offObserve()
  })

  it('coalesces viewport bursts into one callback per frame', async () => {
    const cb = vi.fn()
    const off = onViewport(cb)
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    await twoFrames()
    expect(cb.mock.calls.length).toBe(1)
    off()
  })

  it('drops a frame subscriber the moment it unsubscribes', async () => {
    const gone = vi.fn()
    const kept = vi.fn()
    const offGone = onFrame(gone)
    const offKept = onFrame(kept)
    await twoFrames()
    offGone()
    gone.mockClear()
    kept.mockClear()
    await twoFrames()
    expect(gone).not.toHaveBeenCalled()
    expect(kept).toHaveBeenCalled()
    offKept()
  })

  it('drops a viewport subscriber the moment it unsubscribes', async () => {
    const gone = vi.fn()
    const kept = vi.fn()
    const offGone = onViewport(gone)
    const offKept = onViewport(kept)
    window.dispatchEvent(new Event('scroll'))
    await twoFrames()
    offGone()
    gone.mockClear()
    kept.mockClear()
    window.dispatchEvent(new Event('scroll'))
    await twoFrames()
    expect(gone).not.toHaveBeenCalled()
    expect(kept).toHaveBeenCalledTimes(1)
    offKept()
  })

  it('calls an observer once per frame however many frame subscribers there are', async () => {
    const observer = vi.fn()
    const a = vi.fn()
    const b = vi.fn()
    const c = vi.fn()
    const offObserve = observeFrames(observer)
    const offFrames = [onFrame(a), onFrame(b), onFrame(c)]
    await twoFrames()
    observer.mockClear()
    a.mockClear()
    b.mockClear()
    c.mockClear()
    await twoFrames()
    expect(a.mock.calls.length).toBeGreaterThan(0)
    expect(b.mock.calls.length).toBe(a.mock.calls.length)
    expect(c.mock.calls.length).toBe(a.mock.calls.length)
    expect(observer.mock.calls.length).toBe(a.mock.calls.length)
    for (const off of offFrames) off()
    offObserve()
  })
})
