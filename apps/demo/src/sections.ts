export function sceneImage(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const grad = ctx.createLinearGradient(0, 0, 900, 300)
  grad.addColorStop(0, '#0b1220')
  grad.addColorStop(0.45, '#123b52')
  grad.addColorStop(1, '#3a1f6b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 900, 300)
  ctx.strokeStyle = 'rgba(92, 225, 255, 0.55)'
  ctx.lineWidth = 2
  for (let i = -300; i < 900; i += 26) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 300, 300)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255, 180, 92, 0.9)'
  for (let i = 0; i < 14; i++) {
    ctx.beginPath()
    ctx.arc(64 * i + 40, 150 + Math.sin(i * 0.9) * 92, 9, 0, Math.PI * 2)
    ctx.fill()
  }
  return canvas.toDataURL()
}

export function hero(): string {
  return `
    <header class="hero">
      <p class="eyebrow" data-reveal>liquid glass engine</p>
      <h1 class="wordmark" data-reveal><span>LIQUID</span><span>GLASS</span></h1>
      <div class="hero-lens-track">
        <div class="hero-lens-carriage">
          <liquid-glass class="hero-lens" preset="clear" backdrop=".wordmark">
            <span>live dom</span>
          </liquid-glass>
        </div>
      </div>
    </header>
  `
}

export function ownedScene(scene: string): string {
  return `
    <div class="section-head" data-reveal>
      <h2>04 — owned scenes</h2>
      <p>full GPU optics when the glass owns what is behind it</p>
    </div>
    <section class="scene-stage" data-reveal>
      <liquid-glass
        class="scene-lens"
        preset="clear"
        backend="webgl-scene"
        scene-image="${scene}"
      ><span>webgl scene</span></liquid-glass>
    </section>
  `
}

export function optics(): string {
  return `
    <div class="section-head" data-reveal>
      <h2>01 — tiers</h2>
      <p>same API, best backend the browser can run</p>
    </div>
    <section class="stage" data-reveal>
      <div class="stripes"></div>
      <section class="panels">
        <liquid-glass class="panel panel--frosted" preset="frosted" backdrop=".stripes"><span>frosted</span></liquid-glass>
        <liquid-glass class="panel panel--clear" preset="clear" backdrop=".stripes"><span>clear</span></liquid-glass>
        <liquid-glass class="panel panel--tinted" preset="tinted" backdrop=".stripes"><span>tinted</span></liquid-glass>
        <liquid-glass class="panel panel--fallback" preset="clear" backend="css-fallback" backdrop=".stripes"><span>css-fallback</span></liquid-glass>
        <liquid-glass class="panel panel--squircle" preset="frosted" backdrop=".stripes" shape="squircle"><span>squircle</span></liquid-glass>
      </section>
    </section>
  `
}

export function adaptive(): string {
  return `
    <div class="section-head" data-reveal>
      <h2>02 — adaptive contrast</h2>
      <p>tint flips itself over light backdrops</p>
    </div>
    <section class="light-card" data-reveal>
      <liquid-glass class="panel light-lens" preset="clear"><span>adaptive contrast</span></liquid-glass>
    </section>
  `
}

export function metaballs(): string {
  return `
    <div class="section-head" data-reveal>
      <h2>03 — metaballs</h2>
      <p>lenses melt together on one shared overlay</p>
    </div>
    <section class="merge-stage" data-reveal>
      <liquid-glass class="blob blob-a" backend="webgl-overlay" merge="demo" preset="clear"></liquid-glass>
      <liquid-glass class="blob blob-b" backend="webgl-overlay" merge="demo" preset="clear"></liquid-glass>
    </section>
  `
}
