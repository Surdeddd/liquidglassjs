export interface LensOptions {
  band: number
  ior: number
  thickness: number
  bevelDepth?: number | undefined
}

export const DEFAULT_BEVEL_DEPTH = 0.6

export const BAND_LIMIT = 20

export const BAND_RATIO = 0.7

export const EDGE_REACH = 2.39

export const EDGE_DECAY = 0.31

export const REFERENCE_IOR = 1.5

export function domeExponent(bevelDepth: number): number {
  return 2 + 4 * bevelDepth
}

export function appleBand(halfMin: number): number {
  return Math.min(BAND_LIMIT, BAND_RATIO * Math.max(halfMin, 0))
}

export function edgeDecay(bevelDepth: number): number {
  return (EDGE_DECAY * (1.6 - bevelDepth)) / (1.6 - DEFAULT_BEVEL_DEPTH)
}

export function lensProfile(depth: number, { band, ior, bevelDepth }: LensOptions): number {
  if (depth < 0 || depth >= band || band <= 0 || ior <= 1) return 0
  const decay = edgeDecay(bevelDepth ?? DEFAULT_BEVEL_DEPTH)
  const floor = Math.exp(-1 / decay)
  const shape = (Math.exp(-depth / band / decay) - floor) / (1 - floor)
  return (EDGE_REACH * band * shape * (ior - 1)) / (REFERENCE_IOR - 1)
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
