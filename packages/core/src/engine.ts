import {
  adaptTintToTone,
  applyReducedTransparency,
  readForcedColors,
  readReducedMotion,
  readReducedTransparency,
  sampleTone,
  TONE_CROSSOVER,
  watchMedia,
  type BackdropTone
} from './quality/a11y'
import { mountBezel } from './fx/bezel'
import type { BezelHandle } from './fx/bezel'
import { backdropLuminance } from './quality/contrast'
import { mountGlow } from './fx/glow'
import type { GlowHandle } from './fx/glow'
import { registerLight } from './fx/light'
import { cssFallbackBackend } from './backends/css-fallback'
import { getBackend, selectBackend } from './backends/registry'
import type { Backend, BackendInstance, BackendSurface } from './backends/types'
import { watchFps } from './quality/profile'
import { createEmitter } from './runtime/events'
import { SurfaceTracker } from './runtime/dom-sync'
import { MATERIAL_DEFAULTS, resolveMaterial } from './material'
import { PhysicsController, resolvePhysics } from './physics/controller'
import type { PhysicsHooks } from './physics/controller'
import { probeCapabilities } from './quality/probe'
import type { LiquidGlassHandle, LiquidGlassOptions } from './types'

const instances = new WeakMap<Element, LiquidGlassHandle>()

const TONE_SAMPLE_INTERVAL_MS = 250

function samePhysicsOption(a: LiquidGlassOptions['physics'], b: LiquidGlassOptions['physics']): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return bKeys.every(
    key => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]
  )
}

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
let warnedAboutMerge = false
let watchdogArmed = false
let globallyDegraded = false
let stopWatchdog: (() => void) | null = null

function releaseWatchdog(): void {
  stopWatchdog?.()
  stopWatchdog = null
  watchdogArmed = false
}

export function resetDegradation(): void {
  globallyDegraded = false
  releaseWatchdog()
  degradeTargets.clear()
}

export function attach(element: Element, options: LiquidGlassOptions = {}): LiquidGlassHandle {
  const existing = instances.get(element)
  if (existing) {
    existing.set(options)
    return existing
  }
  let destroyed = false

  let current: LiquidGlassOptions = { ...options }
  let pressed = false
  const capabilities = probeCapabilities()
  let reducedMotion = readReducedMotion()
  const pickBackend = (): Backend => {
    const preference = current.backend ?? 'auto'
    if (preference === 'auto' && current.merge && !globallyDegraded) {
      const overlay = getBackend('webgl-overlay')
      if (overlay?.isSupported(capabilities)) return overlay
    }
    const selected = selectBackend(capabilities, preference)
    if (globallyDegraded && preference === 'auto' && selected.id === 'webgl-overlay') {
      return degradeTarget(capabilities)
    }
    return selected
  }
  let backend: Backend = pickBackend()
  const emitter = createEmitter()
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
    const previousTone = tone
    let material = resolveMaterial(current)
    if (readReducedTransparency() || readForcedColors()) {
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
        if (tone === null || Math.abs(luminance - TONE_CROSSOVER) >= 0.04) {
          tone = luminance > TONE_CROSSOVER ? 'light' : 'dark'
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
    if (tone !== previousTone) emitter.emit('tonechange', tone)
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
      emitter.emit('press', { x, y })
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
      emitter.emit('release', null)
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
    emitter.emit('degrade', backend.id)
    emitter.emit('backendchange', backend.id)
  }
  degradeTargets.add(applyDegrade)
  const armWatchdog = (): void => {
    if (watchdogArmed || typeof window === 'undefined') return
    if (backend.id !== 'webgl-overlay' || (current.backend ?? 'auto') !== 'auto') return
    watchdogArmed = true
    stopWatchdog = watchFps(() => {
      globallyDegraded = true
      stopWatchdog = null
      watchdogArmed = false
      for (const fn of [...degradeTargets]) fn()
    })
  }
  armWatchdog()

  const warnUnmergeable = (): void => {
    if (!current.merge || backend.id === 'webgl-overlay' || warnedAboutMerge) return
    warnedAboutMerge = true
    console.warn(
      `liquidglass: the "${backend.id}" backend cannot merge lenses; the merge group is ignored. Use backend: 'webgl-overlay' or wrap the lenses in <liquid-glass-group>.`
    )
  }
  warnUnmergeable()

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
    }),
    watchMedia('(forced-colors: active)', () => {
      applyMaterial()
      instance.update(surface)
    })
  ]

  const handle: LiquidGlassHandle = {
    element,
    get backend() {
      return backend.id
    },
    get options() {
      return { ...current }
    },
    on(event, cb) {
      return emitter.on(event, cb)
    },
    set(next) {
      const previousPhysics = current.physics
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
        emitter.emit('backendchange', backend.id)
      }
      if ('physics' in next && !samePhysicsOption(previousPhysics, current.physics)) {
        physics?.destroy()
        physics = createPhysics(element, current, reducedMotion, pressHooks)
      }
      instance.update(surface)
      syncBezel()
      markElement()
      armWatchdog()
      warnUnmergeable()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      if (pressed) {
        pressed = false
        emitter.emit('release', null)
      }
      tracker.stop()
      degradeTargets.delete(applyDegrade)
      if (degradeTargets.size === 0) releaseWatchdog()
      for (const unsubscribe of unsubscribers) unsubscribe()
      physics?.destroy()
      physics = null
      releaseLight?.()
      releaseLight = null
      glow?.destroy()
      glow = null
      bezel?.destroy()
      bezel = null
      instance.destroy()
      instances.delete(element)
      emitter.clear()
      element.removeAttribute('data-liquid-glass-pressed')
      element.removeAttribute('data-liquid-glass')
      element.removeAttribute('data-liquid-glass-backend')
      element.removeAttribute('data-liquid-glass-tone')
      element.removeAttribute('data-liquid-glass-degraded')
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
