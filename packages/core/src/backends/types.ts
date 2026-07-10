import type { SurfaceState } from '../dom-sync'
import type { Capabilities } from '../probe'
import type { BackendId, LiquidGlassPreset, MaterialParams } from '../types'

export interface BackendSurface {
  readonly element: Element
  preset: LiquidGlassPreset
  material: MaterialParams
  state: SurfaceState
  backdrop: Element | null
  sceneImage: string | null
  merge?: string | null
  mergeStrength?: number | null
}

export interface BackendInstance {
  update(surface: BackendSurface): void
  sync(surface: BackendSurface): void
  destroy(): void
}

export interface Backend {
  readonly id: BackendId
  readonly priority: number
  readonly autoSelect?: boolean
  isSupported(capabilities: Capabilities): boolean
  mount(surface: BackendSurface): BackendInstance
}
