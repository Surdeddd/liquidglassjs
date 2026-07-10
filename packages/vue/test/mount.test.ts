import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { LiquidGlass, vLiquidGlass } from '../src/index'

describe('LiquidGlass vue component', () => {
  it('attaches the engine on mount with merged options', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      render: () =>
        h(
          LiquidGlass,
          { preset: 'frosted', options: { adaptive: false, physics: false } },
          () => 'hello'
        )
    })
    app.mount(host)
    const glass = host.querySelector('[data-liquid-glass]')
    expect(glass?.getAttribute('data-liquid-glass')).toBe('frosted')
    expect(glass?.textContent).toBe('hello')
    app.unmount()
    expect(host.querySelector('[data-liquid-glass]')).toBeNull()
    host.remove()
  })

  it('supports the directive lifecycle', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      directives: { liquidGlass: vLiquidGlass },
      render: () => h('div', { 'v-liquid-glass': undefined })
    })
    const vm = app.mount(host)
    const el = (vm.$el as HTMLElement)
    vLiquidGlass.mounted?.(el, { value: { preset: 'tinted', adaptive: false, physics: false } } as never, null as never, null as never)
    await nextTick()
    expect(el.getAttribute('data-liquid-glass')).toBe('tinted')
    vLiquidGlass.unmounted?.(el, {} as never, null as never, null as never)
    expect(el.hasAttribute('data-liquid-glass')).toBe(false)
    app.unmount()
    host.remove()
  })
})
