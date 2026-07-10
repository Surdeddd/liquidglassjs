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
    expect(el.style.transform).toMatch(/scale\(1\.0[0-9]+, 0\.9[0-9]+\)/)
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
