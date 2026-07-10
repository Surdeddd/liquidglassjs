import { describe, expect, it } from 'vitest'
import { createElement, version } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { LiquidGlass } from '@liquidglass/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('react 18 compatibility', () => {
  it('actually runs against react 18', () => {
    expect(version.startsWith('18.')).toBe(true)
  })

  it('mounts, updates and unmounts through the engine', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(
        createElement(LiquidGlass, { preset: 'frosted', adaptive: false, physics: false }, 'r18')
      )
    })
    const glass = host.querySelector('[data-liquid-glass="frosted"]')
    expect(glass?.textContent).toBe('r18')
    act(() => {
      root.render(
        createElement(LiquidGlass, { preset: 'tinted', adaptive: false, physics: false }, 'r18')
      )
    })
    expect(host.querySelector('[data-liquid-glass="tinted"]')).not.toBeNull()
    act(() => {
      root.unmount()
    })
    expect(host.querySelector('[data-liquid-glass]')).toBeNull()
    host.remove()
  })
})
