import { afterEach, describe, expect, it } from 'vitest'
import { attach } from '../src/engine'
import { backdropLuminance, setLuminanceGrid } from '../src/contrast'

afterEach(() => {
  setLuminanceGrid(null)
})

function splitGrid(): void {
  const cols = 4
  const rows = 2
  const data = new Float32Array(cols * rows)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      data[y * cols + x] = x < cols / 2 ? 0.1 : 0.9
    }
  }
  setLuminanceGrid({ data, cols, rows, docWidth: 400, docHeight: 200 })
}

describe('backdropLuminance', () => {
  it('returns null without a grid or with an empty rect', () => {
    expect(backdropLuminance({ left: 0, top: 0, width: 100, height: 100 })).toBeNull()
    splitGrid()
    expect(backdropLuminance({ left: 0, top: 0, width: 0, height: 0 })).toBeNull()
  })

  it('averages the sampled region', () => {
    splitGrid()
    expect(backdropLuminance({ left: 0, top: 0, width: 180, height: 200 })).toBeCloseTo(0.1, 5)
    expect(backdropLuminance({ left: 220, top: 0, width: 180, height: 200 })).toBeCloseTo(0.9, 5)
    const mixed = backdropLuminance({ left: 100, top: 0, width: 200, height: 200 })
    expect(mixed).toBeGreaterThan(0.1)
    expect(mixed).toBeLessThan(0.9)
  })
})

describe('engine tone from the luminance grid', () => {
  it('marks glass light over a bright snapshot region', () => {
    splitGrid()
    const host = document.createElement('div')
    document.body.appendChild(host)
    host.getBoundingClientRect = () =>
      ({ left: 300, top: 40, width: 80, height: 60, right: 380, bottom: 100, x: 300, y: 40, toJSON: () => ({}) }) as DOMRect
    const handle = attach(host, { physics: false })
    expect(host.getAttribute('data-liquid-glass-tone')).toBe('light')
    handle.destroy()
    host.remove()
  })

  it('marks glass dark over a dim snapshot region', () => {
    splitGrid()
    const host = document.createElement('div')
    document.body.appendChild(host)
    host.getBoundingClientRect = () =>
      ({ left: 10, top: 40, width: 80, height: 60, right: 90, bottom: 100, x: 10, y: 40, toJSON: () => ({}) }) as DOMRect
    const handle = attach(host, { physics: false })
    expect(host.getAttribute('data-liquid-glass-tone')).toBe('dark')
    handle.destroy()
    host.remove()
  })
})
