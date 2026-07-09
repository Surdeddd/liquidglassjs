import { describe, expect, it } from 'vitest'
import { LiquidGlass, useLiquidGlass, attach } from '../src/index'

describe('react bindings', () => {
  it('exports a component', () => {
    expect(typeof LiquidGlass).toBe('function')
  })

  it('exports a hook', () => {
    expect(typeof useLiquidGlass).toBe('function')
  })

  it('re-exports the core api', () => {
    expect(typeof attach).toBe('function')
  })
})
