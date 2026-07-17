import { onFrame } from './scheduler'

export interface QualityProfile {
  mapSide: number
  caPasses: 1 | 3
  maxDpr: number
  snapshotThrottleMs: number
}

const TIERS: Record<'high' | 'mid' | 'low', QualityProfile> = {
  high: { mapSide: 600, caPasses: 3, maxDpr: 2, snapshotThrottleMs: 250 },
  mid: { mapSide: 480, caPasses: 3, maxDpr: 2, snapshotThrottleMs: 350 },
  low: { mapSide: 320, caPasses: 1, maxDpr: 1.5, snapshotThrottleMs: 500 }
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

export function getQuality(): QualityProfile {
  return { ...TIERS[deviceTier()], ...overrides }
}

export function configure(next: Partial<QualityProfile>): void {
  overrides = { ...overrides, ...next }
}

export function resetQuality(): void {
  overrides = {}
  windowSamples.length = 0
  slowWindows = 0
  fired = false
}

const WINDOW_SIZE = 90
const SLOW_FPS = 45
const SLOW_WINDOWS_NEEDED = 3

const windowSamples: number[] = []
let slowWindows = 0
let fired = false
let degradeCbs: Array<() => void> = []
let offWatch: (() => void) | null = null

export function _pushFrameSample(dt: number): void {
  if (fired || dt <= 0) return
  windowSamples.push(1 / dt)
  if (windowSamples.length < WINDOW_SIZE) return
  const sorted = [...windowSamples].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 60
  windowSamples.length = 0
  if (median < SLOW_FPS) {
    slowWindows += 1
    if (slowWindows >= SLOW_WINDOWS_NEEDED) {
      fired = true
      const cbs = [...degradeCbs]
      degradeCbs = []
      offWatch?.()
      offWatch = null
      for (const cb of cbs) cb()
    }
  } else {
    slowWindows = 0
  }
}

export function watchFps(onDegrade: () => void): () => void {
  if (fired) return () => {}
  degradeCbs.push(onDegrade)
  if (!offWatch) {
    offWatch = onFrame(dt => _pushFrameSample(dt))
  }
  return () => {
    degradeCbs = degradeCbs.filter(cb => cb !== onDegrade)
    if (degradeCbs.length === 0) {
      offWatch?.()
      offWatch = null
    }
  }
}
