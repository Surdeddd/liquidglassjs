# LiquidGlassJS

Liquid Glass for the whole web — one engine, every browser, every framework.

[![CI](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml/badge.svg)](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@surdeddd/liquidglass)](https://www.npmjs.com/package/@surdeddd/liquidglass)
[![size](https://img.shields.io/badge/engine-19.3kB_brotli-blue)](https://github.com/Surdeddd/liquidglassjs/tree/main/packages/core)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Surdeddd/liquidglassjs/blob/main/LICENSE)

Real refraction over live DOM — not a screenshot, not Chromium-only. Living spring physics,
iOS-26-style metaball merging, adaptive contrast, and accessibility baked in.

**[Live demo & playground →](https://liquidglassjs.vercel.app)** · [API reference](https://liquidglassjs.vercel.app/api/) · [npm](https://www.npmjs.com/package/@surdeddd/liquidglass)

[![LiquidGlassJS — real refraction over live DOM](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/hero.webp)](https://liquidglassjs.vercel.app)

## Why another liquid glass library?

Every existing implementation picked one rendering lane and died in it. LiquidGlassJS probes what
the browser can do and routes each surface to the best available backend — under a single API:

```text
@surdeddd/liquidglass
├─ physics        springs: press squash, release wobble, hover magnetism
├─ material       ior, frost, bevel, dispersion, specular, tint + presets
├─ a11y           backdrop tone sampling, reduced motion / transparency
├─ dom-sync       resize / intersection / scroll tracking
└─ backends
   ├─ css-svg         backdrop-filter + displacement maps   Chromium · live DOM
   ├─ svg-content     counter-positioned live copy          Safari + Firefox · live DOM
   ├─ webgl-scene     full GPU optics over owned scenes     explicit
   ├─ webgl-overlay   one shared canvas + page snapshot     metaball merging
   └─ css-fallback    graceful blur + tint                  everywhere
```

## How it compares

| | LiquidGlassJS | liquid-glass-react | liquidGL | samasante | liquid-dom |
| --- | --- | --- | --- | --- | --- |
| Live-DOM refraction in Chromium | ✅ | ✅ | ❌ snapshot | ✅ | 🚧 behind flag |
| Live-DOM refraction in Safari/Firefox | ✅ | ❌ flat blur | ❌ snapshot | ✅ manual mode | ❌ |
| Automatic capability tiering | ✅ | ❌ | ❌ | ❌ | ❌ |
| Physics system (press/wobble/hover) | ✅ | partial | ❌ | partial | ❌ |
| Metaball merging over your page | ✅ | ❌ | ❌ | ❌ | ❌ |
| Adaptive contrast (auto tint + tone hook) | ✅ | ❌ manual flag | ❌ | ❌ | ❌ |
| prefers-reduced-motion / transparency | ✅ | ❌ | ❌ | ❌ | ❌ |
| Frameworks | vanilla · element · react 18+19 · vue 3 · svelte | react 19 only | vanilla | react | react 19 |
| Core dependencies | 0 | — | 0 | — | — |

## What it looks like

| [Spring physics](https://liquidglassjs.vercel.app/#physics) | [Metaball merging + tab bar](https://liquidglassjs.vercel.app/#metaballs) |
| --- | --- |
| ![Press squash, wobbly release, magnetic hover](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/physics.webp) | ![Lenses melting together over the live page](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/metaballs.webp) |

| [iOS showcase](https://liquidglassjs.vercel.app/#ios) | [Config-exporting playground](https://liquidglassjs.vercel.app/#playground) |
| --- | --- |
| ![Lock screen, control center and tab bar rebuilt from library primitives](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/ios.webp) | ![Material sliders that export an attach() config](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/playground.webp) |

## One package

| Entry | What you get |
| --- | --- |
| [`@surdeddd/liquidglass`](https://www.npmjs.com/package/@surdeddd/liquidglass) | Framework-agnostic engine — `attach()`, zero dependencies |
| `@surdeddd/liquidglass/element` | `<liquid-glass>` web component, works in any framework |
| `@surdeddd/liquidglass/react` | React 18 & 19 component + hooks |
| `@surdeddd/liquidglass/vue` | Vue 3 component + `v-liquid-glass` directive |
| `@surdeddd/liquidglass/svelte` | Svelte action |

React, Vue and Svelte are optional peers — install only the framework you already use.

## Quick start

```sh
npm i @surdeddd/liquidglass
```

No build step — one script tag from a CDN:

```html
<div data-liquid-glass-auto='{"preset":"frosted"}'>glass</div>
<script src="https://unpkg.com/@surdeddd/liquidglass"></script>
<script>
  LiquidGlass.autoAttach()
</script>
```

```ts
import { attach } from '@surdeddd/liquidglass'

const glass = attach(document.querySelector('.panel'), {
  preset: 'frosted',
  ior: 1.5,
  dispersion: 0.3,
  motionLight: true,
  physics: { wobble: 0.8 }
})

glass.set({ preset: 'clear' })
glass.destroy()
```

```html
<script type="module">
  import { define } from '@surdeddd/liquidglass/element'
  define()
</script>

<liquid-glass preset="frosted" merge="dock">Hello</liquid-glass>
```

```tsx
import { LiquidGlass } from '@surdeddd/liquidglass/react'

<LiquidGlass as="nav" preset="clear" dispersion={0.3}>…</LiquidGlass>
```

```vue
<LiquidGlass preset="frosted" :options="{ dispersion: 0.3 }">…</LiquidGlass>
<div v-liquid-glass="{ preset: 'clear' }">…</div>
```

```svelte
<div use:liquidGlass={{ preset: 'frosted' }}>…</div>
```

## Highlights

- **Real lens optics** — a convex squircle dome refracted by Snell's law (`ior`, default 1.5): optically flat interior with a subtle whole-body magnification (`magnify`) and all the bending concentrated in a rim band that tracks your corner radius, exactly like iOS 26.
- **Edge chromatic aberration** — `dispersion` splits R/G/B along the rim on every backend, including the default Chromium path.
- **Living specular bezel** — a two-tone rim highlight that follows the pointer (or device tilt with `motionLight: true`) instead of a painted-on gradient.
- **Tiered rendering** — capability probe picks the best backend per browser; fidelity improves as browsers ship new APIs, your code never changes.
- **Metaballs** — wrap lenses in `<liquid-glass-group spacing="48">` (or share a `merge` group) and they melt into each other through an SDF smooth-min shader, the GlassEffectContainer way.
- **Scroll edge** — `mountScrollEdge(document.body, { position: 'top' })` progressively dissolves content under your floating bars, like iOS scroll edge effects.
- **Morphing** — `morphGlass(from, to)` hands one control's geometry to another on a spring, the glassEffectID transition.
- **Living physics** — a mass–spring–damper system drives gel squash, wobbly release and magnetic hover on any backend; sleeps when idle.
- **Adaptive contrast** — glass samples backdrop luminance, flips its own tint over light content and exposes `data-liquid-glass-tone` for your text.
- **Accessible by default** — reduced motion and reduced transparency are respected live; every injected layer is aria-hidden.
- **Fast** — 10 lenses at 105 fps on Apple silicon (bench script included); render-on-demand everywhere, no idle loops.

## Development

```sh
pnpm install
pnpm build && pnpm test && pnpm e2e && pnpm ssr
node scripts/fps-bench.mjs --headed
```

The landing + playground lives in `apps/docs`, the test harness in `apps/demo`, research notes in
[docs/research](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/research/competitive-landscape.md).

## License

MIT
