import { describe, expect, it } from 'vitest'
import { attach } from '../src/index'
import { PhysicsController, PHYSICS_DEFAULTS } from '../src/physics/controller'
import { captureInlineStyles } from '../src/style-restore'

const PRESET_STYLES: Record<string, string> = {
  background: 'rgb(1, 2, 3)',
  'border-radius': '7px',
  position: 'sticky',
  'z-index': '42',
  'box-shadow': 'rgb(0, 0, 0) 0px 1px 2px',
  'clip-path': 'circle(40%)',
  transform: 'rotate(3deg)'
}

function primedElement(): HTMLElement {
  const el = document.createElement('div')
  for (const [prop, value] of Object.entries(PRESET_STYLES)) {
    el.style.setProperty(prop, value)
  }
  document.body.appendChild(el)
  return el
}

function inlineSnapshot(el: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {}
  for (const prop of Object.keys(PRESET_STYLES)) {
    out[prop] = el.style.getPropertyValue(prop)
  }
  return out
}

describe('captureInlineStyles', () => {
  it('restores prior values including priority', () => {
    const el = document.createElement('div')
    el.style.setProperty('background', 'red', 'important')
    const restore = captureInlineStyles(el, ['background', 'border-radius'])
    el.style.setProperty('background', 'blue')
    el.style.setProperty('border-radius', '12px')
    restore()
    expect(el.style.getPropertyValue('background')).toBe('red')
    expect(el.style.getPropertyPriority('background')).toBe('important')
    expect(el.style.getPropertyValue('border-radius')).toBe('')
  })

  it('is a no-op restore for non-html elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    expect(() => captureInlineStyles(svg, ['fill'])()).not.toThrow()
  })
})

describe('destroy restores user inline styles', () => {
  for (const backend of ['css-fallback', 'css-svg', 'webgl-overlay'] as const) {
    it(`through ${backend} backend`, () => {
      const el = primedElement()
      const before = inlineSnapshot(el)
      const handle = attach(el, { backend, physics: false, adaptive: false })
      handle.destroy()
      expect(inlineSnapshot(el)).toEqual(before)
      el.remove()
    })
  }

  it('through the physics controller with prior inline transform and display', () => {
    const el = primedElement()
    el.style.setProperty('display', 'inline')
    const controller = new PhysicsController(el, { ...PHYSICS_DEFAULTS })
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5 }))
    controller.tick(1 / 60)
    expect(el.style.transform).not.toBe(PRESET_STYLES['transform'])
    controller.destroy()
    expect(el.style.transform).toBe(PRESET_STYLES['transform'])
    expect(el.style.getPropertyValue('display')).toBe('inline')
    el.remove()
  })

  it('keeps glass styles absent when the user had none', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = attach(el, { backend: 'css-fallback', physics: false, adaptive: false })
    expect(el.style.getPropertyValue('background')).not.toBe('')
    handle.destroy()
    expect(el.getAttribute('style') ?? '').toBe('')
    el.remove()
  })
})
