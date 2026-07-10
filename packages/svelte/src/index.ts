import { attach, type LiquidGlassOptions } from '@surdeddd/liquidglass-core'

export interface LiquidGlassActionReturn {
  update(options?: LiquidGlassOptions): void
  destroy(): void
}

export function liquidGlass(node: Element, options?: LiquidGlassOptions): LiquidGlassActionReturn {
  const handle = attach(node, options ?? {})
  return {
    update(next) {
      handle.set(next ?? {})
    },
    destroy() {
      handle.destroy()
    }
  }
}

export * from '@surdeddd/liquidglass-core'
