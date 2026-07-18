export { attach, detach, getInstance } from './engine'
export { autoAttach } from './auto'
export { createEmitter } from './runtime/events'
export type { LiquidGlassEvent, LiquidGlassEventCb } from './runtime/events'
export { isOptionKey, OPTION_KEYS, resetMissingOptions } from './options'
export { frameNow, onFrame, onViewport } from './runtime/scheduler'
export { configure, deviceTier, getQuality, resetQuality, watchFps } from './quality/profile'
export type { QualityProfile } from './quality/profile'
export { colorWithOpacity } from './color'
export {
  adaptTintToTone,
  applyReducedTransparency,
  parseColor,
  readReducedTransparency,
  relativeLuminance,
  sampleTone,
  watchMedia
} from './quality/a11y'
export type { BackdropTone } from './quality/a11y'
export { clampMaterial, MATERIAL_DEFAULTS, MATERIAL_PRESETS, resolveMaterial } from './material'
export { NO_CAPABILITIES, probeCapabilities, resetCapabilitiesCache } from './quality/probe'
export type { Capabilities } from './quality/probe'
export { SurfaceTracker } from './runtime/dom-sync'
export type { SurfaceListener, SurfaceRect, SurfaceState } from './runtime/dom-sync'
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
export { mountScrollEdge } from './fx/scroll-edge'
export type { ScrollEdgeHandle, ScrollEdgeOptions } from './fx/scroll-edge'
export { backdropLuminance, buildLuminanceGrid, getLuminanceGrid, setLuminanceGrid } from './quality/contrast'
export type { LuminanceGrid } from './quality/contrast'
export { morphGlass } from './fx/morph'
export type { MorphOptions } from './fx/morph'
export type { Backend, BackendInstance, BackendSurface } from './backends/types'
export type {
  BackendId,
  LiquidGlassEventName,
  LiquidGlassHandle,
  LiquidGlassOptions,
  LiquidGlassPreset,
  LiquidGlassShape,
  MaterialParams
} from './types'

declare const __LG_VERSION__: string

export const VERSION = typeof __LG_VERSION__ === 'string' ? __LG_VERSION__ : '0.0.0-dev'
