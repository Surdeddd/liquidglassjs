import { captureInlineStyles } from '../style-restore'
import { Spring } from './spring'

export interface PhysicsConfig {
  press: boolean
  hover: boolean
  wobble: number
}

export const PHYSICS_DEFAULTS: PhysicsConfig = {
  press: true,
  hover: true,
  wobble: 0.6
}

export type PhysicsOption = boolean | Partial<PhysicsConfig> | undefined

export interface PhysicsHooks {
  onPress?(x: number, y: number): void
  onRelease?(): void
}

export function resolvePhysics(option: PhysicsOption): PhysicsConfig | null {
  if (option === false) return null
  if (option === true || option === undefined) return { ...PHYSICS_DEFAULTS }
  return { ...PHYSICS_DEFAULTS, ...option }
}

const PRESS_SPRING = { stiffness: 550, damping: 30, mass: 1 }
const HOVER_SPRING = { stiffness: 220, damping: 18, mass: 1 }
const MAGNET_RATIO = 0.05

export class PhysicsController {
  #element: HTMLElement
  #config: PhysicsConfig
  #base: string
  #hadInlineTransform: boolean
  #restore: () => void
  #scaleX: Spring
  #scaleY: Spring
  #tx: Spring
  #ty: Spring
  #frame = 0
  #lastTime = 0

  #onDown = (event: PointerEvent): void => {
    if (!this.#config.press) return
    this.#configureScale(PRESS_SPRING.stiffness, PRESS_SPRING.damping)
    this.#scaleX.target = 1.04
    this.#scaleY.target = 0.94
    const box = this.#element.getBoundingClientRect()
    this.#hooks?.onPress?.(event.clientX - box.left, event.clientY - box.top)
    this.#pressed = true
    this.#wake()
  }

  #onUp = (): void => {
    if (!this.#config.press) return
    if (this.#pressed) {
      this.#pressed = false
      this.#hooks?.onRelease?.()
    }
    const damping = 8 + (1 - this.#config.wobble) * 20
    this.#configureScale(300, damping)
    this.#scaleX.target = 1
    this.#scaleY.target = 1
    this.#wake()
  }

  #onMove = (event: PointerEvent): void => {
    if (!this.#config.hover) return
    const box = this.#element.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    this.#tx.target = dx * MAGNET_RATIO
    this.#ty.target = dy * MAGNET_RATIO
    this.#wake()
  }

  #onLeave = (): void => {
    this.#tx.target = 0
    this.#ty.target = 0
    this.#onUp()
    this.#wake()
  }

  #hooks: PhysicsHooks | undefined
  #pressed = false

  constructor(element: HTMLElement, config: PhysicsConfig, hooks?: PhysicsHooks) {
    this.#element = element
    this.#config = config
    this.#hooks = hooks
    this.#hadInlineTransform = element.style.transform !== ''
    this.#restore = captureInlineStyles(element, ['transform', 'display'])
    const computed = typeof getComputedStyle === 'function' ? getComputedStyle(element) : null
    this.#base = computed && computed.transform !== 'none' ? computed.transform : ''
    if (computed && computed.display === 'inline') {
      element.style.display = 'inline-block'
    }
    this.#scaleX = new Spring(1, PRESS_SPRING)
    this.#scaleY = new Spring(1, PRESS_SPRING)
    this.#tx = new Spring(0, HOVER_SPRING)
    this.#ty = new Spring(0, HOVER_SPRING)
    element.addEventListener('pointerdown', this.#onDown)
    element.addEventListener('pointerup', this.#onUp)
    element.addEventListener('pointercancel', this.#onUp)
    element.addEventListener('pointermove', this.#onMove)
    element.addEventListener('pointerleave', this.#onLeave)
  }

  tick(dt: number): boolean {
    const clamped = Math.min(dt, 1 / 30)
    let active = false
    active = this.#scaleX.step(clamped) || active
    active = this.#scaleY.step(clamped) || active
    active = this.#tx.step(clamped) || active
    active = this.#ty.step(clamped) || active
    this.#apply(active)
    return active
  }

  destroy(): void {
    const element = this.#element
    element.removeEventListener('pointerdown', this.#onDown)
    element.removeEventListener('pointerup', this.#onUp)
    element.removeEventListener('pointercancel', this.#onUp)
    element.removeEventListener('pointermove', this.#onMove)
    element.removeEventListener('pointerleave', this.#onLeave)
    if (this.#frame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#frame)
      this.#frame = 0
    }
    this.#restore()
  }

  #configureScale(stiffness: number, damping: number): void {
    this.#scaleX.configure({ stiffness, damping })
    this.#scaleY.configure({ stiffness, damping })
  }

  #apply(active: boolean): void {
    if (!active && !this.#hadInlineTransform && this.#isIdentity()) {
      this.#element.style.removeProperty('transform')
      return
    }
    const transform = `${this.#base} translate3d(${this.#tx.value.toFixed(3)}px, ${this.#ty.value.toFixed(3)}px, 0) scale(${this.#scaleX.value.toFixed(4)}, ${this.#scaleY.value.toFixed(4)})`
    this.#element.style.transform = transform.trim()
  }

  #isIdentity(): boolean {
    return (
      Math.abs(this.#scaleX.value - 1) < 0.001 &&
      Math.abs(this.#scaleY.value - 1) < 0.001 &&
      Math.abs(this.#tx.value) < 0.05 &&
      Math.abs(this.#ty.value) < 0.05
    )
  }

  #wake(): void {
    if (this.#frame || typeof requestAnimationFrame !== 'function') return
    this.#lastTime = 0
    const loop = (time: number): void => {
      const dt = this.#lastTime ? (time - this.#lastTime) / 1000 : 1 / 60
      this.#lastTime = time
      const active = this.tick(dt)
      this.#frame = active ? requestAnimationFrame(loop) : 0
    }
    this.#frame = requestAnimationFrame(loop)
  }
}
