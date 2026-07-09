export interface DisplacementSpec {
  width: number
  height: number
  radius: number
  bevelWidth: number
  bevelDepth: number
}

export function sdfRoundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): number {
  const hx = width / 2
  const hy = height / 2
  const r = Math.min(radius, hx, hy)
  const px = Math.abs(x - hx) - (hx - r)
  const py = Math.abs(y - hy) - (hy - r)
  const ax = Math.max(px, 0)
  const ay = Math.max(py, 0)
  const outside = Math.hypot(ax, ay)
  const inside = Math.min(Math.max(px, py), 0)
  return outside + inside - r
}

export function displacementAt(x: number, y: number, spec: DisplacementSpec): [number, number] {
  const depth = -sdfRoundedRect(x, y, spec.width, spec.height, spec.radius)
  if (depth < 0 || depth >= spec.bevelWidth) return [0, 0]
  const t = depth / spec.bevelWidth
  const magnitude = Math.pow(1 - t, 1 + spec.bevelDepth * 2)
  const eps = 1
  const gx =
    sdfRoundedRect(x + eps, y, spec.width, spec.height, spec.radius) -
    sdfRoundedRect(x - eps, y, spec.width, spec.height, spec.radius)
  const gy =
    sdfRoundedRect(x, y + eps, spec.width, spec.height, spec.radius) -
    sdfRoundedRect(x, y - eps, spec.width, spec.height, spec.radius)
  const length = Math.hypot(gx, gy)
  if (length === 0) return [0, 0]
  return [(gx / length) * magnitude, (gy / length) * magnitude]
}

const MAX_MAP_SIDE = 600

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d')
  } catch {
    return null
  }
}

export function generateDisplacementMap(spec: DisplacementSpec): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || spec.width < 1 || spec.height < 1) return null
  const scale = Math.min(1, MAX_MAP_SIDE / Math.max(spec.width, spec.height))
  const width = Math.max(1, Math.round(spec.width * scale))
  const height = Math.max(1, Math.round(spec.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = context2d(canvas)
  if (!context || typeof context.createImageData !== 'function') return null
  const image = context.createImageData(width, height)
  const data = image.data
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const [dx, dy] = displacementAt((px + 0.5) / scale, (py + 0.5) / scale, spec)
      const i = (py * width + px) * 4
      data[i] = 128 + Math.round(dx * 127)
      data[i + 1] = 128 + Math.round(dy * 127)
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}
