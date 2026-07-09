import { define } from '@liquidglass/element'
import './style.css'

define()

const app = document.querySelector('#app')
if (app) {
  app.innerHTML = `
    <main>
      <liquid-glass preset="frosted" class="hero">
        <h1>LiquidGlassJS</h1>
        <p>Liquid Glass for the whole web — one engine, every browser, every framework.</p>
        <p class="soon">Docs, live playground and API reference are on the way. API reference: <a href="/api/">/api</a></p>
      </liquid-glass>
    </main>
  `
}
