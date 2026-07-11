import { createElement, forwardRef, useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode, Ref, RefObject } from 'react'
import {
  attach,
  getInstance,
  isOptionKey,
  resetMissingOptions,
  type LiquidGlassHandle,
  type LiquidGlassOptions
} from '@surdeddd/liquidglass-core'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function shallowEqual(a: LiquidGlassOptions | undefined, b: LiquidGlassOptions): boolean {
  if (!a) return false
  const aKeys = Object.keys(a) as (keyof LiquidGlassOptions)[]
  const bKeys = Object.keys(b) as (keyof LiquidGlassOptions)[]
  if (aKeys.length !== bKeys.length) return false
  return bKeys.every(key => a[key] === b[key])
}

export function useLiquidGlass(
  ref: RefObject<Element | null>,
  options: LiquidGlassOptions = {}
): void {
  const handleRef = useRef<LiquidGlassHandle | null>(null)
  const initial = useRef(options)
  initial.current = options
  const applied = useRef<LiquidGlassOptions | undefined>(undefined)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    handleRef.current = attach(el, initial.current)
    applied.current = initial.current
    return () => {
      handleRef.current?.destroy()
      handleRef.current = null
      applied.current = undefined
    }
  }, [ref])

  useEffect(() => {
    if (!handleRef.current || shallowEqual(applied.current, options)) return
    handleRef.current.set(resetMissingOptions(applied.current, options))
    applied.current = options
  })
}

export type LiquidGlassProps = LiquidGlassOptions &
  Omit<HTMLAttributes<HTMLElement>, 'className' | 'style' | 'children'> & {
    as?: keyof HTMLElementTagNameMap
    className?: string
    style?: CSSProperties
    children?: ReactNode
  }

export const LiquidGlass = forwardRef<HTMLElement, LiquidGlassProps>(function LiquidGlass(
  { as = 'div', className, style, children, ...rest },
  forwardedRef
) {
  const options: LiquidGlassOptions = {}
  const domProps: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (isOptionKey(key)) {
      ;(options as Record<string, unknown>)[key] = value
    } else {
      domProps[key] = value
    }
  }
  const elementRef = useRef<HTMLElement | null>(null)
  useLiquidGlass(elementRef, options)
  const setRef = (node: HTMLElement | null): void => {
    elementRef.current = node
    assignRef(forwardedRef, node)
  }
  return createElement(as, { ...domProps, ref: setRef, className, style }, children)
})

function assignRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null): void {
  if (!ref) return
  if (typeof ref === 'function') {
    ref(node)
    return
  }
  ;(ref as { current: HTMLElement | null }).current = node
}

export function useLiquidGlassHandle(
  ref: RefObject<Element | null>
): LiquidGlassHandle | undefined {
  return ref.current ? getInstance(ref.current) : undefined
}

export * from '@surdeddd/liquidglass-core'
