export function pointerAngle(cx: number, cy: number, px: number, py: number): number {
  return (Math.atan2(px - cx, cy - py) * 180) / Math.PI
}

interface LightClient {
  host: HTMLElement
  motion: boolean
  update(angleDeg: number): void
}

const clients = new Set<LightClient>()
let pointerBound = false
let motionBound = false
let frame = 0
let lastX = 0
let lastY = 0

function flush(): void {
  frame = 0
  const vh = typeof window === 'undefined' ? 0 : window.innerHeight
  const vw = typeof window === 'undefined' ? 0 : window.innerWidth
  for (const client of clients) {
    const rect = client.host.getBoundingClientRect()
    if (rect.bottom < -80 || rect.top > vh + 80 || rect.right < -80 || rect.left > vw + 80) {
      continue
    }
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    client.update(pointerAngle(cx, cy, lastX, lastY))
  }
}

function onPointerMove(event: PointerEvent | MouseEvent): void {
  lastX = event.clientX
  lastY = event.clientY
  if (frame || typeof requestAnimationFrame !== 'function') {
    if (!frame) flush()
    return
  }
  frame = requestAnimationFrame(flush)
}

function onOrientation(event: DeviceOrientationEvent): void {
  const gamma = event.gamma ?? 0
  const beta = event.beta ?? 0
  const angle = (Math.atan2(gamma, Math.max(beta, 1)) * 180) / Math.PI
  for (const client of clients) {
    if (client.motion) client.update(angle)
  }
}

function ensureListeners(): void {
  if (typeof window === 'undefined') return
  if (!pointerBound) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    pointerBound = true
  }
  if (!motionBound && [...clients].some(client => client.motion) && 'DeviceOrientationEvent' in window) {
    window.addEventListener('deviceorientation', onOrientation)
    motionBound = true
  }
}

function releaseListeners(): void {
  if (typeof window === 'undefined' || clients.size > 0) return
  if (pointerBound) {
    window.removeEventListener('pointermove', onPointerMove)
    pointerBound = false
  }
  if (motionBound) {
    window.removeEventListener('deviceorientation', onOrientation)
    motionBound = false
  }
  if (frame && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

export function registerLight(client: LightClient): () => void {
  clients.add(client)
  ensureListeners()
  return () => {
    clients.delete(client)
    releaseListeners()
  }
}

export function globalLightDir(): [number, number] {
  if (typeof window === 'undefined' || (lastX === 0 && lastY === 0)) return [0.6, -0.8]
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const dx = lastX - cx
  const dy = lastY - cy
  const len = Math.hypot(dx, dy)
  if (len < 1) return [0.6, -0.8]
  return [dx / len, dy / len]
}
