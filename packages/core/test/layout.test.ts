import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectAncestors, pinUsedMargins, usedMarginLeft } from '../src/runtime/layout'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function centeredPage(): { lens: HTMLElement; main: HTMLElement; stage: HTMLElement } {
  document.body.innerHTML = '<main><section class="stage"><div class="lens"></div></section></main>'
  const main = document.querySelector('main') as HTMLElement
  const stage = document.querySelector('.stage') as HTMLElement
  const lens = document.querySelector('.lens') as HTMLElement
  const lefts = new Map<Element, number>([
    [document.body, 0],
    [main, 142],
    [stage, 174],
    [lens, 938]
  ])
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return { left: lefts.get(this) ?? 0 } as DOMRect
  })
  vi.stubGlobal('getComputedStyle', () => flowStyle())
  return { lens, main, stage }
}

function flowStyle(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    marginLeft: '0px',
    position: 'static',
    float: 'none',
    display: 'block',
    direction: 'ltr',
    borderLeftWidth: '0px',
    paddingLeft: '0px',
    ...overrides
  }
}

describe('collectAncestors', () => {
  it('walks each surface up to the stop node without duplicates', () => {
    document.body.innerHTML = '<main><section><div id="a"></div><div id="b"></div></section></main>'
    const a = document.getElementById('a') as HTMLElement
    const b = document.getElementById('b') as HTMLElement
    const chain = collectAncestors([a, b], document.body)
    expect(chain.map(node => node.tagName.toLowerCase())).toEqual(['section', 'main'])
  })

  it('stops at the boundary element', () => {
    document.body.innerHTML = '<main><section><div id="a"></div></section></main>'
    const a = document.getElementById('a') as HTMLElement
    const main = document.querySelector('main') as HTMLElement
    expect(collectAncestors([a], main).map(n => n.tagName.toLowerCase())).toEqual(['section'])
  })
})

describe('usedMarginLeft', () => {
  it('recovers the pixel offset that a centered container resolves to', () => {
    const { main } = centeredPage()
    expect(usedMarginLeft(main)).toBe(142)
  })

  it('ignores containers that are already flush with their parent', () => {
    const { stage } = centeredPage()
    expect(usedMarginLeft(stage)).toBe(32)
    const flush = document.createElement('div')
    document.body.appendChild(flush)
    expect(usedMarginLeft(flush)).toBeNull()
  })

  it('leaves explicit margins alone', () => {
    centeredPage()
    vi.stubGlobal('getComputedStyle', () => flowStyle({ marginLeft: '20px' }))
    expect(usedMarginLeft(document.querySelector('main') as HTMLElement)).toBeNull()
  })

  it('skips absolutely positioned nodes, which carry their own offset', () => {
    centeredPage()
    vi.stubGlobal('getComputedStyle', () => flowStyle({ position: 'absolute' }))
    expect(usedMarginLeft(document.querySelector('main') as HTMLElement)).toBeNull()
  })
})

describe('offsets that are not auto margins', () => {
  it('leaves a flex-centered child alone, so pinning cannot double its offset', () => {
    const { main } = centeredPage()
    vi.stubGlobal('getComputedStyle', (node: Element) =>
      node === main.parentElement ? flowStyle({ display: 'flex' }) : flowStyle()
    )
    expect(usedMarginLeft(main)).toBeNull()
  })

  it('leaves an inline-block centered by text-align alone', () => {
    const { main } = centeredPage()
    vi.stubGlobal('getComputedStyle', () => flowStyle({ display: 'inline-block' }))
    expect(usedMarginLeft(main)).toBeNull()
  })

  it('leaves floats alone', () => {
    const { main } = centeredPage()
    vi.stubGlobal('getComputedStyle', () => flowStyle({ float: 'right' }))
    expect(usedMarginLeft(main)).toBeNull()
  })

  it('skips right-to-left containers', () => {
    const { main } = centeredPage()
    vi.stubGlobal('getComputedStyle', () => flowStyle({ direction: 'rtl' }))
    expect(usedMarginLeft(main)).toBeNull()
  })
})

describe('pinUsedMargins', () => {
  it('writes the resolved offsets and restores the previous inline value', () => {
    const { lens, main } = centeredPage()
    main.style.marginLeft = '0px'
    const restore = pinUsedMargins([lens], document.body)
    expect(main.style.marginLeft).toBe('142px')
    for (const undo of restore) undo()
    expect(main.style.marginLeft).toBe('0px')
  })

  it('restores an absent inline margin back to absent', () => {
    const { lens, main } = centeredPage()
    const restore = pinUsedMargins([lens], document.body)
    expect(main.style.marginLeft).toBe('142px')
    for (const undo of restore) undo()
    expect(main.getAttribute('style') ?? '').not.toContain('142px')
  })
})
