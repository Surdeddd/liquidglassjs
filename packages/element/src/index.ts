import {
  attach,
  detach,
  getInstance,
  type BackendId,
  type LiquidGlassPreset
} from '@liquidglass/core'

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

function createElementClass(): CustomElementConstructor {
  return class LiquidGlassElement extends HTMLElement {
    static observedAttributes = ['preset', 'backdrop', 'backend', 'scene-image']

    connectedCallback(): void {
      attach(this, {
        preset: presetFrom(this.getAttribute('preset')),
        backdrop: this.getAttribute('backdrop'),
        backend: backendFrom(this.getAttribute('backend')),
        sceneImage: this.getAttribute('scene-image')
      })
    }

    disconnectedCallback(): void {
      detach(this)
    }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null): void {
      const instance = getInstance(this)
      if (!instance) return
      if (name === 'preset') instance.set({ preset: presetFrom(value) })
      if (name === 'backdrop') instance.set({ backdrop: value })
      if (name === 'backend') instance.set({ backend: backendFrom(value) })
      if (name === 'scene-image') instance.set({ sceneImage: value })
    }
  }
}

export function define(tag = 'liquid-glass'): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, createElementClass())
}

export * from '@liquidglass/core'
