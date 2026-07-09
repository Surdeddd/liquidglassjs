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
          <liquid-glass preset="frosted" backdrop=".stripes" class="panel"><span>frosted</span></liquid-glass>
          <liquid-glass preset="clear" backdrop=".stripes" class="panel"><span>clear</span></liquid-glass>
          <liquid-glass preset="tinted" backdrop=".stripes" class="panel"><span>tinted</span></liquid-glass>
        </section>
      </div>
    </main>
  `
}
