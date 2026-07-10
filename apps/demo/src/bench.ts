import { define } from '@surdeddd/liquidglass-element'

define()

const style = document.createElement('style')
style.textContent = `
  * { margin: 0; box-sizing: border-box; }
  body {
    height: 3200px;
    font-family: system-ui, sans-serif;
    color: #fff;
    background:
      radial-gradient(circle at 30% 20%, rgba(255,190,90,0.5) 0 120px, transparent 121px),
      radial-gradient(circle at 70% 60%, rgba(90,200,255,0.5) 0 140px, transparent 141px),
      repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 12px, transparent 12px 36px),
      linear-gradient(160deg, #14202e, #3b2a55);
  }
  .grid {
    position: fixed;
    inset: 40px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 24px;
  }
  liquid-glass {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.3);
  }
`
document.head.appendChild(style)

const app = document.querySelector('#app')
if (app) {
  const presets = ['clear', 'frosted', 'tinted']
  const grid = document.createElement('div')
  grid.className = 'grid'
  for (let i = 0; i < 10; i++) {
    const lens = document.createElement('liquid-glass')
    lens.setAttribute('preset', presets[i % 3] ?? 'clear')
    lens.textContent = `lens ${i + 1}`
    grid.appendChild(lens)
  }
  app.appendChild(grid)
}

declare global {
  interface Window {
    __fps?: number
  }
}

let frames = 0
let direction = 1
const start = performance.now()

function loop(now: number): void {
  frames++
  window.scrollBy(0, direction * 8)
  if (window.scrollY > 2000 || window.scrollY <= 0) direction *= -1
  if (now - start < 5000) {
    requestAnimationFrame(loop)
  } else {
    window.__fps = Math.round(frames / ((now - start) / 1000))
  }
}

requestAnimationFrame(loop)
