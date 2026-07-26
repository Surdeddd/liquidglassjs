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
