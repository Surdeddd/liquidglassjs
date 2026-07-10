import type { MaterialParams } from './types'

export type BackdropTone = 'light' | 'dark'

export function parseColor(color: string): [number, number, number, number] | null {
  const value = color.trim()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)
  if (hex && hex[1]) {
    const raw = hex[1]
    const size = raw.length === 3 ? 1 : 2
    const channel = (index: number): number => {
      const part = raw.slice(index * size, index * size + size)
      return parseInt(size === 1 ? part + part : part, 16)
    }
    return [channel(0), channel(1), channel(2), 1]
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value)
  if (rgb && rgb[1]) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(part => parseFloat(part))
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      const alpha = parts.length > 3 && Number.isFinite(parts[3]) ? (parts[3] as number) : 1
      return [parts[0] as number, parts[1] as number, parts[2] as number, alpha]
    }
  }
  return null
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function sampleTone(element: Element, backdrop: Element | null): BackdropTone | null {
  if (typeof getComputedStyle !== 'function') return null
  const layers: Array<[number, number, number, number]> = []
  let sawImage = false
  let node: Element | null = backdrop ?? element.parentElement
  while (node) {
    const computed = getComputedStyle(node)
    const parsed = parseColor(computed.backgroundColor)
    if (parsed && parsed[3] > 0.01) {
      layers.push(parsed)
      if (parsed[3] >= 0.99) break
    } else if (computed.backgroundImage && computed.backgroundImage !== 'none') {
      sawImage = true
    }
    node = node.parentElement
  }
  if (layers.length === 0) {
    return sawImage ? null : 'light'
  }
  const opaque = layers[layers.length - 1]
  if (sawImage && (!opaque || opaque[3] < 0.99)) return null
  let r = 255
  let g = 255
  let b = 255
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    if (!layer) continue
    const [lr, lg, lb, la] = layer
    r = lr * la + r * (1 - la)
    g = lg * la + g * (1 - la)
    b = lb * la + b * (1 - la)
  }
  return relativeLuminance(r, g, b) > 0.5 ? 'light' : 'dark'
}

export function readReducedTransparency(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-transparency: reduce)').matches
  )
}

export function applyReducedTransparency(material: MaterialParams): MaterialParams {
  return {
    ...material,
    tintOpacity: Math.max(material.tintOpacity, 0.85),
    blur: Math.min(material.blur, 4),
    refraction: 0,
    dispersion: 0
  }
}

export function adaptTintToTone(
  material: MaterialParams,
  tone: BackdropTone | null,
  defaultTint: string
): MaterialParams {
  if (tone !== 'light' || material.tint !== defaultTint) return material
  return {
    ...material,
    tint: '#141414',
    tintOpacity: Math.max(material.tintOpacity, 0.12)
  }
}

export function watchMedia(query: string, onChange: (matches: boolean) => void): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const mql = matchMedia(query)
  if (typeof mql.addEventListener !== 'function') return () => {}
  const listener = (event: MediaQueryListEvent): void => onChange(event.matches)
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}
