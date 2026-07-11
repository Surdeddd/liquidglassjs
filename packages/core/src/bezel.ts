export interface BezelHandle {
  update(angleDeg: number): void
  destroy(): void
}

export function mountBezel(host: HTMLElement, specular: number): BezelHandle {
  const doc = host.ownerDocument
  const el = doc.createElement('div')
  el.className = 'lg-bezel'
  el.setAttribute('aria-hidden', 'true')
  el.setAttribute('data-liquid-glass-layer', 'bezel')
  const style = el.style
  style.position = 'absolute'
  style.inset = '0'
  style.borderRadius = 'inherit'
  style.pointerEvents = 'none'
  style.padding = '1.5px'
  style.setProperty('--lg-bezel-hi', (0.55 * specular).toFixed(3))
  style.setProperty('--lg-bezel-lo', (0.22 * specular).toFixed(3))
  style.setProperty('--lg-bezel-dark', (0.25 * specular).toFixed(3))
  style.setProperty('--lg-bezel-half', (0.12 * specular).toFixed(3))
  style.setProperty(
    'background',
    'conic-gradient(from calc(var(--lg-light-angle, 135deg) - 90deg), ' +
      'rgba(255,255,255,var(--lg-bezel-hi)) 0deg, rgba(255,255,255,var(--lg-bezel-lo)) 70deg, ' +
      'rgba(0,0,0,var(--lg-bezel-half)) 150deg, rgba(0,0,0,var(--lg-bezel-dark)) 180deg, ' +
      'rgba(0,0,0,var(--lg-bezel-half)) 210deg, rgba(255,255,255,var(--lg-bezel-lo)) 290deg, ' +
      'rgba(255,255,255,var(--lg-bezel-hi)) 360deg)'
  )
  style.setProperty('mask', 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)')
  style.setProperty('-webkit-mask', 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)')
  style.setProperty('-webkit-mask-composite', 'xor')
  style.setProperty('mask-composite', 'exclude')
  style.setProperty('clip-path', 'inherit')
  style.setProperty('-webkit-clip-path', 'inherit')

  let madePositioned = false
  if (typeof getComputedStyle === 'function') {
    const position = getComputedStyle(host).position
    if (position === 'static' || position === '') {
      host.style.setProperty('position', 'relative')
      madePositioned = true
    }
  }
  host.appendChild(el)

  return {
    update(angleDeg: number) {
      host.style.setProperty('--lg-light-angle', `${Math.round(angleDeg * 10) / 10}deg`)
    },
    destroy() {
      el.remove()
      host.style.removeProperty('--lg-light-angle')
      if (madePositioned) host.style.removeProperty('position')
    }
  }
}
