import {
  attach,
  getInstance,
  resetMissingOptions,
  type LiquidGlassHandle,
  type LiquidGlassOptions
} from '@surdeddd/liquidglass-core'

export interface LiquidGlassActionReturn {
  update(options?: LiquidGlassOptions): void
  destroy(): void
}

export type LiquidGlassAction = (
  node: Element,
  options?: LiquidGlassOptions
) => LiquidGlassActionReturn

export const liquidGlass: LiquidGlassAction = (node, options) => {
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

export function glassOf(node: Element | null | undefined): LiquidGlassHandle | undefined {
  return node ? getInstance(node) : undefined
}

export * from '@surdeddd/liquidglass-core'
