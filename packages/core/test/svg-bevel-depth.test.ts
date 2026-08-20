import { describe, expect, it, vi } from 'vitest'
import { cssSvgBackend } from '../src/backends/css-svg'
import { svgContentBackend } from '../src/backends/svg-content'
import type { Backend, BackendSurface } from '../src/backends/types'
import type { MapOptions } from '../src/displacement'
import { resolveMaterial } from '../src/material'

const { requests } = vi.hoisted(() => ({ requests: [] as MapOptions[] }))

vi.mock('../src/worker/host', () => ({
  requestLensMap: (opts: MapOptions): void => {
    requests.push(opts)
  },
  resetLensWorker: (): void => {}
}))

function makeSurface(bevelDepth: number): BackendSurface {
  const element = document.createElement('div')
  const backdrop = document.createElement('div')
  document.body.append(backdrop, element)
  return {
    element,
    preset: 'clear',
    material: resolveMaterial({ preset: 'clear', bevelDepth }),
    state: { rect: { x: 0, y: 0, width: 240, height: 120 }, visible: true },
    backdrop,
    sceneImage: null
  }
}

function mapRequestFor(backend: Backend, bevelDepth: number): MapOptions {
  requests.length = 0
  const surface = makeSurface(bevelDepth)
  const instance = backend.mount(surface)
  instance.sync(surface)
  const asked = requests[requests.length - 1]
  instance.destroy()
  surface.element.remove()
  if (!asked) throw new Error(`${backend.id} never asked for a lens map`)
  return asked
}

describe('svg backends carry bevelDepth into the lens map', () => {
  it('css-svg forwards the material knob', () => {
    expect(mapRequestFor(cssSvgBackend, 0.25).bevelDepth).toBe(0.25)
  })

  it('svg-content forwards the material knob', () => {
    expect(mapRequestFor(svgContentBackend, 0.25).bevelDepth).toBe(0.25)
  })

  it('asks for a different dome when the knob moves, on both backends', () => {
    expect(mapRequestFor(cssSvgBackend, 0).bevelDepth).not.toBe(
      mapRequestFor(cssSvgBackend, 1).bevelDepth
    )
    expect(mapRequestFor(svgContentBackend, 0).bevelDepth).not.toBe(
      mapRequestFor(svgContentBackend, 1).bevelDepth
    )
  })
})
