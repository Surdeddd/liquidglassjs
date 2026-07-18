import { interiorZoomOffset, lensProfile } from './optics'
import { getQuality } from './quality/profile'
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

export const MAP_PAD = 0.2

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
  padX: number
  padY: number
  scale: number
  maxOffset: number
}

export function computeOffsets(opts: MapOptions): OffsetField {
  const scale = Math.min(
    1,
    getQuality().mapSide / (Math.max(opts.width, opts.height) * (1 + MAP_PAD * 2))
  )
  const ew = opts.width * scale
  const eh = opts.height * scale
  const padX = Math.round(ew * MAP_PAD)
  const padY = Math.round(eh * MAP_PAD)
  const w = Math.max(2, Math.round(ew) + padX * 2)
  const h = Math.max(2, Math.round(eh) + padY * 2)
  const sdfSpec: DisplacementSpec = {
    width: Math.round(ew),
    height: Math.round(eh),
    radius: opts.radius * scale,
    bevelWidth: 0,
    bevelDepth: 0,
    shape: opts.shape,
  }
  const band = opts.band * scale
  const lens: LensOptions = { band, ior: opts.ior, thickness: opts.thickness * scale }
  const cx = sdfSpec.width / 2
  const cy = sdfSpec.height / 2
  const data = new Float32Array(w * h * 2)
  let maxOffset = 0

  const halfW = Math.ceil(w / 2)
  const halfH = Math.ceil(h / 2)
  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < halfW; x++) {
      const sx = x + 0.5 - padX
      const sy = y + 0.5 - padY
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
  return { data, width: w, height: h, padX, padY, scale, maxOffset: maxOffset / (scale || 1) }
}

function writeOffset(data: Float32Array, w: number, x: number, y: number, dx: number, dy: number): void {
  const i = (y * w + x) * 2
  data[i] = dx || 0
  data[i + 1] = dy || 0
}

export interface LensMap {
  url: string | null
  maxOffset: number
}

export function resolveRadiusPx(
  radius: number | 'auto',
  element: Element,
  width: number,
  height: number
): number {
  const half = Math.min(width, height) / 2
  if (typeof radius === 'number') return Math.max(0, Math.min(radius, half))
  if (
    typeof HTMLElement !== 'undefined' &&
    element instanceof HTMLElement &&
    typeof getComputedStyle === 'function'
  ) {
    const raw = getComputedStyle(element).borderRadius.split(' ')[0] ?? ''
    const parsed = parseFloat(raw)
    if (Number.isFinite(parsed)) {
      const px = raw.endsWith('%') ? (parsed / 100) * Math.min(width, height) : parsed
      return Math.max(0, Math.min(px, half))
    }
  }
  return 0
}

export function resolveThicknessPx(
  thickness: number | 'auto',
  width: number,
  height: number
): number {
  if (typeof thickness === 'number') return Math.max(0, Math.min(thickness, 100))
  const factor = Math.min(1.6, Math.max(0.85, Math.sqrt(width * height) / 260))
  return 12 * factor
}

const MIN_AUTO_BAND = 12

export function resolveBandPx(
  bevelWidth: number | 'auto',
  radiusPx: number,
  width: number,
  height: number
): number {
  if (typeof bevelWidth === 'number') return bevelWidth
  const halfMin = Math.min(width, height) / 2
  return Math.min(Math.max(radiusPx, MIN_AUTO_BAND), halfMin)
}

const lensMapCache = new Map<string, LensMap>()
const LENS_MAP_CACHE_MAX = 32

export interface LensPixels {
  pixels: Uint8ClampedArray
  width: number
  height: number
  maxOffset: number
}

export function lensMapKey(opts: MapOptions): string {
  return `${opts.width}|${opts.height}|${opts.radius}|${opts.shape}|${opts.band}|${opts.ior}|${opts.thickness}|${opts.magnify}`
}

export function renderLensPixels(opts: MapOptions): LensPixels {
  const { data, width, height, scale, maxOffset } = computeOffsets(opts)
  const pixels = new Uint8ClampedArray(width * height * 4)
  const norm = maxOffset * scale || 1
  for (let p = 0, i = 0; p < data.length; p += 2, i += 4) {
    pixels[i] = 128 + Math.round((data[p]! / norm) * 127)
    pixels[i + 1] = 128 + Math.round((data[p + 1]! / norm) * 127)
    pixels[i + 2] = 128
    pixels[i + 3] = 255
  }
  return { pixels, width, height, maxOffset }
}

export function encodeLensMap(rendered: LensPixels): LensMap {
  const entry: LensMap = { url: null, maxOffset: rendered.maxOffset }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = rendered.width
    canvas.height = rendered.height
    const context = context2d(canvas)
    if (context && typeof context.createImageData === 'function') {
      const image = context.createImageData(rendered.width, rendered.height)
      image.data.set(rendered.pixels)
      context.putImageData(image, 0, 0)
      entry.url = canvas.toDataURL('image/png')
    }
  }
  return entry
}

export function cacheLensMap(key: string, entry: LensMap): void {
  if (lensMapCache.size >= LENS_MAP_CACHE_MAX) {
    const oldest = lensMapCache.keys().next().value
    if (oldest !== undefined) lensMapCache.delete(oldest)
  }
  lensMapCache.set(key, entry)
}

export function cachedLensMap(key: string): LensMap | undefined {
  return lensMapCache.get(key)
}

export function generateLensMap(opts: MapOptions): LensMap | null {
  if (opts.width < 1 || opts.height < 1) return null
  const key = lensMapKey(opts)
  const hit = lensMapCache.get(key)
  if (hit) return hit
  const entry = encodeLensMap(renderLensPixels(opts))
  cacheLensMap(key, entry)
  return entry
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d')
  } catch {
    return null
  }
}

