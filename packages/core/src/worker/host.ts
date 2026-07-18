import workerSource from 'virtual:lens-worker'
import {
  cacheLensMap,
  cachedLensMap,
  encodeLensMap,
  generateLensMap,
  lensMapKey,
  type LensMap,
  type LensPixels,
  type MapOptions
} from '../displacement'
import { getQuality } from '../quality/profile'

interface PendingRequest {
  key: string
  opts: MapOptions
  onReady: (map: LensMap) => void
}

let worker: Worker | null = null
let workerBroken = false
let nextId = 0
const pending = new Map<number, PendingRequest>()

function ensureWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined' || typeof URL === 'undefined') return null
  if (worker) return worker
  if (!workerSource || typeof Blob === 'undefined') return null
  try {
    const blob = new Blob([workerSource], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    worker = new Worker(url)
    URL.revokeObjectURL(url)
    worker.onmessage = event => {
      const { id, pixels, width, height, maxOffset } = event.data as { id: number } & LensPixels
      const request = pending.get(id)
      if (!request) return
      pending.delete(id)
      const entry = encodeLensMap({ pixels, width, height, maxOffset })
      cacheLensMap(request.key, entry)
      request.onReady(entry)
    }
    worker.onerror = () => {
      failPending()
    }
    return worker
  } catch {
    workerBroken = true
    return null
  }
}

function failPending(): void {
  workerBroken = true
  worker?.terminate()
  worker = null
  const requests = [...pending.values()]
  pending.clear()
  for (const request of requests) {
    const map = cachedLensMap(request.key) ?? generateLensMap(request.opts)
    if (map) request.onReady(map)
  }
}

export function requestLensMap(opts: MapOptions, onReady: (map: LensMap) => void): void {
  if (opts.width < 1 || opts.height < 1) return
  const key = lensMapKey(opts)
  const hit = cachedLensMap(key)
  if (hit) {
    onReady(hit)
    return
  }
  const active = ensureWorker()
  if (!active) {
    const map = generateLensMap(opts)
    if (map) onReady(map)
    return
  }
  const id = ++nextId
  pending.set(id, { key, opts, onReady })
  try {
    active.postMessage({ id, opts, mapSide: getQuality().mapSide })
  } catch {
    pending.delete(id)
    failPending()
    const map = generateLensMap(opts)
    if (map) onReady(map)
  }
}

export function resetLensWorker(): void {
  worker?.terminate()
  worker = null
  workerBroken = false
  pending.clear()
}
