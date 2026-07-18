import { describe, expect, it } from 'vitest'
import { mountScrollEdge } from '../src/fx/scroll-edge'

describe('mountScrollEdge', () => {
  it('mounts a fixed dissolving strip on the body top', () => {
    const handle = mountScrollEdge(document.body, { position: 'top', size: 110 })
    const el = document.querySelector('[data-liquid-glass-layer="scroll-edge"]') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.hasAttribute('data-liquid-glass-ignore')).toBe(true)
    expect(el.style.position).toBe('fixed')
    expect(el.style.top).toBe('0px')
    expect(el.style.height).toBe('110px')
    expect(el.style.getPropertyValue('mask-image')).toContain('linear-gradient(to top')
    expect(el.style.getPropertyValue('backdrop-filter')).toContain('blur')
    handle.destroy()
    expect(document.querySelector('[data-liquid-glass-layer="scroll-edge"]')).toBeNull()
  })

  it('anchors to the bottom of a positioned container', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const handle = mountScrollEdge(host, { position: 'bottom' })
    const el = host.querySelector('[data-liquid-glass-layer="scroll-edge"]') as HTMLElement
    expect(el.style.position).toBe('absolute')
    expect(el.style.bottom).toBe('0px')
    expect(host.style.position).toBe('relative')
    handle.destroy()
    host.remove()
  })
})
