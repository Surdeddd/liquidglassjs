interface Blob {
  x: number
  y: number
  r: number
  rgb: string
  a: number
}

export type WallpaperTheme = 'dark' | 'light'

interface Ground {
  stops: [string, string, string]
  blend: GlobalCompositeOperation
  alpha: number
  ink: string
  sparkle: number
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
    { x: 0.82, y: 0.12, r: 0.55, rgb: '94, 242, 220', a: 0.34 },
    { x: 0.16, y: 0.3, r: 0.5, rgb: '124, 92, 255', a: 0.32 },
    { x: 0.6, y: 0.78, r: 0.6, rgb: '255, 180, 84', a: 0.26 },
    { x: 0.3, y: 0.85, r: 0.45, rgb: '64, 156, 255', a: 0.3 },
    { x: 0.94, y: 0.62, r: 0.4, rgb: '255, 94, 158', a: 0.2 }
  ],
  dusk: [
    { x: 0.2, y: 0.18, r: 0.55, rgb: '255, 140, 90', a: 0.32 },
    { x: 0.78, y: 0.3, r: 0.5, rgb: '124, 92, 255', a: 0.34 },
    { x: 0.5, y: 0.85, r: 0.62, rgb: '64, 120, 255', a: 0.3 },
    { x: 0.08, y: 0.7, r: 0.42, rgb: '94, 242, 220', a: 0.22 }
  ],
  sea: [
    { x: 0.3, y: 0.2, r: 0.55, rgb: '64, 156, 255', a: 0.34 },
    { x: 0.85, y: 0.45, r: 0.5, rgb: '94, 242, 220', a: 0.3 },
    { x: 0.45, y: 0.9, r: 0.6, rgb: '124, 92, 255', a: 0.26 },
    { x: 0.05, y: 0.6, r: 0.4, rgb: '255, 180, 84', a: 0.18 }
  ],
  dawn: [
    { x: 0.24, y: 0.82, r: 0.58, rgb: '255, 180, 84', a: 0.3 },
    { x: 0.72, y: 0.24, r: 0.52, rgb: '255, 94, 158', a: 0.24 },
    { x: 0.9, y: 0.74, r: 0.46, rgb: '124, 92, 255', a: 0.28 },
    { x: 0.08, y: 0.24, r: 0.42, rgb: '94, 242, 220', a: 0.2 }
  ]
}

const GROUNDS: Record<WallpaperTheme, Ground> = {
  dark: {
    stops: ['#05070f', '#0a1024', '#070b18'],
    blend: 'lighter',
    alpha: 1,
    ink: '233, 237, 246',
    sparkle: 0.35
  },
  light: {
    stops: ['#e6edfb', '#c4d4ef', '#d9e3f7'],
    blend: 'multiply',
    alpha: 1.3,
    ink: '22, 30, 54',
    sparkle: 0.3
  }
}

export function resolveWallpaperTheme(): WallpaperTheme {
  if (typeof document === 'undefined') return 'dark'
  const set = document.documentElement.dataset['theme']
  if (set === 'light' || set === 'dark') return set
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function paintWallpaper(
  el: HTMLElement,
  palette: keyof typeof PALETTES = 'aurora',
  seed = 7,
  theme: WallpaperTheme = 'dark'
): void {
  const width = 1440
  const height = 960
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rand = mulberry32(seed)
  const ground = GROUNDS[theme]

  const base = ctx.createLinearGradient(0, 0, width * 0.4, height)
  base.addColorStop(0, ground.stops[0])
  base.addColorStop(0.55, ground.stops[1])
  base.addColorStop(1, ground.stops[2])
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  ctx.globalCompositeOperation = ground.blend
  for (const blob of PALETTES[palette] ?? PALETTES['aurora']!) {
    const gradient = ctx.createRadialGradient(
      blob.x * width,
      blob.y * height,
      0,
      blob.x * width,
      blob.y * height,
      blob.r * Math.max(width, height)
    )
    gradient.addColorStop(0, `rgba(${blob.rgb}, ${blob.a * ground.alpha})`)
    gradient.addColorStop(1, `rgba(${blob.rgb}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  ctx.globalCompositeOperation = 'source-over'

  ctx.strokeStyle = `rgba(${ground.ink}, 0.05)`
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

  ctx.fillStyle = `rgba(${ground.ink}, ${ground.sparkle})`
  for (let i = 0; i < 90; i++) {
    const size = rand() < 0.85 ? 1 : 2
    ctx.globalAlpha = 0.14 + rand() * 0.5
    ctx.fillRect(rand() * width, rand() * height, size, size)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = `rgba(${ground.ink}, 0.075)`
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

let generation = 0

export function paintAllWallpapers(root: ParentNode = document): void {
  const mine = ++generation
  const theme = resolveWallpaperTheme()
  const deferred: HTMLElement[] = []
  for (const el of root.querySelectorAll<HTMLElement>('[data-wall]')) {
    const box = el.getBoundingClientRect()
    const visible = box.bottom > -200 && box.top < window.innerHeight + 200
    if (visible) paintOne(el, theme)
    else deferred.push(el)
  }
  if (deferred.length === 0) return
  const idle =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (fn: () => void) => setTimeout(fn, 120)
  const next = (): void => {
    if (mine !== generation) return
    const el = deferred.shift()
    if (!el) return
    paintOne(el, theme)
    idle(next)
  }
  idle(next)
}

function paintOne(el: HTMLElement, theme: WallpaperTheme): void {
  const palette = (el.dataset['wall'] || 'aurora') as keyof typeof PALETTES
  const seed = Number(el.dataset['wallSeed'] ?? 7)
  paintWallpaper(el, palette, seed, theme)
}
