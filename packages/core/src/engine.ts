import {
  adaptTintToTone,
  applyReducedTransparency,
  readReducedTransparency,
  sampleTone,
  watchMedia,
  type BackdropTone
} from './a11y'
import { mountBezel } from './bezel'
import type { BezelHandle } from './bezel'
import { backdropLuminance } from './contrast'
import { mountGlow } from './glow'
import type { GlowHandle } from './glow'
import { registerLight } from './light'
import { cssFallbackBackend } from './backends/css-fallback'
import { cssSvgBackend } from './backends/css-svg'
import { svgContentBackend } from './backends/svg-content'
import { webglOverlayBackend } from './backends/webgl-overlay'
import { webglSceneBackend } from './backends/webgl-scene'
import { getBackend, registerBackend, selectBackend } from './backends/registry'
import type { Backend, BackendInstance, BackendSurface } from './backends/types'
import { watchFps } from './quality'
import { SurfaceTracker } from './dom-sync'
import { MATERIAL_DEFAULTS, resolveMaterial } from './material'
import { PhysicsController, resolvePhysics } from './physics/controller'
import type { PhysicsHooks } from './physics/controller'
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
  reducedMotion: boolean,
  hooks?: PhysicsHooks
): PhysicsController | null {
  if (reducedMotion) return null
  if (typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) return null
  const config = resolvePhysics(options.physics)
  if (!config) return null
  const explicitHover =
    typeof options.physics === 'object' && options.physics !== null && 'hover' in options.physics
  if (
    config.hover &&
    !explicitHover &&
    typeof matchMedia === 'function' &&
    matchMedia('(pointer: coarse)').matches
  ) {
    config.hover = false
  }
  return new PhysicsController(element, config, hooks)
}

function degradeTarget(capabilities: ReturnType<typeof probeCapabilities>): Backend {
  const cssSvg = getBackend('css-svg')
  if (cssSvg?.isSupported(capabilities)) return cssSvg
  return cssFallbackBackend
}

const degradeTargets = new Set<() => void>()
let watchdogArmed = false
let globallyDegraded = false

export function resetDegradation(): void {
  globallyDegraded = false
  watchdogArmed = false
  degradeTargets.clear()
}

export function attach(element: Element, options: LiquidGlassOptions = {}): LiquidGlassHandle {
  const existing = instances.get(element)
  if (existing) {
    existing.set(options)
    return existing
  }

  let current: LiquidGlassOptions = { ...options }
  let pressed = false
  const capabilities = probeCapabilities()
  let reducedMotion = capabilities.reducedMotion
  const pickBackend = (): Backend => {
    const selected = selectBackend(capabilities, current.backend ?? 'auto')
    if (
      globallyDegraded &&
      (current.backend ?? 'auto') === 'auto' &&
      selected.id === 'webgl-overlay'
    ) {
      return degradeTarget(capabilities)
    }
    return selected
  }
  let backend: Backend = pickBackend()
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
    if (pressed) {
      material = {
        ...material,
        refraction: material.refraction * 0.82,
        specular: Math.min(1, material.specular * 1.3)
      }
    }
    if (current.adaptive !== false) {
      const box = element.getBoundingClientRect()
      const luminance = backdropLuminance({
        left: box.left + (typeof window === 'undefined' ? 0 : window.scrollX),
        top: box.top + (typeof window === 'undefined' ? 0 : window.scrollY),
        width: box.width,
        height: box.height
      })
      if (luminance !== null) {
        if (tone === null || Math.abs(luminance - 0.5) >= 0.06) {
          tone = luminance > 0.5 ? 'light' : 'dark'
        }
      } else {
        tone = sampleTone(element, surface.backdrop)
      }
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

  const markElement = (): void => {
    element.setAttribute('data-liquid-glass', surface.preset)
    element.setAttribute('data-liquid-glass-backend', backend.id)
  }
  markElement()

  let instance: BackendInstance = backend.mount(surface)

  let glow: GlowHandle | null = null
  const pressHooks: PhysicsHooks = {
    onPress(x, y) {
      pressed = true
      element.setAttribute('data-liquid-glass-pressed', 'true')
      applyMaterial()
      instance.update(surface)
      if (!glow && typeof HTMLElement !== 'undefined' && element instanceof HTMLElement) {
        glow = mountGlow(element)
      }
      glow?.press(x, y)
    },
    onRelease() {
      pressed = false
      element.removeAttribute('data-liquid-glass-pressed')
      applyMaterial()
      instance.update(surface)
      glow?.release()
    }
  }
  let physics = createPhysics(element, current, reducedMotion, pressHooks)

  let bezel: BezelHandle | null = null
  let bezelSpecular = -1
  let bezelMotion: boolean | null = null
  let releaseLight: (() => void) | null = null

  const syncBezel = (): void => {
    const styleable = typeof HTMLElement !== 'undefined' && element instanceof HTMLElement
    const wanted = styleable && surface.material.specular > 0
    if (!wanted) {
      releaseLight?.()
      releaseLight = null
      bezel?.destroy()
      bezel = null
      bezelSpecular = -1
      bezelMotion = null
      return
    }
    const motion = !reducedMotion && current.motionLight === true
    if (bezel && surface.material.specular === bezelSpecular && motion === bezelMotion) return
    releaseLight?.()
    releaseLight = null
    bezel?.destroy()
    const host = element as HTMLElement
    bezel = mountBezel(host, surface.material.specular)
    bezelSpecular = surface.material.specular
    bezelMotion = motion
    if (!reducedMotion) {
      releaseLight = registerLight({
        host,
        motion,
        update: angle => bezel?.update(angle)
      })
    }
  }
  syncBezel()

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

  const applyDegrade = (): void => {
    if ((current.backend ?? 'auto') !== 'auto') return
    if (backend.id !== 'webgl-overlay') return
    const replacement = degradeTarget(capabilities)
    if (replacement.id === backend.id) return
    instance.destroy()
    backend = replacement
    instance = backend.mount(surface)
    element.setAttribute('data-liquid-glass-degraded', 'true')
    markElement()
  }
  degradeTargets.add(applyDegrade)
  if (!watchdogArmed && typeof window !== 'undefined') {
    watchdogArmed = true
    watchFps(() => {
      globallyDegraded = true
      for (const fn of [...degradeTargets]) fn()
    })
  }

  const unsubscribers: Array<() => void> = [
    watchMedia('(prefers-reduced-motion: reduce)', matches => {
      reducedMotion = matches
      physics?.destroy()
      physics = createPhysics(element, current, reducedMotion, pressHooks)
      syncBezel()
    }),
    watchMedia('(prefers-reduced-transparency: reduce)', () => {
      applyMaterial()
      instance.update(surface)
    })
  ]

  const handle: LiquidGlassHandle = {
    element,
    get backend() {
      return backend.id
    },
    set(next) {
      current = { ...current, ...next }
      const merged = current as Record<string, unknown>
      for (const key of Object.keys(merged)) {
        if (merged[key] === undefined) delete merged[key]
      }
      surface.preset = current.preset ?? 'clear'
      surface.backdrop = resolveBackdrop(current.backdrop)
      surface.sceneImage = current.sceneImage ?? null
      surface.merge = current.merge ?? null
      surface.mergeStrength = current.mergeStrength ?? null
      applyMaterial()
      const replacement = pickBackend()
      if (replacement.id !== backend.id) {
        instance.destroy()
        backend = replacement
        instance = backend.mount(surface)
      }
      if ('physics' in next) {
        physics?.destroy()
        physics = createPhysics(element, current, reducedMotion, pressHooks)
      }
      instance.update(surface)
      syncBezel()
      markElement()
    },
    destroy() {
      tracker.stop()
      degradeTargets.delete(applyDegrade)
      for (const unsubscribe of unsubscribers) unsubscribe()
      physics?.destroy()
      physics = null
      releaseLight?.()
      releaseLight = null
      bezel?.destroy()
      bezel = null
      glow?.destroy()
      glow = null
      instance.destroy()
      instances.delete(element)
      element.removeAttribute('data-liquid-glass-pressed')
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
