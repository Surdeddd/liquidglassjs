import { describe, expect, it } from 'vitest'
import { LiquidGlass, useLiquidGlass, attach } from '../src/index'

describe('react bindings', () => {
  it('exports a component', () => {
    expect(LiquidGlass).toBeTruthy()
    expect(['function', 'object']).toContain(typeof LiquidGlass)
  })

  it('exports a hook', () => {
    expect(typeof useLiquidGlass).toBe('function')
  })

  it('re-exports the core api', () => {
    expect(typeof attach).toBe('function')
  })
})
