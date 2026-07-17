export { attach, detach, getInstance } from './engine'
export { isOptionKey, OPTION_KEYS, resetMissingOptions } from './options'
export { frameNow, onFrame, onViewport } from './scheduler'
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
export {
  computeOffsets,
  generateLensMap,
  resolveBandPx,
  sdfRoundedRect,
  sdfSuperellipse,
  squircleClipPath
} from './displacement'
export type { DisplacementSpec, LensMap, MapOptions } from './displacement'
export { interiorZoomOffset, lensProfile } from './optics'
export type { LensOptions } from './optics'
export { mountScrollEdge } from './scroll-edge'
export type { ScrollEdgeHandle, ScrollEdgeOptions } from './scroll-edge'
export { backdropLuminance, buildLuminanceGrid, getLuminanceGrid, setLuminanceGrid } from './contrast'
export type { LuminanceGrid } from './contrast'
export { morphGlass } from './morph'
export type { MorphOptions } from './morph'
export type { Backend, BackendInstance, BackendSurface } from './backends/types'
export type {
  BackendId,
  LiquidGlassHandle,
  LiquidGlassOptions,
  LiquidGlassPreset,
  LiquidGlassShape,
  MaterialParams
} from './types'

declare const __LG_VERSION__: string

export const VERSION = typeof __LG_VERSION__ === 'string' ? __LG_VERSION__ : '0.0.0-dev'
