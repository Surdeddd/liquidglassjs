import { describe, expect, it } from 'vitest'
import { displacementAt, sdfRoundedRect } from '../src/displacement'

const SPEC = { width: 100, height: 100, radius: 10, bevelWidth: 16, bevelDepth: 0.6 }

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

describe('displacementAt', () => {
  it('is zero deep inside the surface', () => {
    expect(displacementAt(50, 50, SPEC)).toEqual([0, 0])
  })

  it('points outward near the left edge', () => {
    const [dx, dy] = displacementAt(2, 50, SPEC)
    expect(dx).toBeLessThan(0)
    expect(Math.abs(dy)).toBeLessThan(Math.abs(dx))
  })

  it('points outward near the bottom edge', () => {
    const [, dy] = displacementAt(50, 98, SPEC)
    expect(dy).toBeGreaterThan(0)
  })

  it('fades toward the bevel interior', () => {
    const [nearEdge] = displacementAt(1, 50, SPEC)
    const [deeper] = displacementAt(12, 50, SPEC)
    expect(Math.abs(nearEdge)).toBeGreaterThan(Math.abs(deeper))
  })
})
