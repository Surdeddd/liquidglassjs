export interface ScrollEdgeOptions {
  position?: 'top' | 'bottom'
  size?: number
  strength?: number
}

export interface ScrollEdgeHandle {
  destroy(): void
}

export function mountScrollEdge(host: HTMLElement, options: ScrollEdgeOptions = {}): ScrollEdgeHandle {
  const position = options.position ?? 'top'
  const size = options.size ?? 96
  const strength = options.strength ?? 12
  const doc = host.ownerDocument
  const el = doc.createElement('div')
  el.className = 'lg-scroll-edge'
  el.setAttribute('aria-hidden', 'true')
  el.setAttribute('data-liquid-glass-layer', 'scroll-edge')
  el.setAttribute('data-liquid-glass-ignore', '')
  const isBody = host === doc.body
  const toEdge = position === 'top' ? 'to top' : 'to bottom'
  const style = el.style
  style.position = isBody ? 'fixed' : 'absolute'
  style.left = '0'
  style.right = '0'
  style[position] = '0'
  style.height = `${size}px`
  style.pointerEvents = 'none'
  style.zIndex = '2147483003'
  const filter = `blur(${strength}px)`
  style.setProperty('backdrop-filter', filter)
  style.setProperty('-webkit-backdrop-filter', filter)
  const mask = `linear-gradient(${toEdge}, transparent, rgba(0, 0, 0, 0.5) 40%, black)`
  style.setProperty('mask-image', mask)
  style.setProperty('-webkit-mask-image', mask)
  style.setProperty(
    'background',
    `linear-gradient(${toEdge}, transparent, rgba(4, 6, 12, 0.28))`
  )
  if (!isBody && typeof getComputedStyle === 'function') {
    const hostPosition = getComputedStyle(host).position
    if (hostPosition === 'static' || hostPosition === '') {
      host.style.setProperty('position', 'relative')
    }
  }
  host.appendChild(el)

  return {
    destroy() {
      el.remove()
    }
  }
}
