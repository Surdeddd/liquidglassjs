/** Convex-squircle lens refraction (Snell), matching iOS 26 Liquid Glass:
 *  optically flat interior, all bending concentrated in an edge band. */

export interface LensOptions {
  /** rim band width in px where bending happens */
  band: number
  /** index of refraction (glass ≈ 1.5) */
  ior: number
  /** simulated glass thickness in px — scales dome height and ray travel */
  thickness: number
}

const FOLD_CAP = 0.9 // max offset as fraction of band — rim compresses, never folds

/** Offset magnitude (px, along outward normal) for a pixel `depth` px inside the edge. */
export function lensProfile(depth: number, { band, ior, thickness }: LensOptions): number {
  if (depth < 0 || depth >= band || band <= 0 || ior <= 1) return 0
  const t = depth / band // 0 at edge → 1 at interior boundary
  const u = 1 - t
  // squircle dome h(t) = thickness * (1 - u^4)^(1/4): steep at edge, flat toward center
  // slope dh/d(depth) = thickness * u^3 * (1 - u^4)^(-3/4) / band  (clamped near the vertical edge wall)
  const slope = (thickness / band) * u * u * u * Math.pow(Math.max(1 - u * u * u * u, 1e-4), -0.75)
  const alpha = Math.atan(slope) // surface tilt
  const beta = Math.asin(Math.min(1, Math.sin(alpha) / ior)) // Snell: n1 sin a = n2 sin b
  const offset = thickness * Math.tan(alpha - beta)
  return Math.min(offset, band * FOLD_CAP)
}

/** Mild whole-body magnification: sample toward center by `magnify` per px of radius. */
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
