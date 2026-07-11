export interface LensOptions {
  band: number
  ior: number
  thickness: number
}

const FOLD_CAP = 0.9

export function lensProfile(depth: number, { band, ior, thickness }: LensOptions): number {
  if (depth < 0 || depth >= band || band <= 0 || ior <= 1) return 0
  const t = depth / band
  const u = 1 - t
  const slope = (thickness / band) * u * u * u * Math.pow(Math.max(1 - u * u * u * u, 1e-4), -0.75)
  const alpha = Math.atan(slope)
  const beta = Math.asin(Math.min(1, Math.sin(alpha) / ior))
  const offset = thickness * Math.tan(alpha - beta)
  return Math.min(offset, band * FOLD_CAP)
}

export function interiorZoomOffset(
  px: number,
  py: number,
  cx: number,
  cy: number,
  magnify: number,
): [number, number] {
  if (magnify === 0) return [0, 0]
  return [(px - cx) * -magnify || 0, (py - cy) * -magnify || 0]
}
