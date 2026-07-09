import { attach, detach, getInstance, type LiquidGlassPreset } from '@liquidglass/core'

const PRESETS: readonly LiquidGlassPreset[] = ['clear', 'frosted', 'tinted']

function presetFrom(value: string | null): LiquidGlassPreset {
  return PRESETS.includes(value as LiquidGlassPreset) ? (value as LiquidGlassPreset) : 'clear'
}

function createElementClass(): CustomElementConstructor {
  return class LiquidGlassElement extends HTMLElement {
    static observedAttributes = ['preset']

    connectedCallback(): void {
      attach(this, { preset: presetFrom(this.getAttribute('preset')) })
    }

    disconnectedCallback(): void {
      detach(this)
    }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null): void {
      if (name === 'preset') getInstance(this)?.set({ preset: presetFrom(value) })
    }
  }
}

export function define(tag = 'liquid-glass'): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, createElementClass())
}

export * from '@liquidglass/core'
