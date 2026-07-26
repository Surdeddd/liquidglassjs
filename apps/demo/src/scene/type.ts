export interface GlyphField {
  points: Float32Array
  count: number
  width: number
  height: number
}

const WORDS = ['LIQUID', 'GLASS']

export function buildGlyphField(width: number, height: number, density: number): GlyphField {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.floor(width))
  canvas.height = Math.max(2, Math.floor(height))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { points: new Float32Array(0), count: 0, width, height }

  const size = Math.min(canvas.width / 7.6, canvas.height / 4.4)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${size}px "Unbounded", "Arial Black", system-ui, sans-serif`
  WORDS.forEach((word, index) => {
    const y = canvas.height / 2 + (index - (WORDS.length - 1) / 2) * size * 1.02
    ctx.fillText(word, canvas.width / 2, y)
  })

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const step = Math.max(2, Math.round(canvas.width / density))
  const found: number[] = []
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const alpha = image[(y * canvas.width + x) * 4 + 3] ?? 0
      if (alpha > 128) {
        found.push(x, canvas.height - y)
      }
    }
  }

  return {
    points: new Float32Array(found),
    count: found.length / 2,
    width: canvas.width,
    height: canvas.height
  }
}
