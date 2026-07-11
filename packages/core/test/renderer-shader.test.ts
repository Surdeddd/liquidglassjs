import { describe, expect, it } from 'vitest'
import { FRAGMENT_SRC } from '../src/gl/renderer'

describe('gl lens shader', () => {
  it('models Snell refraction with an ior uniform', () => {
    expect(FRAGMENT_SRC).toContain('u_ior')
    expect(FRAGMENT_SRC).toContain('asin(')
    expect(FRAGMENT_SRC).not.toContain('1.0 + u_bevelDepth * 2.0')
  })

  it('lights the rim from a movable direction with a counter-sheen', () => {
    expect(FRAGMENT_SRC).toContain('u_lightDir')
    expect(FRAGMENT_SRC).toContain('counterSheen')
  })

  it('supports interior magnification around the lens center', () => {
    expect(FRAGMENT_SRC).toContain('u_magnify')
    expect(FRAGMENT_SRC).toContain('u_center')
  })

  it('clamps the rounded-box corner radius to the half size', () => {
    expect(FRAGMENT_SRC).toContain('min(r, min(halfSize.x, halfSize.y))')
  })
})
