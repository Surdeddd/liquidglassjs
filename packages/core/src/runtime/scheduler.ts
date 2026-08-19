type FrameCb = (dt: number) => void

const frameCbs = new Set<FrameCb>()
const observerCbs = new Set<FrameCb>()
const viewportCbs = new Set<() => void>()
let frame = 0
let last = 0
let now = 0
let viewportBound = false
let viewportDirty = false
let continuous = false

const viewportBuffer: Array<() => void> = []
const frameBuffer: FrameCb[] = []

function drain<T>(source: Set<T>, buffer: T[]): number {
  let count = 0
  for (const item of source) {
    buffer[count] = item
    count += 1
  }
  return count
}

function tick(time: number): void {
  frame = 0
  now = time
  const gap = last && continuous ? (time - last) / 1000 : 0
  const dt = last ? Math.min(gap || 1 / 60, 1 / 20) : 1 / 60
  last = time
  if (viewportDirty) {
    viewportDirty = false
    const count = drain(viewportCbs, viewportBuffer)
    for (let i = 0; i < count; i++) viewportBuffer[i]!()
    viewportBuffer.length = 0
  }
  const count = drain(frameCbs, frameBuffer)
  for (let i = 0; i < count; i++) frameBuffer[i]!(dt)
  frameBuffer.length = 0
  if (observerCbs.size > 0) {
    const observed = drain(observerCbs, frameBuffer)
    for (let i = 0; i < observed; i++) frameBuffer[i]!(gap)
    frameBuffer.length = 0
  }
  continuous = frameCbs.size > 0 || viewportDirty
  if (continuous) schedule()
}

function schedule(): void {
  if (frame || typeof requestAnimationFrame !== 'function') return
  frame = requestAnimationFrame(tick)
}

const onViewportEvent = (): void => {
  viewportDirty = true
  schedule()
}

function bindViewport(): void {
  if (viewportBound || typeof window === 'undefined') return
  window.addEventListener('scroll', onViewportEvent, { passive: true, capture: true })
  window.addEventListener('resize', onViewportEvent, { passive: true })
  viewportBound = true
}

function unbindViewport(): void {
  if (!viewportBound || viewportCbs.size > 0 || typeof window === 'undefined') return
  window.removeEventListener('scroll', onViewportEvent, true)
  window.removeEventListener('resize', onViewportEvent)
  viewportBound = false
}

export function frameNow(): number {
  return now
}

export function onFrame(cb: FrameCb): () => void {
  frameCbs.add(cb)
  schedule()
  return () => {
    frameCbs.delete(cb)
  }
}

export function observeFrames(cb: FrameCb): () => void {
  observerCbs.add(cb)
  return () => {
    observerCbs.delete(cb)
  }
}

export function onViewport(cb: () => void): () => void {
  viewportCbs.add(cb)
  bindViewport()
  return () => {
    viewportCbs.delete(cb)
    unbindViewport()
  }
}
