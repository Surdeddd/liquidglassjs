import { describe, expect, it, vi } from 'vitest'
import { PHYSICS_DEFAULTS, PhysicsController, resolvePhysics } from '../src/physics/controller'

function mockRect(el: Element): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 100,
    bottom: 50,
    width: 100,
    height: 50,
    toJSON: () => ({})
  } as DOMRect)
}

function tickUntilSettled(controller: PhysicsController, maxTicks = 600): void {
  for (let i = 0; i < maxTicks; i++) {
    if (!controller.tick(1 / 60)) return
  }
}

describe('resolvePhysics', () => {
  it('defaults to full physics', () => {
    expect(resolvePhysics(undefined)).toEqual(PHYSICS_DEFAULTS)
    expect(resolvePhysics(true)).toEqual(PHYSICS_DEFAULTS)
  })

  it('disables entirely with false', () => {
    expect(resolvePhysics(false)).toBeNull()
  })

  it('merges partial configs', () => {
    expect(resolvePhysics({ hover: false })).toEqual({ ...PHYSICS_DEFAULTS, hover: false })
  })
})

describe('PhysicsController', () => {
  it('squashes on press and recovers after release', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS })
    el.dispatchEvent(new PointerEvent('pointerdown'))
    for (let i = 0; i < 30; i++) controller.tick(1 / 60)
    expect(el.style.transform).toContain('scale(')
    expect(el.style.transform).toMatch(/scale\(1\.0[0-9]+, 1\.0[0-9]+\)/)
    el.dispatchEvent(new PointerEvent('pointerup'))
    tickUntilSettled(controller)
    expect(el.style.transform).toBe('')
    controller.destroy()
    el.remove()
  })

  it('magnetizes toward the pointer on hover', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    mockRect(el)
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS, press: false })
    el.dispatchEvent(new PointerEvent('pointermove', { clientX: 60, clientY: 40 }))
    for (let i = 0; i < 30; i++) controller.tick(1 / 60)
    expect(el.style.transform).toContain('translate3d(')
    el.dispatchEvent(new PointerEvent('pointerleave'))
    tickUntilSettled(controller)
    expect(el.style.transform).toBe('')
    controller.destroy()
    el.remove()
  })

  it('cleans up listeners and transform on destroy', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS })
    controller.destroy()
    el.dispatchEvent(new PointerEvent('pointerdown'))
    expect(controller.tick(1 / 60)).toBe(false)
    expect(el.style.transform).toBe('')
    el.remove()
  })
})

function scaleOf(el: HTMLElement): [number, number] {
  const match = /scale\(([-\d.]+), ([-\d.]+)\)/.exec(el.style.transform)
  if (!match) throw new Error(`no scale in ${el.style.transform || '(empty)'}`)
  return [Number(match[1]), Number(match[2])]
}

describe('travel stretch', () => {
  function travelling(dx: number, dy: number): HTMLElement {
    const el = document.createElement('div')
    document.body.appendChild(el)
    mockRect(el)
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS }, {})
    let x = 0
    let y = 0
    controller.travelled(x, y, 1 / 60)
    for (let i = 0; i < 8; i++) {
      x += dx
      y += dy
      controller.travelled(x, y, 1 / 60)
      controller.tick(1 / 60)
    }
    return el
  }

  it('elongates along the axis it travels and pinches across it', () => {
    const [sx, sy] = scaleOf(travelling(24, 0))
    expect(sx).toBeGreaterThan(1)
    expect(sy).toBeLessThan(1)

    const [vx, vy] = scaleOf(travelling(0, 24))
    expect(vy).toBeGreaterThan(1)
    expect(vx).toBeLessThan(1)
  })

  it('stretches further the faster it goes', () => {
    const [slow] = scaleOf(travelling(6, 0))
    const [fast] = scaleOf(travelling(30, 0))
    expect(fast).toBeGreaterThan(slow)
  })

  it('settles back to a round surface once it stops', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    mockRect(el)
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS }, {})
    let x = 0
    for (let i = 0; i < 8; i++) {
      x += 24
      controller.travelled(x, 0, 1 / 60)
      controller.tick(1 / 60)
    }
    expect(scaleOf(el)[0]).toBeGreaterThan(1)
    for (let i = 0; i < 400; i++) {
      controller.travelled(x, 0, 1 / 60)
      controller.tick(1 / 60)
    }
    expect(el.style.transform).toBe('')
    el.remove()
  })

  it('relaxes on its own when position reports simply stop coming', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    mockRect(el)
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS }, {})
    let x = 0
    for (let i = 0; i < 8; i++) {
      x += 24
      controller.travelled(x, 0, 1 / 60)
      controller.tick(1 / 60)
    }
    expect(scaleOf(el)[0]).toBeGreaterThan(1)
    for (let i = 0; i < 500; i++) controller.tick(1 / 60)
    expect(el.style.transform).toBe('')
    el.remove()
  })

  it('stays still when stretch is turned off', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    mockRect(el)
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS, stretch: 0 }, {})
    let x = 0
    for (let i = 0; i < 8; i++) {
      x += 24
      controller.travelled(x, 0, 1 / 60)
      controller.tick(1 / 60)
    }
    expect(el.style.transform).toBe('')
    el.remove()
  })
})
