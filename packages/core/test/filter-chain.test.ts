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

  it('adds the frost turbulence only when frost is on', () => {
    const plain = makeFilter()
    buildLensChain({ filter: plain, material: resolveMaterial({ frost: 0 }), scale: 8, passes: 1 })
    expect(plain.querySelector('feTurbulence')).toBeNull()

    const frosted = makeFilter()
    buildLensChain({
      filter: frosted,
      material: resolveMaterial({ frost: 0.6 }),
      scale: 8,
      passes: 1
    })
    expect(frosted.querySelector('feTurbulence')).not.toBeNull()
    expect(frosted.querySelector('[data-lg-role="frost"]')).not.toBeNull()
    plain.ownerSVGElement?.remove()
    frosted.ownerSVGElement?.remove()
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
