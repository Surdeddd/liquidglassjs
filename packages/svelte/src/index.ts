import { attach, resetMissingOptions, type LiquidGlassOptions } from '@surdeddd/liquidglass-core'

export interface LiquidGlassActionReturn {
  update(options?: LiquidGlassOptions): void
  destroy(): void
}

export function liquidGlass(node: Element, options?: LiquidGlassOptions): LiquidGlassActionReturn {
  const handle = attach(node, options ?? {})
  let previous = options ?? {}
  return {
    update(next) {
      const value = next ?? {}
      handle.set(resetMissingOptions(previous, value))
      previous = value
    },
    destroy() {
      handle.destroy()
    }
  }
}

export * from '@surdeddd/liquidglass-core'
