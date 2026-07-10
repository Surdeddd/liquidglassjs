export type LiquidGlassPreset = 'clear' | 'frosted' | 'tinted'

export type BackendId =
  | 'css-fallback'
  | 'css-svg'
  | 'svg-content'
  | 'webgl-overlay'
  | 'webgl-scene'
  | 'webgpu'

export interface MaterialParams {
  blur: number
  saturation: number
  brightness: number
  tint: string
  tintOpacity: number
  refraction: number
  thickness: number
  bevelWidth: number
  bevelDepth: number
  dispersion: number
  specular: number
  frost: number
  radius: number | 'auto'
}

export interface LiquidGlassOptions extends Partial<MaterialParams> {
  preset?: LiquidGlassPreset
  backend?: BackendId | 'auto'
  backdrop?: Element | string | null
  sceneImage?: string | null
  physics?: boolean | { press?: boolean; hover?: boolean; wobble?: number }
}

export interface LiquidGlassHandle {
  readonly element: Element
  readonly backend: BackendId
  set(options: LiquidGlassOptions): void
  destroy(): void
}
