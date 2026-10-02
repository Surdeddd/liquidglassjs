import { afterEach, describe, expect, it, vi } from 'vitest'
import { readAppearance } from '../src/quality/a11y'

describe('readAppearance', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  function host(): HTMLElement {
    const element = document.createElement('div')
    document.body.append(element)
    return element
  }

  it('follows a declared dark or light color-scheme', () => {
    const element = host()
    element.style.setProperty('color-scheme', 'dark')
    expect(readAppearance(element)).toBe('dark')
    element.style.setProperty('color-scheme', 'only light')
    expect(readAppearance(element)).toBe('light')
  })

  it('resolves "light dark" through the user preference', () => {
    const element = host()
    element.style.setProperty('color-scheme', 'light dark')
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('dark') }))
    expect(readAppearance(element)).toBe('dark')
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(readAppearance(element)).toBe('light')
  })

  it('reports nothing when the page never declared a scheme', () => {
    expect(readAppearance(host())).toBeNull()
  })
})
