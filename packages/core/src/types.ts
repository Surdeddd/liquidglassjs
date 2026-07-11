export type LiquidGlassPreset = 'clear' | 'frosted' | 'tinted'

export type BackendId =
  | 'css-fallback'
  | 'css-svg'
  | 'svg-content'
  | 'webgl-overlay'
  | 'webgl-scene'
  | 'webgpu'

export type LiquidGlassShape = 'rounded' | 'squircle'

export interface MaterialParams {
  blur: number
  saturation: number
  brightness: number
  tint: string
  tintOpacity: number
  refraction: number
  ior: number
  magnify: number
  thickness: number | 'auto'
  bevelWidth: number | 'auto'
  bevelDepth: number
  dispersion: number
  specular: number
  frost: number
  radius: number | 'auto'
  shape: LiquidGlassShape
}

export interface LiquidGlassOptions extends Partial<MaterialParams> {
  preset?: LiquidGlassPreset
  backend?: BackendId | 'auto'
  backdrop?: Element | string | null
  sceneImage?: string | null
  physics?: boolean | { press?: boolean; hover?: boolean; wobble?: number }
  merge?: string | null
  mergeStrength?: number
  adaptive?: boolean
  motionLight?: boolean
}

export interface LiquidGlassHandle {
  readonly element: Element
  readonly backend: BackendId
  set(options: LiquidGlassOptions): void
  destroy(): void
}
