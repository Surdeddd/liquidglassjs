import { describe, expect, it } from 'vitest'
import { buildLensChain } from '../src/backends/filter-chain'
import { resolveMaterial } from '../src/material'

const SVG_NS = 'http://www.w3.org/2000/svg'

function makeFilter(): SVGFilterElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  const filter = document.createElementNS(SVG_NS, 'filter')
  svg.appendChild(filter)
  document.body.appendChild(svg)
  return filter as SVGFilterElement
}

describe('buildLensChain', () => {
  it('splits the channels into three displacements when dispersion gets three passes', () => {
    const filter = makeFilter()
    buildLensChain({
      filter,
      material: resolveMaterial({ dispersion: 0.5 }),
      scale: 12,
      passes: 3
    })
    expect(filter.querySelectorAll('feDisplacementMap[data-lg-role^="displace"]').length).toBe(3)
    expect(filter.querySelectorAll('feComposite').length).toBeGreaterThanOrEqual(2)
    filter.ownerSVGElement?.remove()
  })

  it('builds a single displacement on the one-pass path', () => {
    const filter = makeFilter()
    buildLensChain({
      filter,
      material: resolveMaterial({ dispersion: 0.5 }),
      scale: 12,
      passes: 1
    })
    expect(filter.querySelectorAll('feDisplacementMap[data-lg-role^="displace"]').length).toBe(1)
    filter.ownerSVGElement?.remove()
  })

  it('adds the frost scatter only when frost is on', () => {
    const plain = makeFilter()
    buildLensChain({ filter: plain, material: resolveMaterial({ frost: 0 }), scale: 8, passes: 1 })
    expect(plain.querySelector('[data-lg-role="frost"]')).toBeNull()

    const frosted = makeFilter()
    buildLensChain({
      filter: frosted,
      material: resolveMaterial({ frost: 0.6 }),
      scale: 8,
      passes: 1
    })
    expect(frosted.querySelector('feTurbulence')).toBeNull()
    expect(frosted.querySelector('[data-lg-role="frost"]')).not.toBeNull()
    plain.ownerSVGElement?.remove()
    frosted.ownerSVGElement?.remove()
  })

  it('mixes the frost into the backdrop before the bend so the bent image is read once', () => {
    for (const passes of [1, 3] as const) {
      const filter = makeFilter()
      buildLensChain({ filter, material: resolveMaterial({ frost: 0.2, dispersion: 0.5 }), scale: 8, passes })
      const frost = filter.querySelector('[data-lg-role="frost"]')
      const mix = filter.querySelector('[data-lg-role="frost-mix"]')
      expect(frost?.getAttribute('in')).toBe('SourceGraphic')
      for (const node of filter.querySelectorAll('feDisplacementMap')) {
        expect(node.getAttribute('in')).toBe(mix?.getAttribute('result'))
      }
      const reads = new Map<string, number>()
      for (const node of filter.children) {
        for (const attr of ['in', 'in2']) {
          const name = node.getAttribute(attr)
          if (name) reads.set(name, (reads.get(name) ?? 0) + 1)
        }
      }
      expect(reads.get('lgLens')).toBe(1)
      filter.ownerSVGElement?.remove()
    }
  })

  it('rebuilds from scratch so a second call does not stack nodes', () => {
    const filter = makeFilter()
    const spec = { filter, material: resolveMaterial({}), scale: 8, passes: 1 as const }
    buildLensChain(spec)
    const first = filter.childElementCount
    buildLensChain(spec)
    expect(filter.childElementCount).toBe(first)
    filter.ownerSVGElement?.remove()
  })
})
