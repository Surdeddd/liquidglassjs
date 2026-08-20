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
  shadow: 0.55,
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
  shadow: [0, 1],
  frost: [0, 1]
}

export function clampMaterial(material: MaterialParams): MaterialParams {
  const result: MaterialParams = { ...material }
  for (const key of MATERIAL_KEYS) {
    const range = NUMERIC_RANGES[key]
    if (!range) continue
    const value = result[key]
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) {
      Object.assign(result, { [key]: MATERIAL_DEFAULTS[key] })
      continue
    }
    Object.assign(result, { [key]: Math.min(range[1], Math.max(range[0], numeric)) })
  }
  if (typeof result.tint !== 'string') result.tint = MATERIAL_DEFAULTS.tint
  if (result.shape !== 'squircle') result.shape = 'rounded'
  if (result.radius !== 'auto') {
    const radius = Number(result.radius)
    result.radius = Number.isFinite(radius) ? Math.max(0, radius) : MATERIAL_DEFAULTS.radius
  }
  return result
}

/**
 * Apple's material is described as three layers — highlight, shadow, illumination.
 * This is the shadow: a soft ambient cast sized from the element, plus a tight
 * contact line, which is what stops the glass reading as a hole in the page.
 */
export function glassShadowCss(shadow: number, height: number): string {
  if (shadow <= 0) return ''
  const h = Math.max(height, 1)
  const lift = (h * 0.11).toFixed(1)
  const spread = (h * 0.3).toFixed(1)
  const ambient = (0.22 * shadow).toFixed(3)
  const contact = (0.1 * shadow).toFixed(3)
  return `0 ${lift}px ${spread}px rgba(0, 0, 0, ${ambient}), 0 1px 2px rgba(0, 0, 0, ${contact})`
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
