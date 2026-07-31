import { describe, expect, it } from 'vitest'
import { FRAGMENT_SRC, UNIFORMS, VERTEX_SRC } from '../src/gl/renderer'

const PROGRAM = `${VERTEX_SRC}\n${FRAGMENT_SRC}`

describe('gl lens shader', () => {
  it('declares every uniform the renderer binds', () => {
    for (const name of UNIFORMS) {
      expect(PROGRAM.includes(name), `program is missing uniform ${name}`).toBe(true)
    }
  })

  it('binds every uniform it declares', () => {
    const declared = [...PROGRAM.matchAll(/uniform\s+\w+\s+(u_\w+)/g)].map(match => match[1])
    const bound = new Set<string>(UNIFORMS)
    expect(declared.length).toBeGreaterThan(0)
    for (const name of declared) {
      expect(bound.has(name as string), `program declares unbound uniform ${name}`).toBe(true)
    }
  })

  it('keeps the optical terms the material model depends on', () => {
    expect(FRAGMENT_SRC).toContain('asin(')
    expect(FRAGMENT_SRC).toContain('u_ior')
    expect(FRAGMENT_SRC).toContain('u_magnify')
    expect(FRAGMENT_SRC).toContain('u_dispersion')
  })
})
