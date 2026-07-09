export { attach, detach, getInstance } from './engine'
export { colorWithOpacity } from './color'
export { clampMaterial, MATERIAL_DEFAULTS, MATERIAL_PRESETS, resolveMaterial } from './material'
export { NO_CAPABILITIES, probeCapabilities, resetCapabilitiesCache } from './probe'
export type { Capabilities } from './probe'
export { SurfaceTracker } from './dom-sync'
export type { SurfaceListener, SurfaceRect, SurfaceState } from './dom-sync'
export { getBackend, listBackends, registerBackend, selectBackend } from './backends/registry'
export { cssFallbackBackend } from './backends/css-fallback'
export { cssSvgBackend } from './backends/css-svg'
export { displacementAt, generateDisplacementMap, sdfRoundedRect } from './displacement'
export type { DisplacementSpec } from './displacement'
export type { Backend, BackendInstance, BackendSurface } from './backends/types'
export type {
  BackendId,
  LiquidGlassHandle,
  LiquidGlassOptions,
  LiquidGlassPreset,
  MaterialParams
} from './types'

export const VERSION = '0.0.0'
