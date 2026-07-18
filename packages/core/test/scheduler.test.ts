import { describe, expect, it, vi } from 'vitest'
import { onFrame, onViewport } from '../src/runtime/scheduler'

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
})
