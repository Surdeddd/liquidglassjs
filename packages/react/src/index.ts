import { createElement, useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { attach, type LiquidGlassOptions, type LiquidGlassPreset } from '@liquidglass/core'

export function useLiquidGlass(ref: RefObject<Element | null>, options?: LiquidGlassOptions): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handle = attach(el, options ?? {})
    return () => handle.destroy()
  }, [ref, options?.preset])
}

export interface LiquidGlassProps {
  as?: keyof HTMLElementTagNameMap
  preset?: LiquidGlassPreset
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function LiquidGlass({ as = 'div', preset, className, style, children }: LiquidGlassProps): ReactNode {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handle = attach(el, preset === undefined ? {} : { preset })
    return () => handle.destroy()
  }, [preset])
  return createElement(as, { ref, className, style }, children)
}

export * from '@liquidglass/core'
