import type { LiquidGlassOptions, LiquidGlassPreset, MaterialParams } from './types'

export const MATERIAL_DEFAULTS: MaterialParams = {
  blur: 8,
  saturation: 1.4,
  brightness: 1,
  tint: '#ffffff',
  tintOpacity: 0.12,
  refraction: 0.5,
  ior: 1.5,
  magnify: 0.015,
  thickness: 'auto',
  bevelWidth: 'auto',
  bevelDepth: 0.6,
  dispersion: 0.15,
  specular: 0.6,
  frost: 0,
  radius: 'auto',
  shape: 'rounded'
}

export const MATERIAL_PRESETS: Record<LiquidGlassPreset, Partial<MaterialParams>> = {
  clear: { blur: 2, tintOpacity: 0.06, frost: 0, refraction: 0.65, ior: 1.5, magnify: 0.02 },
  frosted: {
    blur: 10,
    tintOpacity: 0.14,
    frost: 0.35,
    refraction: 0.45,
    saturation: 1.6,
    brightness: 1.05
  },
  tinted: { blur: 8, tint: '#7c5cff', tintOpacity: 0.28, refraction: 0.5 }
}

const MATERIAL_KEYS = Object.keys(MATERIAL_DEFAULTS) as (keyof MaterialParams)[]

const NUMERIC_RANGES: Partial<Record<keyof MaterialParams, [number, number]>> = {
  blur: [0, 100],
  saturation: [0, 3],
  brightness: [0, 3],
  tintOpacity: [0, 1],
  refraction: [0, 1],
  ior: [1, 2.5],
  magnify: [0, 0.1],
  thickness: [0, 100],
  bevelWidth: [0, 200],
  bevelDepth: [0, 1],
  dispersion: [0, 1],
  specular: [0, 1],
  frost: [0, 1]
}

export function clampMaterial(material: MaterialParams): MaterialParams {
  const result: MaterialParams = { ...material }
  for (const key of MATERIAL_KEYS) {
    const range = NUMERIC_RANGES[key]
    const value = result[key]
    if (range && typeof value === 'number') {
      Object.assign(result, { [key]: Math.min(range[1], Math.max(range[0], value)) })
    }
  }
  if (typeof result.radius === 'number' && result.radius < 0) {
    result.radius = 0
  }
  return result
}

export function resolveMaterial(options: LiquidGlassOptions): MaterialParams {
  const preset: LiquidGlassPreset = options.preset ?? 'clear'
  const merged: MaterialParams = { ...MATERIAL_DEFAULTS, ...MATERIAL_PRESETS[preset] }
  for (const key of MATERIAL_KEYS) {
    const value = options[key]
    if (value !== undefined) {
      Object.assign(merged, { [key]: value })
    }
  }
  return clampMaterial(merged)
}
