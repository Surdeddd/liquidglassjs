import { attach, type LiquidGlassOptions } from '@liquidglass/core'

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

export * from '@liquidglass/core'
