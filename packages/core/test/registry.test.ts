import { describe, expect, it } from 'vitest'
import { cssFallbackBackend } from '../src/backends/css-fallback'
import { registerBackend, selectBackend } from '../src/backends/registry'
import type { Backend } from '../src/backends/types'
import { NO_CAPABILITIES } from '../src/probe'

registerBackend(cssFallbackBackend)

const unsupportedBackend: Backend = {
  id: 'webgpu',
  priority: 100,
  isSupported: () => false,
  mount: () => ({ update() {}, sync() {}, destroy() {} })
}

const supportedBackend: Backend = {
  id: 'webgl-overlay',
  priority: 50,
  isSupported: () => true,
  mount: () => ({ update() {}, sync() {}, destroy() {} })
}

describe('selectBackend', () => {
  it('falls back to css-fallback when nothing else is registered', () => {
    expect(selectBackend(NO_CAPABILITIES, 'auto').id).toBe('css-fallback')
  })

  it('picks the highest-priority supported backend', () => {
    registerBackend(unsupportedBackend)
    registerBackend(supportedBackend)
    expect(selectBackend(NO_CAPABILITIES, 'auto').id).toBe('webgl-overlay')
  })

  it('honors an explicit supported preference', () => {
    registerBackend(supportedBackend)
    expect(selectBackend(NO_CAPABILITIES, 'css-fallback').id).toBe('css-fallback')
  })

  it('ignores an explicit preference that is not supported', () => {
    registerBackend(unsupportedBackend)
    expect(selectBackend(NO_CAPABILITIES, 'webgpu').id).not.toBe('webgpu')
  })

  it('skips explicit-only backends during auto selection', () => {
    const explicitOnly: Backend = {
      id: 'webgl-scene',
      priority: 999,
      autoSelect: false,
      isSupported: () => true,
      mount: () => ({ update() {}, sync() {}, destroy() {} })
    }
    registerBackend(explicitOnly)
    registerBackend(supportedBackend)
    expect(selectBackend(NO_CAPABILITIES, 'auto').id).not.toBe('webgl-scene')
    expect(selectBackend(NO_CAPABILITIES, 'webgl-scene').id).toBe('webgl-scene')
  })
})
