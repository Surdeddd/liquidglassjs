import { describe, expect, it } from 'vitest'
import { mountBezel } from '../src/bezel'
import { pointerAngle } from '../src/light'

describe('mountBezel', () => {
  it('mounts an aria-hidden ring overlay with a rotatable two-tone gradient', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const bezel = mountBezel(host, 0.6)
    const el = host.querySelector('.lg-bezel') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.getPropertyValue('--lg-bezel-hi')).not.toBe('')
    expect(el.style.pointerEvents).toBe('none')
    bezel.update(135)
    expect(host.style.getPropertyValue('--lg-light-angle')).toBe('135deg')
    bezel.destroy()
    expect(host.querySelector('.lg-bezel')).toBeNull()
    host.remove()
  })

  it('scales highlight strength with the specular param', () => {
    const host = document.createElement('div')
    const strong = mountBezel(host, 1)
    const strongHi = (host.querySelector('.lg-bezel') as HTMLElement).style.getPropertyValue('--lg-bezel-hi')
    strong.destroy()
    const weak = mountBezel(host, 0.2)
    const weakHi = (host.querySelector('.lg-bezel') as HTMLElement).style.getPropertyValue('--lg-bezel-hi')
    weak.destroy()
    expect(Number(strongHi)).toBeGreaterThan(Number(weakHi))
  })

  it('makes a static host positioned and restores it on destroy', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const bezel = mountBezel(host, 0.5)
    expect(host.style.position).toBe('relative')
    bezel.destroy()
    expect(host.style.position).toBe('')
    host.remove()
  })
})

describe('pointerAngle', () => {
  it('is 0 when the pointer is straight above the center', () => {
    expect(pointerAngle(100, 100, 100, 0)).toBeCloseTo(0, 5)
  })

  it('is 90 when the pointer is to the right', () => {
    expect(pointerAngle(100, 100, 200, 100)).toBeCloseTo(90, 5)
  })

  it('is 180 below and -90 (or 270) to the left', () => {
    expect(Math.abs(pointerAngle(100, 100, 100, 200))).toBeCloseTo(180, 5)
    const left = pointerAngle(100, 100, 0, 100)
    expect(Math.abs(left)).toBeCloseTo(90, 5)
    expect(left).toBeLessThan(0)
  })
})
