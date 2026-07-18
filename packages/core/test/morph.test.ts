import { describe, expect, it } from 'vitest'
import { morphGlass } from '../src/fx/morph'

function rect(left: number, top: number, width: number, height: number): () => DOMRect {
  return () =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({})
    }) as DOMRect
}

describe('morphGlass', () => {
  it('springs the target from the source rect and restores inline styles', async () => {
    const from = document.createElement('div')
    const to = document.createElement('div')
    document.body.append(from, to)
    from.getBoundingClientRect = rect(10, 20, 100, 40)
    to.getBoundingClientRect = rect(300, 220, 180, 64)

    const done = morphGlass(from, to, { stiffness: 900, damping: 60 })
    expect(from.style.visibility).toBe('hidden')
    await new Promise(r => setTimeout(r, 30))
    if (to.hasAttribute('data-liquid-glass-morphing')) {
      expect(to.style.position).toBe('fixed')
    }
    await done
    expect(to.hasAttribute('data-liquid-glass-morphing')).toBe(false)
    expect(to.style.position).toBe('')
    expect(to.style.width).toBe('')
    from.remove()
    to.remove()
  })
})
