import {
  attach,
  detach,
  getInstance,
  type BackendId,
  type LiquidGlassEventName,
  type LiquidGlassHandle,
  type LiquidGlassOptions,
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

const EVENTS: readonly LiquidGlassEventName[] = [
  'press',
  'release',
  'tonechange',
  'backendchange',
  'degrade'
]

type Parser = (value: string | null, present: boolean) => unknown

const numberOrAuto: Parser = value => {
  if (value === null) return undefined
  if (value === 'auto') return 'auto'
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const number: Parser = value => {
  if (value === null) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const text: Parser = value => value

const flag: Parser = (_value, present) => present

const enabled: Parser = value => value !== 'false' && value !== 'off'

const ATTRIBUTES: Record<string, { option: keyof LiquidGlassOptions; parse: Parser }> = {
  preset: {
    option: 'preset',
    parse: value => (PRESETS.includes(value as LiquidGlassPreset) ? value : 'clear')
  },
  backend: {
    option: 'backend',
    parse: value => (BACKENDS.includes(value as BackendId) ? value : 'auto')
  },
  backdrop: { option: 'backdrop', parse: text },
  'scene-image': { option: 'sceneImage', parse: text },
  shape: { option: 'shape', parse: value => (value === 'squircle' ? 'squircle' : 'rounded') },
  physics: { option: 'physics', parse: enabled },
  merge: { option: 'merge', parse: text },
  'merge-strength': { option: 'mergeStrength', parse: number },
  adaptive: { option: 'adaptive', parse: enabled },
  'motion-light': { option: 'motionLight', parse: flag },
  blur: { option: 'blur', parse: number },
  saturation: { option: 'saturation', parse: number },
  brightness: { option: 'brightness', parse: number },
  tint: { option: 'tint', parse: text },
  'tint-opacity': { option: 'tintOpacity', parse: number },
  refraction: { option: 'refraction', parse: number },
  ior: { option: 'ior', parse: number },
  magnify: { option: 'magnify', parse: number },
  thickness: { option: 'thickness', parse: numberOrAuto },
  'bevel-width': { option: 'bevelWidth', parse: numberOrAuto },
  'bevel-depth': { option: 'bevelDepth', parse: number },
  dispersion: { option: 'dispersion', parse: number },
  specular: { option: 'specular', parse: number },
  frost: { option: 'frost', parse: number },
  radius: { option: 'radius', parse: numberOrAuto }
}

const ATTRIBUTE_NAMES = Object.keys(ATTRIBUTES)

const ALWAYS_ON = new Set(['preset', 'backend', 'shape', 'physics', 'adaptive', 'motion-light'])

function readOptions(el: HTMLElement): LiquidGlassOptions {
  const options: Record<string, unknown> = {}
  for (const name of ATTRIBUTE_NAMES) {
    const entry = ATTRIBUTES[name]!
    const present = el.hasAttribute(name)
    if (!present && !ALWAYS_ON.has(name)) continue
    const value = entry.parse(el.getAttribute(name), present)
    if (value !== undefined) options[entry.option] = value
  }
  return options as LiquidGlassOptions
}

function createElementClass(): CustomElementConstructor {
  return class LiquidGlassElement extends HTMLElement {
    static observedAttributes = ATTRIBUTE_NAMES

    #unsubscribers: Array<() => void> = []

    connectedCallback(): void {
      const handle = attach(this, readOptions(this))
      this.#unsubscribers = EVENTS.map(name =>
        handle.on(name, detail => {
          this.dispatchEvent(
            new CustomEvent(`liquid-glass:${name}`, {
              detail: detail === '' ? null : detail,
              bubbles: true,
              composed: true
            })
          )
        })
      )
    }

    disconnectedCallback(): void {
      for (const unsubscribe of this.#unsubscribers) unsubscribe()
      this.#unsubscribers = []
      detach(this)
    }

    get glass(): LiquidGlassHandle | undefined {
      return getInstance(this)
    }

    get options(): LiquidGlassOptions {
      return readOptions(this)
    }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null): void {
      const instance = getInstance(this)
      const entry = ATTRIBUTES[name]
      if (!instance || !entry) return
      instance.set({ [entry.option]: entry.parse(value, value !== null) } as LiquidGlassOptions)
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
      const strengthValue = String(strength)
      for (const glass of this.querySelectorAll(glassTag)) {
        if (glass.getAttribute('merge') !== this.#group) {
          glass.setAttribute('merge', this.#group)
        }
        if (glass.getAttribute('merge-strength') !== strengthValue) {
          glass.setAttribute('merge-strength', strengthValue)
        }
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
