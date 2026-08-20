import { onViewport } from './scheduler'

export interface SurfaceRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SurfaceState {
  rect: SurfaceRect
  /** Within OFFSCREEN_MARGIN of the viewport — near enough to prepare, not yet on screen. */
  visible: boolean
}

export type SurfaceListener = (state: SurfaceState) => void

const OFFSCREEN_MARGIN = '200px'

export class SurfaceTracker {
  #element: Element
  #listener: SurfaceListener
  #resizeObserver: ResizeObserver | null = null
  #intersectionObserver: IntersectionObserver | null = null
  #offViewport: (() => void) | null = null
  #running = false
  #state: SurfaceState = { rect: { x: 0, y: 0, width: 0, height: 0 }, visible: true }

  constructor(element: Element, listener: SurfaceListener) {
    this.#element = element
    this.#listener = listener
  }

  get state(): SurfaceState {
    return this.#state
  }

  start(): void {
    if (this.#running || typeof window === 'undefined') return
    this.#running = true
    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => this.#measure())
      this.#resizeObserver.observe(this.#element)
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this.#intersectionObserver = new IntersectionObserver(
        entries => {
          const entry = entries[entries.length - 1]
          if (!entry) return
          const visible = entry.isIntersecting
          const appeared = visible && !this.#state.visible
          this.#state = { ...this.#state, visible }
          if (appeared) this.#readRect()
          this.#listener(this.#state)
        },
        { rootMargin: OFFSCREEN_MARGIN }
      )
      this.#intersectionObserver.observe(this.#element)
    }
    this.#offViewport = onViewport(() => {
      if (this.#state.visible) this.#measure()
    })
    this.#measure()
  }

  stop(): void {
    if (!this.#running) return
    this.#running = false
    this.#resizeObserver?.disconnect()
    this.#resizeObserver = null
    this.#intersectionObserver?.disconnect()
    this.#intersectionObserver = null
    this.#offViewport?.()
    this.#offViewport = null
  }

  #measure(): void {
    if (this.#readRect()) this.#listener(this.#state)
  }

  #readRect(): boolean {
    const box = this.#element.getBoundingClientRect()
    const previous = this.#state.rect
    if (
      box.x === previous.x &&
      box.y === previous.y &&
      box.width === previous.width &&
      box.height === previous.height
    ) {
      return false
    }
    this.#state = {
      ...this.#state,
      rect: { x: box.x, y: box.y, width: box.width, height: box.height }
    }
    return true
  }
}
