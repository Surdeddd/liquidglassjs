type FrameCb = (dt: number) => void

const frameCbs = new Set<FrameCb>()
const viewportCbs = new Set<() => void>()
let frame = 0
let last = 0
let now = 0
let viewportBound = false
let viewportDirty = false

function tick(time: number): void {
  frame = 0
  now = time
  const dt = last ? Math.min((time - last) / 1000, 1 / 20) : 1 / 60
  last = time
  if (viewportDirty) {
    viewportDirty = false
    for (const cb of [...viewportCbs]) cb()
  }
  for (const cb of [...frameCbs]) cb(dt)
  if (frameCbs.size > 0 || viewportDirty) schedule()
  else last = 0
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

export function onViewport(cb: () => void): () => void {
  viewportCbs.add(cb)
  bindViewport()
  return () => {
    viewportCbs.delete(cb)
    unbindViewport()
  }
}
