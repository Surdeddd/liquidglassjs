interface Blob {
  x: number
  y: number
  r: number
  color: string
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALETTES: Record<string, Blob[]> = {
  aurora: [
    { x: 0.82, y: 0.12, r: 0.55, color: 'rgba(94, 242, 220, 0.34)' },
    { x: 0.16, y: 0.3, r: 0.5, color: 'rgba(124, 92, 255, 0.32)' },
    { x: 0.6, y: 0.78, r: 0.6, color: 'rgba(255, 180, 84, 0.26)' },
    { x: 0.3, y: 0.85, r: 0.45, color: 'rgba(64, 156, 255, 0.3)' },
    { x: 0.94, y: 0.62, r: 0.4, color: 'rgba(255, 94, 158, 0.2)' }
  ],
  dusk: [
    { x: 0.2, y: 0.18, r: 0.55, color: 'rgba(255, 140, 90, 0.32)' },
    { x: 0.78, y: 0.3, r: 0.5, color: 'rgba(124, 92, 255, 0.34)' },
    { x: 0.5, y: 0.85, r: 0.62, color: 'rgba(64, 120, 255, 0.3)' },
    { x: 0.08, y: 0.7, r: 0.42, color: 'rgba(94, 242, 220, 0.22)' }
  ],
  sea: [
    { x: 0.3, y: 0.2, r: 0.55, color: 'rgba(64, 156, 255, 0.34)' },
    { x: 0.85, y: 0.45, r: 0.5, color: 'rgba(94, 242, 220, 0.3)' },
    { x: 0.45, y: 0.9, r: 0.6, color: 'rgba(124, 92, 255, 0.26)' },
    { x: 0.05, y: 0.6, r: 0.4, color: 'rgba(255, 180, 84, 0.18)' }
  ]
}

export function paintWallpaper(
  el: HTMLElement,
  palette: keyof typeof PALETTES = 'aurora',
  seed = 7
): void {
  const width = 1440
  const height = 960
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rand = mulberry32(seed)

  const base = ctx.createLinearGradient(0, 0, width * 0.4, height)
  base.addColorStop(0, '#05070f')
  base.addColorStop(0.55, '#0a1024')
  base.addColorStop(1, '#070b18')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  ctx.globalCompositeOperation = 'lighter'
  for (const blob of PALETTES[palette] ?? PALETTES['aurora']!) {
    const gradient = ctx.createRadialGradient(
      blob.x * width,
      blob.y * height,
      0,
      blob.x * width,
      blob.y * height,
      blob.r * Math.max(width, height)
    )
    gradient.addColorStop(0, blob.color)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  ctx.globalCompositeOperation = 'source-over'

  ctx.strokeStyle = 'rgba(233, 237, 246, 0.05)'
  ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    const cx = rand() * width
    const cy = rand() * height
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath()
      ctx.arc(cx, cy, ring * (60 + rand() * 50), 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  ctx.fillStyle = 'rgba(233, 237, 246, 0.35)'
  for (let i = 0; i < 90; i++) {
    const size = rand() < 0.85 ? 1 : 2
    ctx.globalAlpha = 0.14 + rand() * 0.5
    ctx.fillRect(rand() * width, rand() * height, size, size)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(233, 237, 246, 0.075)'
  for (let i = 0; i < 14; i++) {
    const x = rand() * width
    const y = rand() * height
    const len = 40 + rand() * 140
    const angle = rand() * Math.PI
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(angle) * len, y - Math.sin(angle) * len)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }

  el.style.backgroundImage = `url(${canvas.toDataURL('image/jpeg', 0.86)})`
  el.style.backgroundSize = 'cover'
  el.style.backgroundPosition = 'center'
}

export function paintAllWallpapers(root: ParentNode = document): void {
  const deferred: HTMLElement[] = []
  for (const el of root.querySelectorAll<HTMLElement>('[data-wall]')) {
    const box = el.getBoundingClientRect()
    const visible = box.bottom > -200 && box.top < window.innerHeight + 200
    if (visible) paintOne(el)
    else deferred.push(el)
  }
  if (deferred.length === 0) return
  const idle =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (fn: () => void) => setTimeout(fn, 120)
  const next = (): void => {
    const el = deferred.shift()
    if (!el) return
    paintOne(el)
    idle(next)
  }
  idle(next)
}

function paintOne(el: HTMLElement): void {
  const palette = (el.dataset['wall'] || 'aurora') as keyof typeof PALETTES
  const seed = Number(el.dataset['wallSeed'] ?? 7)
  paintWallpaper(el, palette, seed)
}
