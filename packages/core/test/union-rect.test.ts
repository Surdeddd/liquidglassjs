import { describe, expect, it } from 'vitest'
import { unionRect } from '../src/gl/renderer'

describe('unionRect', () => {
  it('covers all rects', () => {
    const union = unionRect([
      { x: 10, y: 20, width: 100, height: 50 },
      { x: 150, y: 0, width: 40, height: 90 }
    ])
    expect(union).toEqual({ x: 10, y: 0, width: 180, height: 90 })
  })

  it('expands by the margin', () => {
    const union = unionRect([{ x: 10, y: 10, width: 10, height: 10 }], 5)
    expect(union).toEqual({ x: 5, y: 5, width: 20, height: 20 })
  })

  it('returns an empty rect for no input', () => {
    expect(unionRect([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})
