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

type Resettable<T> = { [P in keyof T]?: T[P] | undefined }

export interface LiquidGlassOptions extends Resettable<MaterialParams> {
  preset?: LiquidGlassPreset | undefined
  backend?: BackendId | 'auto' | undefined
  backdrop?: Element | string | null | undefined
  sceneImage?: string | null | undefined
  physics?: boolean | { press?: boolean; hover?: boolean; wobble?: number } | undefined
  merge?: string | null | undefined
  mergeStrength?: number | undefined
  adaptive?: boolean | undefined
  motionLight?: boolean | undefined
}

export type LiquidGlassEventName = 'backendchange' | 'tonechange' | 'press' | 'release' | 'degrade'

export interface LiquidGlassHandle {
  readonly element: Element
  readonly backend: BackendId
  set(options: LiquidGlassOptions): void
  on(event: LiquidGlassEventName, cb: (detail: string) => void): () => void
  destroy(): void
}
