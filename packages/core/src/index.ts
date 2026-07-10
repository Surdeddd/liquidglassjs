export { attach, detach, getInstance } from './engine'
export { colorWithOpacity } from './color'
export {
  adaptTintToTone,
  applyReducedTransparency,
  parseColor,
  readReducedTransparency,
  relativeLuminance,
  sampleTone,
  watchMedia
} from './a11y'
export type { BackdropTone } from './a11y'
export { clampMaterial, MATERIAL_DEFAULTS, MATERIAL_PRESETS, resolveMaterial } from './material'
export { NO_CAPABILITIES, probeCapabilities, resetCapabilitiesCache } from './probe'
export type { Capabilities } from './probe'
export { SurfaceTracker } from './dom-sync'
export type { SurfaceListener, SurfaceRect, SurfaceState } from './dom-sync'
export { getBackend, listBackends, registerBackend, selectBackend } from './backends/registry'
export { cssFallbackBackend } from './backends/css-fallback'
export { cssSvgBackend } from './backends/css-svg'
export { svgContentBackend } from './backends/svg-content'
export { webglSceneBackend } from './backends/webgl-scene'
export { webglOverlayBackend } from './backends/webgl-overlay'
export { GlRenderer, MAX_SHAPES, parseTint, unionRect } from './gl/renderer'
export type { GlDraw, GlRect, GlShape } from './gl/renderer'
export { Spring } from './physics/spring'
export type { SpringConfig } from './physics/spring'
export { PHYSICS_DEFAULTS, PhysicsController, resolvePhysics } from './physics/controller'
export type { PhysicsConfig, PhysicsOption } from './physics/controller'
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
