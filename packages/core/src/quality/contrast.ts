import { relativeLuminance } from './a11y'

export interface LuminanceGrid {
  data: Float32Array
  cols: number
  rows: number
  docWidth: number
  docHeight: number
  docTop?: number
}

let grid: LuminanceGrid | null = null

const gridListeners = new Set<() => void>()

export function setLuminanceGrid(next: LuminanceGrid | null): void {
  grid = next
  for (const listener of [...gridListeners]) {
    try {
      listener()
    } catch {
      continue
    }
  }
}

export function onLuminanceGrid(cb: () => void): () => void {
  gridListeners.add(cb)
  return () => {
    gridListeners.delete(cb)
  }
}

export function getLuminanceGrid(): LuminanceGrid | null {
  return grid
}

export function backdropLuminance(rect: {
  left: number
  top: number
  width: number
  height: number
}): number | null {
  if (!grid || rect.width < 1 || rect.height < 1) return null
  const { data, cols, rows, docWidth, docHeight } = grid
  if (docWidth < 1 || docHeight < 1) return null
  const top = rect.top - (grid.docTop ?? 0)
  if (top + rect.height < 0 || top > docHeight) return null
  const x0 = Math.max(0, Math.floor((rect.left / docWidth) * cols))
  const x1 = Math.min(cols - 1, Math.ceil(((rect.left + rect.width) / docWidth) * cols) - 1)
  const y0 = Math.max(0, Math.floor((top / docHeight) * rows))
  const y1 = Math.min(rows - 1, Math.ceil(((top + rect.height) / docHeight) * rows) - 1)
  if (x1 < x0 || y1 < y0) return null
  let sum = 0
  let count = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      sum += data[y * cols + x]!
      count++
    }
  }
  return count > 0 ? sum / count : null
}

export function buildLuminanceGrid(
  source: HTMLCanvasElement,
  docWidth: number,
  docHeight: number,
  cols = 48,
  docTop = 0
): LuminanceGrid | null {
  if (typeof document === 'undefined' || docWidth < 1 || docHeight < 1) return null
  const rows = Math.max(1, Math.round((cols * docHeight) / docWidth))
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || typeof context.drawImage !== 'function') return null
  try {
    context.drawImage(source, 0, 0, cols, rows)
    const image = context.getImageData(0, 0, cols, rows)
    const data = new Float32Array(cols * rows)
    for (let i = 0; i < data.length; i++) {
      const p = i * 4
      data[i] = relativeLuminance(image.data[p]!, image.data[p + 1]!, image.data[p + 2]!)
    }
    return { data, cols, rows, docWidth, docHeight, docTop }
  } catch {
    return null
  }
}
