export type LiquidGlassPreset = 'clear' | 'frosted' | 'tinted'

export interface LiquidGlassOptions {
  preset?: LiquidGlassPreset
}

export interface LiquidGlassHandle {
  readonly element: Element
  set(options: Partial<LiquidGlassOptions>): void
  destroy(): void
}

const instances = new WeakMap<Element, LiquidGlassHandle>()

function apply(element: Element, options: LiquidGlassOptions): void {
  element.setAttribute('data-liquid-glass', options.preset ?? 'clear')
}

export function attach(element: Element, options: LiquidGlassOptions = {}): LiquidGlassHandle {
  const existing = instances.get(element)
  if (existing) {
    existing.set(options)
    return existing
  }
  let current: LiquidGlassOptions = { preset: 'clear', ...options }
  const handle: LiquidGlassHandle = {
    element,
    set(next) {
      current = { ...current, ...next }
      apply(element, current)
    },
    destroy() {
      instances.delete(element)
      element.removeAttribute('data-liquid-glass')
    }
  }
  instances.set(element, handle)
  apply(element, current)
  return handle
}

export function getInstance(element: Element): LiquidGlassHandle | undefined {
  return instances.get(element)
}

export function detach(element: Element): void {
  instances.get(element)?.destroy()
}

export const VERSION = '0.0.0'
