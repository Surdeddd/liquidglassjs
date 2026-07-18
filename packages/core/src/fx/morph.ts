import { Spring } from '../physics/spring'

export interface MorphOptions {
  stiffness?: number
  damping?: number
}

const MORPH_SPRING = { stiffness: 320, damping: 26, mass: 1 }

function reducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function morphGlass(
  from: HTMLElement,
  to: HTMLElement,
  options: MorphOptions = {}
): Promise<void> {
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  from.style.visibility = 'hidden'
  if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
    return Promise.resolve()
  }
  const config = {
    stiffness: options.stiffness ?? MORPH_SPRING.stiffness,
    damping: options.damping ?? MORPH_SPRING.damping,
    mass: 1
  }
  const springs = {
    x: new Spring(a.left, config),
    y: new Spring(a.top, config),
    w: new Spring(Math.max(a.width, 1), config),
    h: new Spring(Math.max(a.height, 1), config)
  }
  springs.x.target = b.left
  springs.y.target = b.top
  springs.w.target = Math.max(b.width, 1)
  springs.h.target = Math.max(b.height, 1)

  const style = to.style
  const saved = {
    position: style.position,
    left: style.left,
    top: style.top,
    width: style.width,
    height: style.height,
    margin: style.margin,
    zIndex: style.zIndex
  }
  to.setAttribute('data-liquid-glass-morphing', 'true')
  style.position = 'fixed'
  style.margin = '0'
  style.zIndex = '2147483002'

  return new Promise(resolve => {
    let last = 0
    const step = (time: number): void => {
      const dt = last ? Math.min((time - last) / 1000, 1 / 20) : 1 / 60
      last = time
      let moving = false
      for (const spring of Object.values(springs)) {
        moving = spring.step(dt) || moving
      }
      style.left = `${springs.x.value.toFixed(2)}px`
      style.top = `${springs.y.value.toFixed(2)}px`
      style.width = `${springs.w.value.toFixed(2)}px`
      style.height = `${springs.h.value.toFixed(2)}px`
      if (moving) {
        requestAnimationFrame(step)
        return
      }
      style.position = saved.position
      style.left = saved.left
      style.top = saved.top
      style.width = saved.width
      style.height = saved.height
      style.margin = saved.margin
      style.zIndex = saved.zIndex
      to.removeAttribute('data-liquid-glass-morphing')
      resolve()
    }
    requestAnimationFrame(step)
  })
}
