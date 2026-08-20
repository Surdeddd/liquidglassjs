export type LiquidGlassPreset = 'clear' | 'frosted' | 'tinted'

export type BackendId =
  | 'css-fallback'
  | 'css-svg'
  | 'svg-content'
  | 'webgl-overlay'
  | 'webgl-scene'
  | 'webgpu'
  | 'inert'

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
  shadow: number
  lighting: boolean
  frost: number
  radius: number | 'auto'
  shape: LiquidGlassShape
}

type Resettable<T> = { [P in keyof T]?: T[P] | undefined }

export interface LiquidGlassOptions extends Resettable<MaterialParams> {
  preset?: LiquidGlassPreset | undefined
  backend?: BackendId | 'auto' | undefined
  /** Turns the whole material off, leaving the element exactly as authored. */
  effects?: boolean | undefined
  backdrop?: Element | string | null | undefined
  sceneImage?: string | null | undefined
  physics?: boolean | { press?: boolean; hover?: boolean; wobble?: number } | undefined
  merge?: string | null | undefined
  mergeStrength?: number | undefined
  adaptive?: boolean | undefined
  motionLight?: boolean | undefined
  quality?: LiquidGlassQuality | undefined
}

export interface LiquidGlassQuality {
  mapSide?: number
  caPasses?: 1 | 3
  maxDpr?: number
}

export type BackdropTone = 'light' | 'dark'

export interface LiquidGlassEventMap {
  backendchange: BackendId
  degrade: BackendId
  tonechange: BackdropTone | null
  press: { x: number; y: number }
  release: null
}

export type LiquidGlassEventName = keyof LiquidGlassEventMap

export interface LiquidGlassHandle {
  readonly element: Element
  readonly backend: BackendId
  readonly options: Readonly<LiquidGlassOptions>
  set(options: LiquidGlassOptions): void
  on<E extends LiquidGlassEventName>(
    event: E,
    cb: (detail: LiquidGlassEventMap[E]) => void
  ): () => void
  destroy(): void
}
