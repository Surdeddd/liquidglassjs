import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { colorWithOpacity, LiquidGlass } from '../src/index'

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
  it('forwards plain html props to the dom element', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    let clicks = 0
    act(() => {
      root.render(
        createElement(LiquidGlass, {
          id: 'glass-card',
          title: 'card',
          'aria-label': 'glassy',
          onClick: () => {
            clicks += 1
          },
          adaptive: false,
          physics: false
        })
      )
    })
    const glass = host.querySelector<HTMLElement>('[data-liquid-glass]')
    expect(glass?.id).toBe('glass-card')
    expect(glass?.getAttribute('title')).toBe('card')
    expect(glass?.getAttribute('aria-label')).toBe('glassy')
    act(() => {
      glass?.click()
    })
    expect(clicks).toBe(1)
    act(() => {
      root.unmount()
    })
    host.remove()
  })

  it('re-attaches when the mount target node changes', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(LiquidGlass, { as: 'div', adaptive: false, physics: false }))
    })
    const first = host.querySelector<HTMLElement>('[data-liquid-glass]')
    expect(first?.tagName.toLowerCase()).toBe('div')
    act(() => {
      root.render(createElement(LiquidGlass, { as: 'section', adaptive: false, physics: false }))
    })
    const second = host.querySelector<HTMLElement>('[data-liquid-glass]')
    expect(second?.tagName.toLowerCase()).toBe('section')
    expect(second).not.toBe(first)
    expect(first?.hasAttribute('data-liquid-glass')).toBe(false)
    act(() => {
      root.unmount()
    })
    expect(host.querySelector('[data-liquid-glass]')).toBeNull()
    host.remove()
  })

  it('does not restart physics when an inline options object keeps the same values', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const render = (): void => {
      root.render(
        createElement(LiquidGlass, {
          adaptive: false,
          backend: 'css-fallback',
          physics: { press: true, hover: false }
        })
      )
    }
    act(render)
    const glass = host.querySelector<HTMLElement>('[data-liquid-glass]')
    glass?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 4, clientY: 4 }))
    expect(glass?.getAttribute('data-liquid-glass-pressed')).toBe('true')
    act(render)
    glass?.dispatchEvent(new PointerEvent('pointerup'))
    expect(glass?.hasAttribute('data-liquid-glass-pressed')).toBe(false)
    act(() => {
      root.unmount()
    })
    host.remove()
  })

  it('resets options dropped between renders', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(
        createElement(LiquidGlass, {
          backend: 'css-fallback',
          adaptive: false,
          physics: false,
          tint: '#ff0000',
          tintOpacity: 1
        })
      )
    })
    const glass = host.querySelector<HTMLElement>('[data-liquid-glass]')
    expect(glass?.style.getPropertyValue('background')).toBe(colorWithOpacity('#ff0000', 1))
    act(() => {
      root.render(
        createElement(LiquidGlass, { backend: 'css-fallback', adaptive: false, physics: false })
      )
    })
    expect(glass?.style.getPropertyValue('background')).not.toBe(colorWithOpacity('#ff0000', 1))
    act(() => {
      root.unmount()
    })
    host.remove()
  })
})
