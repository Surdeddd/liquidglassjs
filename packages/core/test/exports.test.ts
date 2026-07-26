import { describe, expect, it } from 'vitest'
import * as core from '../src/index'

const PUBLIC_API = [
  'attach',
  'detach',
  'getInstance',
  'autoAttach',
  'configure',
  'deviceTier',
  'getQuality',
  'watchFps',
  'probeCapabilities',
  'selectBackend',
  'listBackends',
  'registerBackend',
  'getBackend',
  'resolveMaterial',
  'clampMaterial',
  'sampleTone',
  'readForcedColors',
  'readReducedMotion',
  'readReducedTransparency',
  'watchMedia',
  'mountScrollEdge',
  'morphGlass',
  'onFrame',
  'onViewport',
  'isOptionKey',
  'resetMissingOptions',
  'VERSION'
]

describe('core public entry', () => {
  it('exposes every documented symbol', () => {
    for (const name of PUBLIC_API) {
      expect(core, `missing export: ${name}`).toHaveProperty(name)
    }
  })

  it('keeps the five built-in backends reachable', () => {
    const ids = core.listBackends().map(backend => backend.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'css-fallback',
        'css-svg',
        'svg-content',
        'webgl-overlay',
        'webgl-scene'
      ])
    )
  })

  it('reports a version string', () => {
    expect(typeof core.VERSION).toBe('string')
    expect(core.VERSION.length).toBeGreaterThan(0)
  })
})
