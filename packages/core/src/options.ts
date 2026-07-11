import type { LiquidGlassOptions } from './types'

const OPTION_KEY_MAP: Record<keyof LiquidGlassOptions, true> = {
  blur: true,
  saturation: true,
  brightness: true,
  tint: true,
  tintOpacity: true,
  refraction: true,
  ior: true,
  magnify: true,
  thickness: true,
  bevelWidth: true,
  bevelDepth: true,
  dispersion: true,
  specular: true,
  frost: true,
  radius: true,
  shape: true,
  preset: true,
  backend: true,
  backdrop: true,
  sceneImage: true,
  physics: true,
  merge: true,
  mergeStrength: true,
  adaptive: true,
  motionLight: true
}

export const OPTION_KEYS: ReadonlySet<string> = new Set(Object.keys(OPTION_KEY_MAP))

export function isOptionKey(key: string): key is keyof LiquidGlassOptions {
  return OPTION_KEYS.has(key)
}

export function resetMissingOptions(
  previous: LiquidGlassOptions | undefined,
  next: LiquidGlassOptions
): LiquidGlassOptions {
  if (!previous) return next
  const reset: Record<string, unknown> = {}
  for (const key of Object.keys(previous)) {
    if (!(key in next)) reset[key] = undefined
  }
  return { ...reset, ...next }
}
