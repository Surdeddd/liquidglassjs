import { onFrame } from '../runtime/scheduler'
import { captureInlineStyles } from '../style-restore'
import { Spring } from './spring'

export interface PhysicsConfig {
  press: boolean
  hover: boolean
  wobble: number
  /** How far the surface elongates along its own travel, 0 to 1. */
  stretch: number
}

export const PHYSICS_DEFAULTS: PhysicsConfig = {
  press: true,
  hover: true,
  wobble: 0.6,
  stretch: 0.6
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
const STRETCH_SPRING = { stiffness: 260, damping: 22, mass: 1 }
const STRETCH_REFERENCE_SPEED = 1600
const STRETCH_LIMIT = 0.18
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
  #stretchX: Spring
  #stretchY: Spring
  #lastX = 0
  #lastY = 0
  #seen = false
  #offFrame: (() => void) | null = null

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

  #pointerX = 0
  #pointerY = 0
  #magnetFrame = 0

  #onMove = (event: PointerEvent): void => {
    if (!this.#config.hover) return
    this.#pointerX = event.clientX
    this.#pointerY = event.clientY
    if (this.#magnetFrame) return
    this.#aimMagnet()
    if (typeof requestAnimationFrame !== 'function') return
    this.#magnetFrame = requestAnimationFrame(() => {
      this.#magnetFrame = 0
      this.#aimMagnet()
    })
  }

  #aimMagnet(): void {
    const box = this.#element.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return
    const dx = this.#pointerX - (box.left + box.width / 2)
    const dy = this.#pointerY - (box.top + box.height / 2)
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
    this.#stretchX = new Spring(1, STRETCH_SPRING)
    this.#stretchY = new Spring(1, STRETCH_SPRING)
    element.addEventListener('pointerdown', this.#onDown)
    element.addEventListener('pointerup', this.#onUp)
    element.addEventListener('pointercancel', this.#onUp)
    element.addEventListener('pointermove', this.#onMove)
    element.addEventListener('pointerleave', this.#onLeave)
  }

  /**
   * Feeds the surface's own position so travel can elongate it. Coordinates are page
   * space; passing the rect the tracker already measured avoids a second layout read.
   */
  travelled(x: number, y: number, dt: number): void {
    if (this.#config.stretch <= 0) return
    if (!this.#seen) {
      this.#seen = true
      this.#lastX = x
      this.#lastY = y
      return
    }
    const dx = x - this.#lastX
    const dy = y - this.#lastY
    this.#lastX = x
    this.#lastY = y
    const step = Math.max(dt, 1 / 240)
    const speed = Math.hypot(dx, dy) / step
    if (speed < 1) {
      this.#stretchX.target = 1
      this.#stretchY.target = 1
      return
    }
    const amount =
      Math.min(speed / STRETCH_REFERENCE_SPEED, 1) * STRETCH_LIMIT * this.#config.stretch
    const axis = Math.abs(dx) >= Math.abs(dy)
    this.#stretchX.target = axis ? 1 + amount : 1 - amount * 0.6
    this.#stretchY.target = axis ? 1 - amount * 0.6 : 1 + amount
    this.#wake()
  }

  tick(dt: number): boolean {
    const clamped = Math.min(dt, 1 / 30)
    let active = false
    active = this.#scaleX.step(clamped) || active
    active = this.#scaleY.step(clamped) || active
    active = this.#tx.step(clamped) || active
    active = this.#ty.step(clamped) || active
    active = this.#stretchX.step(clamped) || active
    active = this.#stretchY.step(clamped) || active
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
    if (this.#magnetFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#magnetFrame)
      this.#magnetFrame = 0
    }
    this.#offFrame?.()
    this.#offFrame = null
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
    const sx = this.#scaleX.value * this.#stretchX.value
    const sy = this.#scaleY.value * this.#stretchY.value
    const transform = `${this.#base} translate3d(${this.#tx.value.toFixed(3)}px, ${this.#ty.value.toFixed(3)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`
    this.#element.style.transform = transform.trim()
  }

  #isIdentity(): boolean {
    return (
      Math.abs(this.#scaleX.value - 1) < 0.001 &&
      Math.abs(this.#scaleY.value - 1) < 0.001 &&
      Math.abs(this.#stretchX.value - 1) < 0.001 &&
      Math.abs(this.#stretchY.value - 1) < 0.001 &&
      Math.abs(this.#tx.value) < 0.05 &&
      Math.abs(this.#ty.value) < 0.05
    )
  }

  #wake(): void {
    if (this.#offFrame) return
    this.#offFrame = onFrame(dt => {
      if (!this.tick(dt)) {
        this.#offFrame?.()
        this.#offFrame = null
      }
    })
  }
}
