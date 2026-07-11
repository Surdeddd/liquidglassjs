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
      if (name === 'merge-strength') instance.set({ mergeStrength: numberFrom(value) })
      if (name === 'shape') instance.set({ shape: value === 'squircle' ? 'squircle' : 'rounded' })
      if (name === 'ior') instance.set({ ior: numberFrom(value) })
      if (name === 'magnify') instance.set({ magnify: numberFrom(value) })
      if (name === 'thickness') instance.set({ thickness: numberFrom(value) })
      if (name === 'motion-light') instance.set({ motionLight: value !== null })
    }
  }
}

let groupUid = 0

function createGroupClass(glassTag: string): CustomElementConstructor {
  return class LiquidGlassGroupElement extends HTMLElement {
    static observedAttributes = ['spacing']

    #group = ''
    #observer: MutationObserver | null = null

    connectedCallback(): void {
      this.#group = `lg-group-${++groupUid}`
      queueMicrotask(() => this.#apply())
      if (typeof MutationObserver !== 'undefined') {
        this.#observer = new MutationObserver(() => this.#apply())
        this.#observer.observe(this, { childList: true, subtree: true })
      }
    }

    disconnectedCallback(): void {
      this.#observer?.disconnect()
      this.#observer = null
    }

    attributeChangedCallback(): void {
      if (this.#group) this.#apply()
    }

    #apply(): void {
      const spacing = Number(this.getAttribute('spacing'))
      const strength = Number.isFinite(spacing) && spacing > 0 ? spacing : 40
      for (const glass of this.querySelectorAll(glassTag)) {
        glass.setAttribute('merge', this.#group)
        glass.setAttribute('merge-strength', String(strength))
        if (!glass.hasAttribute('backend')) glass.setAttribute('backend', 'webgl-overlay')
      }
    }
  }
}

export function define(tag = 'liquid-glass'): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, createElementClass())
  const groupTag = `${tag}-group`
  if (!customElements.get(groupTag)) customElements.define(groupTag, createGroupClass(tag))
}

export * from '@surdeddd/liquidglass-core'
