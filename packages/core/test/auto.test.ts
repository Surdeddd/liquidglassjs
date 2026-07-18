import { afterEach, describe, expect, it } from 'vitest'
import { autoAttach, getInstance } from '../src/index'

function flushObserver(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('autoAttach', () => {
  it('attaches pre-existing marked nodes with parsed options', () => {
    const el = document.createElement('div')
    el.setAttribute(
      'data-liquid-glass-auto',
      '{"preset":"frosted","backend":"css-fallback","physics":false,"adaptive":false}'
    )
    document.body.appendChild(el)
    const stop = autoAttach()
    expect(el.getAttribute('data-liquid-glass')).toBe('frosted')
    stop()
    expect(getInstance(el)).toBeUndefined()
  })

  it('attaches dynamically added nodes and detaches removed ones', async () => {
    const stop = autoAttach()
    const el = document.createElement('div')
    el.setAttribute('data-liquid-glass-auto', '')
    document.body.appendChild(el)
    await flushObserver()
    expect(el.hasAttribute('data-liquid-glass')).toBe(true)
    el.remove()
    await flushObserver()
    expect(getInstance(el)).toBeUndefined()
    stop()
  })

  it('tolerates malformed json options', () => {
    const el = document.createElement('div')
    el.setAttribute('data-liquid-glass-auto', '{broken')
    document.body.appendChild(el)
    const stop = autoAttach()
    expect(el.hasAttribute('data-liquid-glass')).toBe(true)
    stop()
  })
})
