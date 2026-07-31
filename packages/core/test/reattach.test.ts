import { describe, expect, it } from 'vitest'
import { attach, getInstance } from '../src/index'

describe('destroy then re-attach', () => {
  it('marks the new preset through the css-svg path', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const first = attach(el, {
      backend: 'css-svg',
      preset: 'clear',
      adaptive: false,
      physics: false
    })
    first.destroy()
    const second = attach(el, {
      backend: 'css-svg',
      preset: 'frosted',
      adaptive: false,
      physics: false
    })
    expect(el.getAttribute('data-liquid-glass')).toBe('frosted')
    second.destroy()
    el.remove()
  })

  it('marks the new preset through the svg-content path', () => {
    const painted = document.createElement('section')
    painted.style.backgroundColor = 'rgb(30, 30, 30)'
    document.body.appendChild(painted)
    const el = document.createElement('div')
    painted.appendChild(el)
    const first = attach(el, {
      backend: 'svg-content',
      preset: 'clear',
      adaptive: false,
      physics: false
    })
    first.destroy()
    const second = attach(el, {
      backend: 'svg-content',
      preset: 'frosted',
      adaptive: false,
      physics: false
    })
    expect(el.getAttribute('data-liquid-glass')).toBe('frosted')
    second.destroy()
    painted.remove()
  })

  it('tears down once no matter how many times destroy is called', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    handle.destroy()
    expect(getInstance(el)).toBeUndefined()
    const second = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    handle.destroy()
    expect(getInstance(el)).toBe(second)
    second.destroy()
    el.remove()
  })

  it('hands back the same handle while one is live and a fresh one after destroy', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const first = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    expect(attach(el, { preset: 'tinted' })).toBe(first)
    expect(el.getAttribute('data-liquid-glass')).toBe('tinted')
    first.destroy()
    expect(getInstance(el)).toBeUndefined()
    const second = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    expect(second).not.toBe(first)
    second.destroy()
    el.remove()
  })
})
