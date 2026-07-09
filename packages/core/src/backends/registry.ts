import type { Capabilities } from '../probe'
import type { BackendId } from '../types'
import type { Backend } from './types'

const backends = new Map<BackendId, Backend>()

export function registerBackend(backend: Backend): void {
  backends.set(backend.id, backend)
}

export function getBackend(id: BackendId): Backend | undefined {
  return backends.get(id)
}

export function listBackends(): Backend[] {
  return [...backends.values()].sort((a, b) => b.priority - a.priority)
}

export function selectBackend(capabilities: Capabilities, preferred: BackendId | 'auto'): Backend {
  if (preferred !== 'auto') {
    const exact = backends.get(preferred)
    if (exact && exact.isSupported(capabilities)) return exact
  }
  for (const backend of listBackends()) {
    if (backend.isSupported(capabilities)) return backend
  }
  throw new Error('liquidglass: no supported backend registered')
}
