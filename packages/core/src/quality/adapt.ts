import type { BackdropTone, LiquidGlassOptions, LiquidGlassPreset, MaterialParams } from '../types'

export const FROSTED_DARK = {
  tint: '#1e1e1e',
  tintOpacity: 0.6,
  brightness: 0.65,
  saturation: 2.8,
  specular: 0.55
} as const satisfies Partial<MaterialParams>

export const FROST_FLIP_LUMINANCE = 0.1

const FROST_HYSTERESIS = 0.02

export function frostTone(
  appearance: BackdropTone | null,
  luminance: number | null,
  previous: BackdropTone | null
): BackdropTone {
  if (appearance === 'dark') return 'dark'
  if (luminance === null) return previous ?? 'light'
  const band = previous === 'dark' ? FROST_HYSTERESIS : previous === 'light' ? -FROST_HYSTERESIS : 0
  return luminance < FROST_FLIP_LUMINANCE + band ? 'dark' : 'light'
}

export function adaptMaterial(
  material: MaterialParams,
  preset: LiquidGlassPreset,
  tone: BackdropTone | null,
  explicit: Readonly<LiquidGlassOptions>
): MaterialParams {
  if (preset !== 'frosted' || tone !== 'dark') return material
  const adapted: MaterialParams = { ...material }
  for (const key of Object.keys(FROSTED_DARK) as (keyof typeof FROSTED_DARK)[]) {
    if (explicit[key] === undefined) Object.assign(adapted, { [key]: FROSTED_DARK[key] })
  }
  return adapted
}
