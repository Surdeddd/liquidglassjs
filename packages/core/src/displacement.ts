import {
  DEFAULT_BEVEL_DEPTH,
  domeExponent,
  interiorZoomOffsetX,
  interiorZoomOffsetY,
  lensProfile
} from './optics'
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

/** Texels the bevel band is guaranteed, so the bend is resolvable rather than interpolated. */
const MIN_BAND_TEXELS = 8

/** Nothing is worth a map wider than this; the worker and the PNG encode both pay for it. */
const MAX_MAP_SIDE = 2048

/** How far the band floor may overrun the tier's area budget before it is pulled back. */
const MAX_BUDGET_OVERRUN = 3

export interface MapOptions {
  width: number
  height: number
  radius: number
  shape: 'rounded' | 'squircle'
  band: number
  ior: number
  thickness: number
  bevelDepth?: number | undefined
  magnify: number
  mapSide?: number | undefined
}

interface OffsetField {
  data: Float32Array
  /** The dome profile, 0 at the outer edge rising to 1 across the flat interior. */
  dome: Uint8ClampedArray
  width: number
  height: number
  padX: number
  padY: number
  scale: number
  maxOffset: number
}

/**
 * The same dome the refraction is derived from, as a height rather than a slope —
 * this is what a lighting primitive needs to shade a bevel.
 */
export function domeHeight(depth: number, band: number, bevelDepth = DEFAULT_BEVEL_DEPTH): number {
  if (depth < 0) return 0
  if (band <= 0 || depth >= band) return 1
  const n = domeExponent(bevelDepth)
  const u = 1 - depth / band
  return Math.pow(Math.max(1 - Math.pow(u, n), 0), 1 / n)
}

export function computeOffsets(opts: MapOptions): OffsetField {
  const side = opts.mapSide ?? getQuality().mapSide
  const budget = side * side
  let scale = Math.min(1, Math.sqrt(budget / Math.max(opts.width * opts.height, 1)))
  if (opts.band > 0) {
    scale = Math.min(1, Math.max(scale, MIN_BAND_TEXELS / opts.band))
  }
  const longest = Math.max(opts.width, opts.height) * (1 + MAP_PAD * 2)
  scale = Math.min(scale, MAX_MAP_SIDE / Math.max(longest, 1))
  const spread = (1 + MAP_PAD * 2) ** 2
  const texels = opts.width * opts.height * scale * scale * spread
  const ceiling = budget * MAX_BUDGET_OVERRUN
  if (texels > ceiling) scale *= Math.sqrt(ceiling / texels)
  const ew = opts.width * scale
  const eh = opts.height * scale
  const padX = Math.round(ew * MAP_PAD)
  const padY = Math.round(eh * MAP_PAD)
  const w = Math.max(2, Math.round(ew) + padX * 2)
  const h = Math.max(2, Math.round(eh) + padY * 2)
  const bevelDepth = opts.bevelDepth ?? DEFAULT_BEVEL_DEPTH
  const sdfSpec: DisplacementSpec = {
    width: Math.round(ew),
    height: Math.round(eh),
    radius: opts.radius * scale,
    bevelWidth: 0,
    bevelDepth,
    shape: opts.shape,
  }
  const band = opts.band * scale
  const lens: LensOptions = { band, ior: opts.ior, thickness: opts.thickness * scale, bevelDepth }
  const cx = sdfSpec.width / 2
  const cy = sdfSpec.height / 2
  const data = new Float32Array(w * h * 2)
  const dome = new Uint8ClampedArray(w * h)
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
        dx += interiorZoomOffsetX(sx, cx, opts.magnify)
        dy += interiorZoomOffsetY(sy, cy, opts.magnify)
      }
      const m = Math.max(Math.abs(dx), Math.abs(dy))
      if (m > maxOffset) maxOffset = m
      writeOffset(data, w, x, y, dx, dy)
      writeOffset(data, w, w - 1 - x, y, -dx, dy)
      writeOffset(data, w, x, h - 1 - y, dx, -dy)
      writeOffset(data, w, w - 1 - x, h - 1 - y, -dx, -dy)
      const lit = depth < 0 ? 0 : 1 + Math.round(254 * domeHeight(depth, band, bevelDepth))
      dome[y * w + x] = lit
      dome[y * w + (w - 1 - x)] = lit
      dome[(h - 1 - y) * w + x] = lit
      dome[(h - 1 - y) * w + (w - 1 - x)] = lit
    }
  }
  return { data, dome, width: w, height: h, padX, padY, scale, maxOffset: maxOffset / (scale || 1) }
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

const SIZE_BUCKET = 8
const DETAIL_BUCKET = 0.5
const DEPTH_BUCKET = 0.05

function bucket(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function lensMapKey(opts: MapOptions): string {
  const w = bucket(opts.width, SIZE_BUCKET)
  const h = bucket(opts.height, SIZE_BUCKET)
  const radius = bucket(opts.radius, DETAIL_BUCKET)
  const band = bucket(opts.band, DETAIL_BUCKET)
  const thickness = bucket(opts.thickness, DETAIL_BUCKET)
  const bevelDepth = bucket(opts.bevelDepth ?? DEFAULT_BEVEL_DEPTH, DEPTH_BUCKET)
  return `${w}|${h}|${radius}|${opts.shape}|${band}|${opts.ior}|${thickness}|${bevelDepth}|${opts.magnify}`
}

export function renderLensPixels(opts: MapOptions): LensPixels {
  const { data, dome, width, height, scale, maxOffset } = computeOffsets(opts)
  const pixels = new Uint8ClampedArray(width * height * 4)
  const norm = maxOffset * scale || 1
  for (let p = 0, i = 0; p < data.length; p += 2, i += 4) {
    pixels[i] = 128 + Math.round((data[p]! / norm) * 127)
    pixels[i + 1] = 128 + Math.round((data[p + 1]! / norm) * 127)
    pixels[i + 2] = dome[p >> 1] ?? 128
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
  lensMapCache.delete(key)
  if (lensMapCache.size >= LENS_MAP_CACHE_MAX) {
    const oldest = lensMapCache.keys().next().value
    if (oldest !== undefined) lensMapCache.delete(oldest)
  }
  lensMapCache.set(key, entry)
}

export function cachedLensMap(key: string): LensMap | undefined {
  const hit = lensMapCache.get(key)
  if (hit === undefined) return undefined
  lensMapCache.delete(key)
  lensMapCache.set(key, hit)
  return hit
}

export function generateLensMap(opts: MapOptions): LensMap | null {
  if (opts.width < 1 || opts.height < 1) return null
  const key = lensMapKey(opts)
  const hit = cachedLensMap(key)
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

