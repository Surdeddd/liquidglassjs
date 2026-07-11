import { captureInlineStyles } from './style-restore'

export interface GlowHandle {
  press(x: number, y: number): void
  release(): void
  destroy(): void
}

export function mountGlow(host: HTMLElement): GlowHandle {
  const el = host.ownerDocument.createElement('div')
  el.className = 'lg-glow'
  el.setAttribute('aria-hidden', 'true')
  el.setAttribute('data-liquid-glass-layer', 'glow')
  const style = el.style
  style.position = 'absolute'
  style.inset = '0'
  style.borderRadius = 'inherit'
  style.pointerEvents = 'none'
  style.opacity = '0'
  style.transition = 'opacity 140ms ease-out'
  style.setProperty('clip-path', 'inherit')
  style.setProperty('-webkit-clip-path', 'inherit')
  style.setProperty(
    'background',
    'radial-gradient(140px circle at var(--lg-glow-x, 50%) var(--lg-glow-y, 50%), rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.05) 55%, transparent 75%)'
  )
  const restore = captureInlineStyles(host, ['position'])
  if (typeof getComputedStyle === 'function') {
    const position = getComputedStyle(host).position
    if (position === 'static' || position === '') {
      host.style.setProperty('position', 'relative')
    }
  }
  host.appendChild(el)

  return {
    press(x: number, y: number) {
      el.style.setProperty('--lg-glow-x', `${Math.round(x)}px`)
      el.style.setProperty('--lg-glow-y', `${Math.round(y)}px`)
      el.style.transition = 'opacity 140ms ease-out'
      el.style.opacity = '1'
    },
    release() {
      el.style.transition = 'opacity 460ms ease-out'
      el.style.opacity = '0'
    },
    destroy() {
      el.remove()
      restore()
    }
  }
}
