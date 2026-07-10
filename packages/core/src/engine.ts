import {
  adaptTintToTone,
  applyReducedTransparency,
  readReducedTransparency,
  sampleTone,
  watchMedia,
  type BackdropTone
} from './a11y'
import { cssFallbackBackend } from './backends/css-fallback'
import { cssSvgBackend } from './backends/css-svg'
import { svgContentBackend } from './backends/svg-content'
import { webglOverlayBackend } from './backends/webgl-overlay'
import { webglSceneBackend } from './backends/webgl-scene'
import { registerBackend, selectBackend } from './backends/registry'
import type { Backend, BackendInstance, BackendSurface } from './backends/types'
import { SurfaceTracker } from './dom-sync'
import { MATERIAL_DEFAULTS, resolveMaterial } from './material'
import { PhysicsController, resolvePhysics } from './physics/controller'
import { probeCapabilities } from './probe'
import type { LiquidGlassHandle, LiquidGlassOptions } from './types'

registerBackend(cssFallbackBackend)
registerBackend(cssSvgBackend)
registerBackend(svgContentBackend)
registerBackend(webglSceneBackend)
registerBackend(webglOverlayBackend)

const instances = new WeakMap<Element, LiquidGlassHandle>()

const TONE_SAMPLE_INTERVAL_MS = 250

function resolveBackdrop(backdrop: Element | string | null | undefined): Element | null {
  if (!backdrop) return null
  if (typeof backdrop === 'string') {
    return typeof document === 'undefined' ? null : document.querySelector(backdrop)
  }
  return backdrop
}

function createPhysics(
  element: Element,
  options: LiquidGlassOptions,
  reducedMotion: boolean
): PhysicsController | null {
  if (reducedMotion) return null
  if (typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) return null
  const config = resolvePhysics(options.physics)
  if (!config) return null
  return new PhysicsController(element, config)
}

export function attach(element: Element, options: LiquidGlassOptions = {}): LiquidGlassHandle {
  const existing = instances.get(element)
  if (existing) {
    existing.set(options)
    return existing
  }

  let current: LiquidGlassOptions = { ...options }
  const capabilities = probeCapabilities()
  let backend: Backend = selectBackend(capabilities, current.backend ?? 'auto')
  let tone: BackdropTone | null = null
  let lastToneSample = 0

  const surface: BackendSurface = {
    element,
    preset: current.preset ?? 'clear',
    material: resolveMaterial(current),
    state: { rect: { x: 0, y: 0, width: 0, height: 0 }, visible: true },
    backdrop: resolveBackdrop(current.backdrop),
    sceneImage: current.sceneImage ?? null,
    merge: current.merge ?? null,
    mergeStrength: current.mergeStrength ?? null
  }

  const applyMaterial = (): void => {
    let material = resolveMaterial(current)
    if (readReducedTransparency()) {
      material = applyReducedTransparency(material)
    }
    if (current.adaptive !== false) {
      tone = sampleTone(element, surface.backdrop)
      if (current.tint === undefined) {
        material = adaptTintToTone(material, tone, MATERIAL_DEFAULTS.tint)
      }
    } else {
      tone = null
    }
    surface.material = material
    if (tone) element.setAttribute('data-liquid-glass-tone', tone)
    else element.removeAttribute('data-liquid-glass-tone')
  }
  applyMaterial()

  let instance: BackendInstance = backend.mount(surface)
  let physics = createPhysics(element, current, capabilities.reducedMotion)

  const tracker = new SurfaceTracker(element, state => {
    surface.state = state
    if (current.adaptive !== false) {
      const now = Date.now()
      if (now - lastToneSample > TONE_SAMPLE_INTERVAL_MS) {
        lastToneSample = now
        const previousTone = tone
        applyMaterial()
        if (tone !== previousTone) {
          instance.update(surface)
        }
      }
    }
    instance.sync(surface)
  })
  tracker.start()

  const unsubscribers: Array<() => void> = [
    watchMedia('(prefers-reduced-motion: reduce)', matches => {
      physics?.destroy()
      physics = matches ? null : createPhysics(element, current, false)
    }),
    watchMedia('(prefers-reduced-transparency: reduce)', () => {
      applyMaterial()
      instance.update(surface)
    })
  ]

  const markElement = (): void => {
    element.setAttribute('data-liquid-glass', surface.preset)
    element.setAttribute('data-liquid-glass-backend', backend.id)
  }
  markElement()

  const handle: LiquidGlassHandle = {
    element,
    get backend() {
      return backend.id
    },
    set(next) {
      current = { ...current, ...next }
      surface.preset = current.preset ?? 'clear'
      surface.backdrop = resolveBackdrop(current.backdrop)
      surface.sceneImage = current.sceneImage ?? null
      surface.merge = current.merge ?? null
      surface.mergeStrength = current.mergeStrength ?? null
      applyMaterial()
      const wanted = current.backend ?? 'auto'
      if (wanted !== 'auto' && wanted !== backend.id) {
        const replacement = selectBackend(capabilities, wanted)
        if (replacement.id !== backend.id) {
          instance.destroy()
          backend = replacement
          instance = backend.mount(surface)
        }
      }
      if (next.physics !== undefined) {
        physics?.destroy()
        physics = createPhysics(element, current, capabilities.reducedMotion)
      }
      instance.update(surface)
      markElement()
    },
    destroy() {
      tracker.stop()
      for (const unsubscribe of unsubscribers) unsubscribe()
      physics?.destroy()
      physics = null
      instance.destroy()
      instances.delete(element)
      element.removeAttribute('data-liquid-glass')
      element.removeAttribute('data-liquid-glass-backend')
      element.removeAttribute('data-liquid-glass-tone')
    }
  }

  instances.set(element, handle)
  return handle
}

export function getInstance(element: Element): LiquidGlassHandle | undefined {
  return instances.get(element)
}

export function detach(element: Element): void {
  instances.get(element)?.destroy()
}
