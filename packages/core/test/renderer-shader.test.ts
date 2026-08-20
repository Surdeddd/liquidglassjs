import { describe, expect, it } from 'vitest'
import {
  FRAGMENT_SRC,
  FROST_SCALE,
  GlRenderer,
  scaleMaterialToDevice,
  UNIFORMS,
  VERTEX_SRC
} from '../src/gl/renderer'
import { buildLensChain } from '../src/backends/filter-chain'
import { resolveMaterial } from '../src/material'

const PROGRAM = `${VERTEX_SRC}\n${FRAGMENT_SRC}`
const SVG_NS = 'http://www.w3.org/2000/svg'

function makeFilter(): SVGFilterElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  const filter = document.createElementNS(SVG_NS, 'filter')
  svg.appendChild(filter)
  document.body.appendChild(svg)
  return filter as SVGFilterElement
}

function uniformRecorder(): { gl: Record<string, unknown>; floats: Map<string, number> } {
  const floats = new Map<string, number>()
  const noop = (): void => {}
  const gl: Record<string, unknown> = {
    canvas: null,
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    BLEND: 8,
    SRC_ALPHA: 9,
    ONE_MINUS_SRC_ALPHA: 10,
    TEXTURE_2D: 11,
    TEXTURE0: 12,
    RGBA: 13,
    UNSIGNED_BYTE: 14,
    COLOR_BUFFER_BIT: 15,
    createShader: () => ({}),
    shaderSource: noop,
    compileShader: noop,
    getShaderParameter: () => true,
    deleteShader: noop,
    createProgram: () => ({}),
    attachShader: noop,
    linkProgram: noop,
    getProgramParameter: () => true,
    deleteProgram: noop,
    createBuffer: () => ({}),
    deleteBuffer: noop,
    bindBuffer: noop,
    bufferData: noop,
    enableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    getUniformLocation: (_program: unknown, name: string) => name,
    useProgram: noop,
    enable: noop,
    blendFunc: noop,
    getExtension: () => null,
    createTexture: () => ({}),
    activeTexture: noop,
    bindTexture: noop,
    pixelStorei: noop,
    texImage2D: noop,
    generateMipmap: noop,
    texParameteri: noop,
    deleteTexture: noop,
    viewport: noop,
    clearColor: noop,
    clear: noop,
    uniform1i: noop,
    uniform1f: (name: string, value: number) => {
      floats.set(name, value)
    },
    uniform2f: noop,
    uniform4f: noop,
    uniform1fv: noop,
    uniform4fv: noop,
    drawArrays: noop
  }
  return { gl, floats }
}

function rendererOn(gl: Record<string, unknown>): GlRenderer | null {
  const original = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string) {
    if (id !== 'webgl2') return null
    gl['canvas'] = this
    return gl as unknown as WebGL2RenderingContext
  } as typeof original
  const renderer = GlRenderer.create(document.createElement('canvas'))
  HTMLCanvasElement.prototype.getContext = original
  return renderer
}

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

  it('derives the dome exponent from the material instead of a fixed quartic', () => {
    expect(FRAGMENT_SRC).toContain('2.0 + 4.0 * u_bevelDepth')
    expect(FRAGMENT_SRC).not.toContain('u * u * u * pow(max(1.0 - u * u * u * u')
  })

  it('binds the bevel depth, the pixel ratio and an already-scaled rim', () => {
    const { gl, floats } = uniformRecorder()
    const renderer = rendererOn(gl)
    expect(renderer).not.toBeNull()
    renderer!.setTexture({} as TexImageSource)
    renderer!.resize(400, 200)
    const quad = { x: 0, y: 0, width: 400, height: 200 }
    renderer!.render(
      [
        {
          quad,
          shapes: [{ rect: quad, radius: 32 }],
          material: scaleMaterialToDevice(resolveMaterial({ bevelWidth: 24, bevelDepth: 0.25 }), {
            radius: 16,
            width: 200,
            height: 100,
            ratio: 2
          }),
          mergeK: 1,
          pxRatio: 2
        }
      ],
      quad
    )
    expect(floats.get('u_bevelDepth')).toBe(0.25)
    expect(floats.get('u_pxRatio')).toBe(2)
    expect(floats.get('u_bevelWidth')).toBe(48)
    renderer!.destroy()
  })
})

describe('frost parity between backends', () => {
  it('offsets the sample coordinate instead of adding luminance grain', () => {
    expect(FRAGMENT_SRC).toContain('frostOffset(basePx)')
    expect(FRAGMENT_SRC).not.toContain('u_frost * 0.12')
  })

  it('jitters at the scale the svg chain displaces by, in css pixels', () => {
    const material = resolveMaterial({ frost: 0.5 })
    const filter = makeFilter()
    buildLensChain({ filter, material, scale: 8, passes: 1 })
    const node = filter.querySelector('[data-lg-role="frost"]')
    expect(node?.getAttribute('scale')).toBe(String(material.frost * FROST_SCALE))
    expect(FRAGMENT_SRC).toContain(`u_frost * ${FROST_SCALE}.0 * ratio`)
    expect(FRAGMENT_SRC).toContain('floor(px / ratio)')
    filter.ownerSVGElement?.remove()
  })
})

describe('scaleMaterialToDevice', () => {
  const css = { radius: 16, width: 240, height: 120 }

  it('draws the same rim on a retina display as on a 1x one', () => {
    const material = resolveMaterial({ bevelWidth: 24 })
    expect(scaleMaterialToDevice(material, { ...css, ratio: 1 }).bevelWidth).toBe(24)
    expect(scaleMaterialToDevice(material, { ...css, ratio: 2 }).bevelWidth).toBe(48)
  })

  it('resolves an auto band in css pixels before scaling it', () => {
    const material = resolveMaterial({ bevelWidth: 'auto' })
    expect(scaleMaterialToDevice(material, { ...css, radius: 4, ratio: 1 }).bevelWidth).toBe(12)
    expect(scaleMaterialToDevice(material, { ...css, radius: 4, ratio: 2 }).bevelWidth).toBe(24)
  })

  it('keeps thickness on the device scale it already used', () => {
    const material = resolveMaterial({ thickness: 10 })
    expect(scaleMaterialToDevice(material, { ...css, ratio: 2 }).thickness).toBe(20)
  })
})
