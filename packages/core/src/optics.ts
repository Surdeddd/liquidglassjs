export interface LensOptions {
  band: number
  ior: number
  thickness: number
  bevelDepth?: number | undefined
}

const FOLD_CAP = 0.9

export const DEFAULT_BEVEL_DEPTH = 0.6

/**
 * The bevel is a superellipse of revolution: height rises as (1 - u^n)^(1/n) across the
 * band. n = 2 is a circular roll-off; larger n holds the surface flat and turns down late.
 */
export function domeExponent(bevelDepth: number): number {
  return 2 + 4 * bevelDepth
}

export function lensProfile(
  depth: number,
  { band, ior, thickness, bevelDepth }: LensOptions
): number {
  if (depth < 0 || depth >= band || band <= 0 || ior <= 1) return 0
  const n = domeExponent(bevelDepth ?? DEFAULT_BEVEL_DEPTH)
  const u = 1 - depth / band
  const slope =
    (thickness / band) *
    Math.pow(u, n - 1) *
    Math.pow(Math.max(1 - Math.pow(u, n), 1e-4), (1 - n) / n)
  const alpha = Math.atan(slope)
  const beta = Math.asin(Math.min(1, Math.sin(alpha) / ior))
  const offset = thickness * Math.tan(alpha - beta)
  return Math.min(offset, band * FOLD_CAP)
}

export function interiorZoomOffsetX(px: number, cx: number, magnify: number): number {
  if (magnify === 0) return 0
  return (px - cx) * -magnify || 0
}

export function interiorZoomOffsetY(py: number, cy: number, magnify: number): number {
  if (magnify === 0) return 0
  return (py - cy) * -magnify || 0
}

export function interiorZoomOffset(
  px: number,
  py: number,
  cx: number,
  cy: number,
  magnify: number,
): [number, number] {
  return [interiorZoomOffsetX(px, cx, magnify), interiorZoomOffsetY(py, cy, magnify)]
}
