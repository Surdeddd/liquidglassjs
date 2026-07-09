import { describe, expect, it } from 'vitest'
import { LiquidGlass, vLiquidGlass, attach } from '../src/index'

describe('vue bindings', () => {
  it('exports a named component', () => {
    expect(LiquidGlass.name).toBe('LiquidGlass')
  })

  it('exports a directive with lifecycle hooks', () => {
    expect(typeof vLiquidGlass.mounted).toBe('function')
    expect(typeof vLiquidGlass.unmounted).toBe('function')
  })

  it('re-exports the core api', () => {
    expect(typeof attach).toBe('function')
  })
})
