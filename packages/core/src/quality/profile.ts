import { frameNow, onFrame, onViewport } from '../runtime/scheduler'

export interface QualityProfile {
  mapSide: number
  caPasses: 1 | 3
  maxDpr: number
  snapshotThrottleMs: number
  overlayZIndex: number
}

const OVERLAY_Z_INDEX = 2147483000

const TIERS: Record<'high' | 'mid' | 'low', QualityProfile> = {
  high: { mapSide: 600, caPasses: 3, maxDpr: 2, snapshotThrottleMs: 250, overlayZIndex: OVERLAY_Z_INDEX },
  mid: { mapSide: 480, caPasses: 3, maxDpr: 2, snapshotThrottleMs: 350, overlayZIndex: OVERLAY_Z_INDEX },
  low: { mapSide: 320, caPasses: 1, maxDpr: 1.5, snapshotThrottleMs: 500, overlayZIndex: OVERLAY_Z_INDEX }
}

export function deviceTier(): 'high' | 'mid' | 'low' {
  if (typeof navigator === 'undefined') return 'mid'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 0
  const memory = nav.deviceMemory ?? Infinity
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1
  if ((cores > 0 && cores <= 4) || memory <= 4) return 'low'
  if (cores >= 8 && dpr >= 2) return 'high'
  return 'mid'
}

let overrides: Partial<QualityProfile> = {}
let tier: 'high' | 'mid' | 'low' | null = null
let base: QualityProfile | null = null
let cachedDpr = 0

export function getQuality(local?: Partial<QualityProfile> | null): QualityProfile {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1
  if (!base || dpr !== cachedDpr) {
    cachedDpr = dpr
    tier = deviceTier()
    base = { ...TIERS[tier], ...overrides }
  }
  return local ? { ...base, ...local } : base
}

export function configure(next: Partial<QualityProfile>): void {
  overrides = { ...overrides, ...next }
  base = null
}

export function resetQuality(): void {
  overrides = {}
  tier = null
  base = null
  cachedDpr = 0
  windowSamples.length = 0
  windowSeconds = 0
  slowWindows = 0
  fired = false
}

const WINDOW_SIZE = 90
const WINDOW_SECONDS = 1.5
const MIN_WINDOW_SAMPLES = 8
const SLOW_FPS = 45
const SLOW_WINDOWS_NEEDED = 3

const windowSamples: number[] = []
let windowSeconds = 0
let slowWindows = 0
let fired = false
let degradeCbs: Array<() => void> = []
let offWatch: (() => void) | null = null

const ABSURD_GAP_S = 4

export function _pushFrameSample(dt: number): void {
  if (fired || dt <= 0 || dt > ABSURD_GAP_S) return
  windowSamples.push(1 / dt)
  windowSeconds += dt
  const full = windowSamples.length >= WINDOW_SIZE
  const timedOut = windowSeconds >= WINDOW_SECONDS && windowSamples.length >= MIN_WINDOW_SAMPLES
  if (!full && !timedOut) return
  const sorted = [...windowSamples].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 60
  windowSamples.length = 0
  windowSeconds = 0
  if (median < SLOW_FPS) {
    slowWindows += 1
    if (slowWindows >= SLOW_WINDOWS_NEEDED) {
      fired = true
      const cbs = [...degradeCbs]
      degradeCbs = []
      offWatch?.()
      offWatch = null
      offBurst?.()
      offBurst = null
      for (const cb of cbs) cb()
    }
  } else {
    slowWindows = 0
  }
}

let offBurst: (() => void) | null = null
let burstSeconds = 0
let burstLast = 0

function stopBurst(): void {
  offBurst?.()
  offBurst = null
  burstSeconds = 0
  burstLast = 0
  windowSamples.length = 0
  windowSeconds = 0
}

function startBurst(): void {
  if (fired || offBurst || typeof requestAnimationFrame !== 'function') return
  burstSeconds = 0
  burstLast = 0
  offBurst = onFrame(() => {
    const time = frameNow()
    const real = burstLast ? (time - burstLast) / 1000 : 0
    burstLast = time
    if (real > 0) {
      burstSeconds += real
      _pushFrameSample(real)
    }
    if (fired || burstSeconds >= WINDOW_SECONDS * 1.5) stopBurst()
  })
}

export function watchFps(onDegrade: () => void): () => void {
  if (fired) return () => {}
  degradeCbs.push(onDegrade)
  if (!offWatch) {
    offWatch = onViewport(() => startBurst())
  }
  return () => {
    degradeCbs = degradeCbs.filter(cb => cb !== onDegrade)
    if (degradeCbs.length === 0) {
      stopBurst()
      offWatch?.()
      offWatch = null
    }
  }
}
