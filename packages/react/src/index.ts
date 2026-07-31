import { createElement, forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type {
  CSSProperties,
  ForwardRefExoticComponent,
  HTMLAttributes,
  PropsWithoutRef,
  ReactNode,
  Ref,
  RefAttributes,
  RefObject
} from 'react'
import {
  attach,
  getInstance,
  isOptionKey,
  resetMissingOptions,
  type LiquidGlassHandle,
  type LiquidGlassOptions
} from '@surdeddd/liquidglass-core'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (a instanceof Element || b instanceof Element) return false
  const aKeys = Object.keys(a as object)
  const bKeys = Object.keys(b as object)
  if (aKeys.length !== bKeys.length) return false
  return bKeys.every(
    key => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]
  )
}

function sameOptions(a: LiquidGlassOptions | undefined, b: LiquidGlassOptions): boolean {
  if (!a) return false
  const aKeys = Object.keys(a) as (keyof LiquidGlassOptions)[]
  const bKeys = Object.keys(b) as (keyof LiquidGlassOptions)[]
  if (aKeys.length !== bKeys.length) return false
  return bKeys.every(key => sameValue(a[key], b[key]))
}

export function useLiquidGlass(
  ref: RefObject<Element | null>,
  options: LiquidGlassOptions = {}
): void {
  const handleRef = useRef<LiquidGlassHandle | null>(null)
  const nodeRef = useRef<Element | null>(null)
  const initial = useRef(options)
  initial.current = options
  const applied = useRef<LiquidGlassOptions | undefined>(undefined)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current ?? null
    if (el === nodeRef.current) return
    handleRef.current?.destroy()
    handleRef.current = el ? attach(el, initial.current) : null
    nodeRef.current = el
    applied.current = el ? initial.current : undefined
  })

  useIsomorphicLayoutEffect(
    () => () => {
      handleRef.current?.destroy()
      handleRef.current = null
      nodeRef.current = null
      applied.current = undefined
    },
    []
  )

  useEffect(() => {
    if (!handleRef.current || sameOptions(applied.current, options)) return
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

export const LiquidGlass: ForwardRefExoticComponent<
  PropsWithoutRef<LiquidGlassProps> & RefAttributes<HTMLElement>
> = forwardRef<HTMLElement, LiquidGlassProps>(function LiquidGlass(
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
  const forwarded = useRef(forwardedRef)
  forwarded.current = forwardedRef
  const setRef = useCallback((node: HTMLElement | null): void => {
    elementRef.current = node
    assignRef(forwarded.current, node)
  }, [])
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
