import { describe, expect, it } from 'vitest'
import { Spring } from '../src/physics/spring'

function settle(spring: Spring, maxSteps = 2000): number {
  let steps = 0
  while (spring.step(1 / 60) && steps < maxSteps) steps++
  return steps
}

describe('Spring', () => {
  it('converges to the target', () => {
    const spring = new Spring(0, { stiffness: 300, damping: 25, mass: 1 })
    spring.target = 10
    settle(spring)
    expect(spring.value).toBeCloseTo(10, 2)
    expect(spring.settled).toBe(true)
  })

  it('overshoots when underdamped', () => {
    const spring = new Spring(0, { stiffness: 300, damping: 6, mass: 1 })
    spring.target = 10
    let peak = 0
    for (let i = 0; i < 2000 && spring.step(1 / 60); i++) {
      peak = Math.max(peak, spring.value)
    }
    expect(peak).toBeGreaterThan(10.5)
    expect(spring.value).toBeCloseTo(10, 2)
  })

  it('does not overshoot when heavily damped', () => {
    const spring = new Spring(0, { stiffness: 300, damping: 60, mass: 1 })
    spring.target = 10
    let peak = 0
    for (let i = 0; i < 2000 && spring.step(1 / 60); i++) {
      peak = Math.max(peak, spring.value)
    }
    expect(peak).toBeLessThanOrEqual(10.01)
  })

  it('reconfigures stiffness and damping on the fly', () => {
    const spring = new Spring(0, { stiffness: 100, damping: 10, mass: 1 })
    spring.configure({ stiffness: 500, damping: 40 })
    expect(spring.stiffness).toBe(500)
    expect(spring.damping).toBe(40)
  })
})
