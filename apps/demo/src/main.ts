import { define, deviceTier } from '@surdeddd/liquidglass-element'
import { animate, inView } from 'motion'
import { adaptive, hero, metaballs, optics, ownedScene, sceneImage } from './sections'
import { mountScene } from './scene/renderer'
import './style.css'

define()

const params = new URLSearchParams(location.search)
const frozen = params.get('static') === '1'
const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const animated = !frozen && !reducedMotion

const TIERS = {
  high: { density: 190, pointSize: 2.6 },
  mid: { density: 150, pointSize: 2.8 },
  low: { density: 90, pointSize: 3.2 }
}

const app = document.querySelector('#app')
if (app) {
  const sceneHost = document.createElement('div')
  sceneHost.className = 'scene-host'
  document.body.insertBefore(sceneHost, document.body.firstChild)

  app.innerHTML = `
    <main>
      ${hero()}
      ${optics()}
      ${adaptive()}
      ${metaballs()}
      ${ownedScene(sceneImage())}
    </main>
  `

  const tier = TIERS[frozen ? 'low' : deviceTier()]
  const scene = mountScene(sceneHost, { ...tier, animated })

  if (scene) {
    if (animated) {
      animate(0, 1, {
        duration: 2.4,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: value => scene.settle(value)
      })
    } else {
      scene.settle(1)
    }
  }

  if (animated) {
    for (const node of document.querySelectorAll('[data-reveal]')) {
      const el = node as HTMLElement
      el.style.opacity = '0'
      inView(
        el,
        target => {
          animate(
            target,
            { opacity: [0, 1], transform: ['translateY(26px)', 'translateY(0px)'] },
            { duration: 0.75, ease: [0.16, 1, 0.3, 1] }
          )
        },
        { amount: 0.15 }
      )
    }

    const carriage = document.querySelector('.hero-lens-carriage')
    if (carriage) {
      animate(
        carriage,
        { transform: ['translateX(-180px)', 'translateX(180px)'] },
        { duration: 9, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }
      )
    }
  }
}
