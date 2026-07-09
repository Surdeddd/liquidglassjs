import { define } from '@liquidglass/element'
import './style.css'

define()

const app = document.querySelector('#app')
if (app) {
  app.innerHTML = `
    <main>
      <h1>LiquidGlassJS harness</h1>
      <div class="stage">
        <div class="stripes"></div>
        <section class="panels">
          <liquid-glass preset="frosted" class="panel"><span>frosted</span></liquid-glass>
          <liquid-glass preset="clear" class="panel"><span>clear</span></liquid-glass>
          <liquid-glass preset="tinted" class="panel"><span>tinted</span></liquid-glass>
        </section>
      </div>
    </main>
  `
}
