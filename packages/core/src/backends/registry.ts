import type { Capabilities } from '../quality/probe'
import type { BackendId } from '../types'
import type { Backend } from './types'
import { cssFallbackBackend } from './css-fallback'
import { cssSvgBackend } from './css-svg'
import { svgContentBackend } from './svg-content'
import { webglOverlayBackend } from './webgl-overlay'
import { webglSceneBackend } from './webgl-scene'

const backends = new Map<BackendId, Backend>()

let builtinsReady = false

function ensureBuiltinBackends(): void {
  if (builtinsReady) return
  builtinsReady = true
  const builtins = [
    cssFallbackBackend,
    cssSvgBackend,
    svgContentBackend,
    webglSceneBackend,
    webglOverlayBackend
  ]
  for (const backend of builtins) {
    if (!backends.has(backend.id)) backends.set(backend.id, backend)
  }
}

export function registerBackend(backend: Backend): void {
  ensureBuiltinBackends()
  backends.set(backend.id, backend)
}

export function resetBackends(): void {
  backends.clear()
  builtinsReady = false
}

export function getBackend(id: BackendId): Backend | undefined {
  ensureBuiltinBackends()
  return backends.get(id)
}

export function listBackends(): Backend[] {
  ensureBuiltinBackends()
  return [...backends.values()].sort((a, b) => b.priority - a.priority)
}

export function selectBackend(capabilities: Capabilities, preferred: BackendId | 'auto'): Backend {
  ensureBuiltinBackends()
  if (preferred !== 'auto') {
    const exact = backends.get(preferred)
    if (exact && exact.isSupported(capabilities)) return exact
  }
  for (const backend of listBackends()) {
    if (backend.autoSelect === false) continue
    if (backend.isSupported(capabilities)) return backend
  }
  throw new Error('liquidglass: no supported backend registered')
}
