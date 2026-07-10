import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { LiquidGlass } from '../src/index'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('LiquidGlass react component', () => {
  it('attaches the engine on mount and detaches on unmount', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(
        createElement(LiquidGlass, { preset: 'frosted', adaptive: false, physics: false }, 'hello')
      )
    })
    const glass = host.querySelector('[data-liquid-glass]')
    expect(glass).not.toBeNull()
    expect(glass?.getAttribute('data-liquid-glass')).toBe('frosted')
    expect(glass?.textContent).toBe('hello')
    act(() => {
      root.unmount()
    })
    expect(host.querySelector('[data-liquid-glass]')).toBeNull()
    host.remove()
  })

  it('applies option updates through set', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(LiquidGlass, { preset: 'clear', adaptive: false, physics: false }))
    })
    act(() => {
      root.render(createElement(LiquidGlass, { preset: 'tinted', adaptive: false, physics: false }))
    })
    expect(host.querySelector('[data-liquid-glass="tinted"]')).not.toBeNull()
    act(() => {
      root.unmount()
    })
    host.remove()
  })

  it('renders custom tags and forwards refs', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    let captured: HTMLElement | null = null
    act(() => {
      root.render(
        createElement(LiquidGlass, {
          as: 'nav',
          adaptive: false,
          physics: false,
          ref: (node: HTMLElement | null) => {
            captured = node
          }
        })
      )
    })
    expect(captured).not.toBeNull()
    expect((captured as HTMLElement | null)?.tagName.toLowerCase()).toBe('nav')
    act(() => {
      root.unmount()
    })
    host.remove()
  })
})
