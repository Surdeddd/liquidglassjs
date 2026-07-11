import {
  attach,
  detach,
  getInstance,
  type BackendId,
  type LiquidGlassPreset
} from '@surdeddd/liquidglass-core'

const PRESETS: readonly LiquidGlassPreset[] = ['clear', 'frosted', 'tinted']

const BACKENDS: readonly BackendId[] = [
  'css-fallback',
  'css-svg',
  'svg-content',
  'webgl-overlay',
  'webgl-scene',
  'webgpu'
]

function presetFrom(value: string | null): LiquidGlassPreset {
  return PRESETS.includes(value as LiquidGlassPreset) ? (value as LiquidGlassPreset) : 'clear'
}

function backendFrom(value: string | null): BackendId | 'auto' {
  return BACKENDS.includes(value as BackendId) ? (value as BackendId) : 'auto'
}

function physicsFrom(value: string | null): boolean {
  return value !== 'false' && value !== 'off'
}

function numberFrom(value: string | null): number | undefined {
  if (value === null) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function createElementClass(): CustomElementConstructor {
  return class LiquidGlassElement extends HTMLElement {
    static observedAttributes = [
      'preset',
      'backdrop',
      'backend',
      'scene-image',
      'physics',
      'merge',
      'merge-strength',
      'shape',
      'ior',
      'magnify',
      'thickness',
      'motion-light'
    ]

    connectedCallback(): void {
      const ior = numberFrom(this.getAttribute('ior'))
      const magnify = numberFrom(this.getAttribute('magnify'))
      const thickness = numberFrom(this.getAttribute('thickness'))
      const mergeStrength = numberFrom(this.getAttribute('merge-strength'))
      attach(this, {
        preset: presetFrom(this.getAttribute('preset')),
        backdrop: this.getAttribute('backdrop'),
        backend: backendFrom(this.getAttribute('backend')),
        sceneImage: this.getAttribute('scene-image'),
        physics: physicsFrom(this.getAttribute('physics')),
        merge: this.getAttribute('merge'),
        shape: this.getAttribute('shape') === 'squircle' ? 'squircle' : 'rounded',
        ...(ior !== undefined ? { ior } : {}),
        ...(magnify !== undefined ? { magnify } : {}),
        ...(thickness !== undefined ? { thickness } : {}),
        ...(mergeStrength !== undefined ? { mergeStrength } : {}),
        motionLight: this.hasAttribute('motion-light')
      })
    }

    disconnectedCallback(): void {
      detach(this)
    }

    get glass() {
      return getInstance(this)
    }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null): void {
      const instance = getInstance(this)
      if (!instance) return
      if (name === 'preset') instance.set({ preset: presetFrom(value) })
      if (name === 'backdrop') instance.set({ backdrop: value })
      if (name === 'backend') instance.set({ backend: backendFrom(value) })
      if (name === 'scene-image') instance.set({ sceneImage: value })
      if (name === 'physics') instance.set({ physics: physicsFrom(value) })
      if (name === 'merge') instance.set({ merge: value })
      if (name === 'merge-strength') {
        const mergeStrength = numberFrom(value)
        if (mergeStrength !== undefined) instance.set({ mergeStrength })
      }
      if (name === 'shape') instance.set({ shape: value === 'squircle' ? 'squircle' : 'rounded' })
      if (name === 'ior') {
        const ior = numberFrom(value)
        if (ior !== undefined) instance.set({ ior })
      }
      if (name === 'magnify') {
        const magnify = numberFrom(value)
        if (magnify !== undefined) instance.set({ magnify })
      }
      if (name === 'thickness') {
        const thickness = numberFrom(value)
        if (thickness !== undefined) instance.set({ thickness })
      }
      if (name === 'motion-light') instance.set({ motionLight: value !== null })
    }
  }
}

export function define(tag = 'liquid-glass'): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, createElementClass())
}

export * from '@surdeddd/liquidglass-core'
