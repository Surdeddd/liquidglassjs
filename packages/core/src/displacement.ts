import { interiorZoomOffset, lensProfile } from './optics'
import type { LensOptions } from './optics'

export interface DisplacementSpec {
  width: number
  height: number
  radius: number
  bevelWidth: number
  bevelDepth: number
  shape?: 'rounded' | 'squircle'
}

export function sdfRoundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): number {
  const hx = width / 2
  const hy = height / 2
  const r = Math.min(radius, hx, hy)
  const px = Math.abs(x - hx) - (hx - r)
  const py = Math.abs(y - hy) - (hy - r)
  const ax = Math.max(px, 0)
  const ay = Math.max(py, 0)
  const outside = Math.hypot(ax, ay)
  const inside = Math.min(Math.max(px, py), 0)
  return outside + inside - r
}

export function sdfSuperellipse(
  x: number,
  y: number,
  width: number,
  height: number,
  exponent = 4
): number {
  const hx = Math.max(width / 2, 1e-3)
  const hy = Math.max(height / 2, 1e-3)
  const px = Math.abs(x - hx) / hx
  const py = Math.abs(y - hy) / hy
  const value = Math.pow(Math.pow(px, exponent) + Math.pow(py, exponent), 1 / exponent)
  return (value - 1) * Math.min(hx, hy)
}

function surfaceSdf(x: number, y: number, spec: DisplacementSpec): number {
  if (spec.shape === 'squircle') {
    return sdfSuperellipse(x, y, spec.width, spec.height)
  }
  return sdfRoundedRect(x, y, spec.width, spec.height, spec.radius)
}

export function displacementAt(x: number, y: number, spec: DisplacementSpec): [number, number] {
  const depth = -surfaceSdf(x, y, spec)
  if (depth < 0 || depth >= spec.bevelWidth) return [0, 0]
  const t = depth / spec.bevelWidth
  const magnitude = Math.pow(1 - t, 1 + spec.bevelDepth * 2)
  const eps = 1
  const gx = surfaceSdf(x + eps, y, spec) - surfaceSdf(x - eps, y, spec)
  const gy = surfaceSdf(x, y + eps, spec) - surfaceSdf(x, y - eps, spec)
  const length = Math.hypot(gx, gy)
  if (length === 0) return [0, 0]
  return [(gx / length) * magnitude, (gy / length) * magnitude]
}

export function squircleClipPath(exponent = 4, segments = 64): string {
  const points: string[] = []
  const power = 2 / exponent
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const x = Math.sign(c) * Math.pow(Math.abs(c), power)
    const y = Math.sign(s) * Math.pow(Math.abs(s), power)
    points.push(`${(50 + x * 50).toFixed(2)}% ${(50 + y * 50).toFixed(2)}%`)
  }
  return `polygon(${points.join(', ')})`
}

const MAX_MAP_SIDE = 600

export interface MapOptions {
  width: number
  height: number
  radius: number
  shape: 'rounded' | 'squircle'
  band: number
  ior: number
  thickness: number
  magnify: number
}

interface OffsetField {
  data: Float32Array
  width: number
  height: number
  /** strongest offset converted back to element px */
  maxOffset: number
}

/** Raw per-pixel sample offsets for one map — quarter computed, mirrored. Exported for tests. */
export function computeOffsets(opts: MapOptions): OffsetField {
  const scale = Math.min(1, MAX_MAP_SIDE / Math.max(opts.width, opts.height))
  const w = Math.max(2, Math.round(opts.width * scale))
  const h = Math.max(2, Math.round(opts.height * scale))
  const sdfSpec: DisplacementSpec = {
    width: w,
    height: h,
    radius: opts.radius * scale,
    bevelWidth: 0,
    bevelDepth: 0,
    shape: opts.shape,
  }
  const band = opts.band * scale
  const lens: LensOptions = { band, ior: opts.ior, thickness: opts.thickness * scale }
  const cx = w / 2
  const cy = h / 2
  const data = new Float32Array(w * h * 2)
  let maxOffset = 0

  const halfW = Math.ceil(w / 2)
  const halfH = Math.ceil(h / 2)
  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < halfW; x++) {
      const sx = x + 0.5
      const sy = y + 0.5
      const d = surfaceSdf(sx, sy, sdfSpec)
      const depth = -d
      let dx = 0
      let dy = 0
      if (depth >= 0 && depth < band) {
        const mag = lensProfile(depth, lens)
        if (mag > 0) {
          const gx = surfaceSdf(sx + 1, sy, sdfSpec) - surfaceSdf(sx - 1, sy, sdfSpec)
          const gy = surfaceSdf(sx, sy + 1, sdfSpec) - surfaceSdf(sx, sy - 1, sdfSpec)
          const len = Math.hypot(gx, gy)
          if (len > 0) {
            dx = (gx / len) * mag
            dy = (gy / len) * mag
          }
        }
      }
      if (depth >= 0) {
        const [zx, zy] = interiorZoomOffset(sx, sy, cx, cy, opts.magnify)
        dx += zx
        dy += zy
      }
      const m = Math.max(Math.abs(dx), Math.abs(dy))
      if (m > maxOffset) maxOffset = m
      writeOffset(data, w, x, y, dx, dy)
      writeOffset(data, w, w - 1 - x, y, -dx, dy)
      writeOffset(data, w, x, h - 1 - y, dx, -dy)
      writeOffset(data, w, w - 1 - x, h - 1 - y, -dx, -dy)
    }
  }
  const elementScale = Math.max(opts.width, opts.height) / Math.max(w, h)
  return { data, width: w, height: h, maxOffset: maxOffset * elementScale }
}

function writeOffset(data: Float32Array, w: number, x: number, y: number, dx: number, dy: number): void {
  const i = (y * w + x) * 2
  data[i] = dx
  data[i + 1] = dy
}

export interface LensMap {
  url: string
  maxOffset: number
}

const lensMapCache = new Map<string, LensMap>()
const LENS_MAP_CACHE_MAX = 32

/** Normalized R/G displacement map; drive intensity via feDisplacementMap scale = 2 * maxOffset * gain. */
export function generateLensMap(opts: MapOptions): LensMap | null {
  if (typeof document === 'undefined' || opts.width < 1 || opts.height < 1) return null
  const key = `${opts.width}|${opts.height}|${opts.radius}|${opts.shape}|${opts.band}|${opts.ior}|${opts.thickness}|${opts.magnify}`
  const hit = lensMapCache.get(key)
  if (hit) return hit
  const { data, width, height, maxOffset } = computeOffsets(opts)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = context2d(canvas)
  if (!context || typeof context.createImageData !== 'function') return null
  const image = context.createImageData(width, height)
  // normalize against map-space max so the strongest pixel spans the full channel range
  const elementScale = Math.max(opts.width, opts.height) / Math.max(width, height)
  const norm = maxOffset / elementScale || 1
  for (let p = 0, i = 0; p < data.length; p += 2, i += 4) {
    image.data[i] = 128 + Math.round((data[p]! / norm) * 127)
    image.data[i + 1] = 128 + Math.round((data[p + 1]! / norm) * 127)
    image.data[i + 2] = 128 // B reserved — specular lives in the bezel overlay
    image.data[i + 3] = 255
  }
  context.putImageData(image, 0, 0)
  const entry: LensMap = { url: canvas.toDataURL('image/png'), maxOffset }
  if (lensMapCache.size >= LENS_MAP_CACHE_MAX) {
    const oldest = lensMapCache.keys().next().value
    if (oldest !== undefined) lensMapCache.delete(oldest)
  }
  lensMapCache.set(key, entry)
  return entry
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d')
  } catch {
    return null
  }
}

export function generateDisplacementMap(spec: DisplacementSpec): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || spec.width < 1 || spec.height < 1) return null
  const scale = Math.min(1, MAX_MAP_SIDE / Math.max(spec.width, spec.height))
  const width = Math.max(1, Math.round(spec.width * scale))
  const height = Math.max(1, Math.round(spec.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = context2d(canvas)
  if (!context || typeof context.createImageData !== 'function') return null
  const image = context.createImageData(width, height)
  const data = image.data
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const [dx, dy] = displacementAt((px + 0.5) / scale, (py + 0.5) / scale, spec)
      const i = (py * width + px) * 4
      data[i] = 128 + Math.round(dx * 127)
      data[i + 1] = 128 + Math.round(dy * 127)
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}
