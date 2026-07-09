import { describe, expect, it, vi } from 'vitest'
import { SurfaceTracker } from '../src/dom-sync'

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
})
