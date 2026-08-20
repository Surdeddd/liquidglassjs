import { afterEach, describe, expect, it, vi } from 'vitest'
import { globalLightDir, registerLight } from '../src/fx/light'

const added: string[] = []
const removed: string[] = []

afterEach(() => {
  added.length = 0
  removed.length = 0
  vi.restoreAllMocks()
})

function spyListeners(): void {
  vi.spyOn(window, 'addEventListener').mockImplementation((type: string) => {
    added.push(type)
  })
  vi.spyOn(window, 'removeEventListener').mockImplementation((type: string) => {
    removed.push(type)
  })
}

describe('registerLight', () => {
  it('shares one set of listeners across clients and releases them with the last one', () => {
    spyListeners()
    const host = document.createElement('div')
    const stopA = registerLight({ host, motion: false, update: () => {} })
    const afterFirst = added.length
    const stopB = registerLight({ host, motion: false, update: () => {} })
    expect(added.length).toBe(afterFirst)
    stopA()
    expect(removed.length).toBe(0)
    stopB()
    expect(removed.length).toBeGreaterThan(0)
  })

  it('returns a disposer that is safe to call twice', () => {
    const host = document.createElement('div')
    const stop = registerLight({ host, motion: false, update: () => {} })
    expect(() => {
      stop()
      stop()
    }).not.toThrow()
  })
})

describe('globalLightDir', () => {
  it('falls back to the default direction before any pointer movement', () => {
    expect(globalLightDir()).toEqual([0.6, -0.8])
  })

  it('returns a unit vector', () => {
    const [x, y] = globalLightDir()
    expect(Math.hypot(x, y)).toBeCloseTo(1, 5)
  })
})

describe('pointer flush', () => {
  function boxAt(left: number, top: number): DOMRect {
    return {
      left,
      top,
      right: left + 20,
      bottom: top + 20,
      width: 20,
      height: 20
    } as DOMRect
  }

  it('measures every client before the first one writes', async () => {
    const order: string[] = []
    const stops: Array<() => void> = []
    const hosts: HTMLElement[] = []
    for (const name of ['a', 'b', 'c']) {
      const host = document.createElement('div')
      document.body.appendChild(host)
      hosts.push(host)
      vi.spyOn(host, 'getBoundingClientRect').mockImplementation(() => {
        order.push(`read ${name}`)
        return boxAt(10, 10)
      })
      stops.push(
        registerLight({
          host,
          motion: false,
          update: () => {
            order.push(`write ${name}`)
          }
        })
      )
    }
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    expect(order).toEqual(['read a', 'read b', 'read c', 'write a', 'write b', 'write c'])
    for (const stop of stops) stop()
    for (const host of hosts) host.remove()
  })

  it('skips clients that are scrolled far out of view', async () => {
    const order: string[] = []
    const near = document.createElement('div')
    const far = document.createElement('div')
    document.body.append(near, far)
    vi.spyOn(near, 'getBoundingClientRect').mockImplementation(() => boxAt(10, 10))
    vi.spyOn(far, 'getBoundingClientRect').mockImplementation(() =>
      boxAt(10, window.innerHeight + 400)
    )
    const stops = [
      registerLight({ host: near, motion: false, update: () => order.push('near') }),
      registerLight({ host: far, motion: false, update: () => order.push('far') })
    ]
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    expect(order).toEqual(['near'])
    for (const stop of stops) stop()
    near.remove()
    far.remove()
  })
})
