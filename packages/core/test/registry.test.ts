import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cssFallbackBackend } from '../src/backends/css-fallback'
import {
  listBackends,
  registerBackend,
  resetBackends,
  selectBackend
} from '../src/backends/registry'
import type { Backend } from '../src/backends/types'
import { NO_CAPABILITIES } from '../src/quality/probe'

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

beforeEach(() => {
  resetBackends()
})

afterEach(() => {
  resetBackends()
})

describe('registry', () => {
  it('registers the built-in backends on first use rather than at import time', () => {
    const ids = listBackends().map(backend => backend.id)
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

  it('lets a custom backend replace a built-in of the same id', () => {
    registerBackend(supportedBackend)
    expect(selectBackend(NO_CAPABILITIES, 'webgl-overlay')).toBe(supportedBackend)
  })
})

describe('selectBackend', () => {
  it('falls back to css-fallback when nothing else supports the capabilities', () => {
    resetBackends()
    registerBackend(cssFallbackBackend)
    registerBackend(unsupportedBackend)
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
