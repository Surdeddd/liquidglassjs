import { describe, expect, it } from 'vitest'
import { computeOffsets, generateLensMap, sdfRoundedRect } from '../src/displacement'

describe('sdfRoundedRect', () => {
  it('is negative inside the shape', () => {
    expect(sdfRoundedRect(50, 50, 100, 100, 10)).toBeLessThan(0)
  })

  it('is zero on the straight edge', () => {
    expect(sdfRoundedRect(0, 50, 100, 100, 10)).toBeCloseTo(0, 5)
  })

  it('is positive outside', () => {
    expect(sdfRoundedRect(-10, 50, 100, 100, 10)).toBeGreaterThan(0)
  })

  it('rounds the corner region', () => {
    expect(sdfRoundedRect(0, 0, 100, 100, 10)).toBeGreaterThan(0)
  })
})

describe('sdfSuperellipse and squircle', () => {
  it('is negative inside and positive outside', async () => {
    const { sdfSuperellipse, squircleClipPath } = await import('../src/displacement')
    expect(sdfSuperellipse(50, 50, 100, 100)).toBeLessThan(0)
    expect(sdfSuperellipse(-5, 50, 100, 100)).toBeGreaterThan(0)
    expect(sdfSuperellipse(2, 2, 100, 100)).toBeGreaterThan(0)
    expect(squircleClipPath()).toMatch(/^polygon\(/)
    expect(squircleClipPath().split(',').length).toBe(64)
  })
})

const base = {
  width: 200,
  height: 100,
  radius: 24,
  shape: 'rounded' as const,
  band: 24,
  ior: 1.5,
  thickness: 12,
  magnify: 0,
}

function offsetAt(opts: typeof base, x: number, y: number): [number, number] {
  const { data, width, padX, padY } = computeOffsets(opts)
  const i = ((y + padY) * width + (x + padX)) * 2
  return [data[i]!, data[i + 1]!]
}

describe('computeOffsets (lens model)', () => {
  it('keeps the interior optically flat without magnify', () => {
    const [dx, dy] = offsetAt(base, 100, 50)
    expect(Math.abs(dx)).toBeLessThan(1e-6)
    expect(Math.abs(dy)).toBeLessThan(1e-6)
  })

  it('pads the map with a neutral margin covering the widened filter region', () => {
    const { data, width, height, padX, padY } = computeOffsets({ ...base, magnify: 0.03 })
    expect(padX).toBeGreaterThan(0)
    expect(padY).toBeGreaterThan(0)
    const corners = [
      0,
      (width - 1) * 2,
      (height - 1) * width * 2,
      ((height - 1) * width + width - 1) * 2
    ]
    for (const i of corners) {
      expect(data[i]).toBe(0)
      expect(data[i + 1]).toBe(0)
    }
  })

  it('rim pixels deflect harder than mid-band pixels', () => {
    const rim = Math.abs(offsetAt(base, 2, 50)[0])
    const mid = Math.abs(offsetAt(base, 12, 50)[0])
    expect(rim).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(0)
  })

  it('points outward on each edge', () => {
    expect(offsetAt(base, 2, 50)[0]).toBeLessThan(0)
    expect(offsetAt(base, 197, 50)[0]).toBeGreaterThan(0)
    expect(offsetAt(base, 100, 97)[1]).toBeGreaterThan(0)
  })

  it('is symmetric across both axes (quarter-symmetry correctness)', () => {
    const [lx, ly] = offsetAt(base, 5, 50)
    const [rx, ry] = offsetAt(base, 194, 50)
    expect(lx).toBeCloseTo(-rx, 5)
    expect(ly).toBeCloseTo(ry, 5)
    const [tx] = offsetAt(base, 5, 49)
    const [bx] = offsetAt(base, 5, 50)
    expect(tx).toBeCloseTo(bx, 1)
  })

  it('magnify pulls interior samples toward the center', () => {
    const zoomed = { ...base, magnify: 0.02 }
    const [dx] = offsetAt(zoomed, 150, 50)
    expect(dx).toBeLessThan(0)
  })

  it('reports the max offset in element pixels', () => {
    const { maxOffset } = computeOffsets(base)
    expect(maxOffset).toBeGreaterThan(0)
    expect(maxOffset).toBeLessThanOrEqual(base.band * 0.9 + base.width * 0.02)
  })

  it('supports the squircle shape', () => {
    const [dx] = offsetAt({ ...base, shape: 'squircle' as never }, 2, 50)
    expect(dx).toBeLessThan(0)
  })
})

describe('generateLensMap', () => {
  it('always reports maxOffset; url is a data url or null without canvas support', () => {
    const result = generateLensMap(base)
    expect(result).not.toBeNull()
    expect(result!.maxOffset).toBeGreaterThan(0)
    if (result!.url !== null) {
      expect(result!.url).toMatch(/^data:image\/png/)
    }
  })

  it('caches identical option sets', () => {
    expect(generateLensMap({ ...base })).toBe(generateLensMap({ ...base }))
  })
})
