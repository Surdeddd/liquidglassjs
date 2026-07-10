import { define } from '@liquidglass/element'
import './style.css'

define()

function makeSceneImage(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const grad = ctx.createLinearGradient(0, 0, 900, 300)
  grad.addColorStop(0, '#ff9a5a')
  grad.addColorStop(0.5, '#b05cff')
  grad.addColorStop(1, '#28c8ff')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 900, 300)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  for (let i = 0; i < 12; i++) {
    ctx.beginPath()
    ctx.arc(75 * i + 30, 150 + Math.sin(i) * 80, 18, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.font = 'bold 56px system-ui'
  ctx.fillText('LIQUID GLASS SCENE', 90, 170)
  return canvas.toDataURL()
}

const app = document.querySelector('#app')
if (app) {
  app.innerHTML = `
    <main>
      <h1>LiquidGlassJS harness</h1>
      <div class="stage">
        <div class="stripes"></div>
        <section class="panels">
          <liquid-glass preset="frosted" backdrop=".stripes" class="panel"><span>frosted</span></liquid-glass>
          <liquid-glass preset="clear" backdrop=".stripes" class="panel"><span>clear</span></liquid-glass>
          <liquid-glass preset="tinted" backdrop=".stripes" class="panel"><span>tinted</span></liquid-glass>
          <liquid-glass preset="clear" backend="webgl-overlay" class="panel"><span>webgl-overlay</span></liquid-glass>
        </section>
      </div>
    </main>
  `
  const sceneUrl = makeSceneImage()
  const hero = document.createElement('div')
  hero.className = 'hero-scene'
  hero.style.backgroundImage = `url(${sceneUrl})`
  const lens = document.createElement('liquid-glass')
  lens.className = 'hero-lens'
  lens.setAttribute('preset', 'clear')
  lens.setAttribute('backend', 'webgl-scene')
  lens.setAttribute('backdrop', '.hero-scene')
  lens.setAttribute('scene-image', sceneUrl)
  lens.innerHTML = '<span>webgl-scene</span>'
  hero.appendChild(lens)
  app.querySelector('main')?.appendChild(hero)
}
