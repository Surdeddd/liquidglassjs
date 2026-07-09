export interface SurfaceRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SurfaceState {
  rect: SurfaceRect
  visible: boolean
}

export type SurfaceListener = (state: SurfaceState) => void

export class SurfaceTracker {
  #element: Element
  #listener: SurfaceListener
  #resizeObserver: ResizeObserver | null = null
  #intersectionObserver: IntersectionObserver | null = null
  #frame = 0
  #running = false
  #state: SurfaceState = { rect: { x: 0, y: 0, width: 0, height: 0 }, visible: true }

  #onViewportChange = (): void => {
    this.#schedule()
  }

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
      this.#resizeObserver = new ResizeObserver(() => this.#schedule())
      this.#resizeObserver.observe(this.#element)
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this.#intersectionObserver = new IntersectionObserver(entries => {
        const entry = entries[entries.length - 1]
        if (entry) {
          this.#state = { ...this.#state, visible: entry.isIntersecting }
          this.#listener(this.#state)
        }
      })
      this.#intersectionObserver.observe(this.#element)
    }
    window.addEventListener('scroll', this.#onViewportChange, { passive: true, capture: true })
    window.addEventListener('resize', this.#onViewportChange, { passive: true })
    this.#measure()
  }

  stop(): void {
    if (!this.#running) return
    this.#running = false
    this.#resizeObserver?.disconnect()
    this.#resizeObserver = null
    this.#intersectionObserver?.disconnect()
    this.#intersectionObserver = null
    window.removeEventListener('scroll', this.#onViewportChange, true)
    window.removeEventListener('resize', this.#onViewportChange)
    if (this.#frame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#frame)
    }
    this.#frame = 0
  }

  #schedule(): void {
    if (this.#frame || typeof requestAnimationFrame !== 'function') return
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0
      this.#measure()
    })
  }

  #measure(): void {
    const box = this.#element.getBoundingClientRect()
    const previous = this.#state.rect
    if (
      box.x !== previous.x ||
      box.y !== previous.y ||
      box.width !== previous.width ||
      box.height !== previous.height
    ) {
      this.#state = {
        ...this.#state,
        rect: { x: box.x, y: box.y, width: box.width, height: box.height }
      }
      this.#listener(this.#state)
    }
  }
}
