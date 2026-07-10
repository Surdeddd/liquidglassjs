# LiquidGlassJS

Liquid Glass for the whole web — one engine, every browser, every framework.

[![CI](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml/badge.svg)](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@liquidglass/core)](https://www.npmjs.com/package/@liquidglass/core)
[![size](https://img.shields.io/badge/core-14.5kB_brotli-blue)](./packages/core)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Real refraction over live DOM — not a screenshot, not Chromium-only. Living spring physics,
iOS-26-style metaball merging, adaptive contrast, and accessibility baked in.

## Why another liquid glass library?

Every existing implementation picked one rendering lane and died in it. LiquidGlassJS probes what
the browser can do and routes each surface to the best available backend — under a single API:

```text
@liquidglass/core
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

## Packages

| Package | Description |
| --- | --- |
| `@liquidglass/core` | Framework-agnostic engine, zero dependencies, ~14.5 kB brotli |
| `@liquidglass/element` | `<liquid-glass>` web component |
| `@liquidglass/react` | React 18 & 19 component + hooks |
| `@liquidglass/vue` | Vue 3 component + `v-liquid-glass` directive |
| `@liquidglass/svelte` | Svelte action |

## Quick start

```ts
import { attach } from '@liquidglass/core'

const glass = attach(document.querySelector('.panel'), {
  preset: 'frosted',
  dispersion: 0.3,
  physics: { wobble: 0.8 }
})

glass.set({ preset: 'clear' })
glass.destroy()
```

```html
<script type="module">
  import { define } from '@liquidglass/element'
  define()
</script>

<liquid-glass preset="frosted" merge="dock">Hello</liquid-glass>
```

```tsx
import { LiquidGlass } from '@liquidglass/react'

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

- **Tiered rendering** — capability probe picks the best backend per browser; fidelity improves as browsers ship new APIs, your code never changes.
- **Metaballs** — lenses sharing a `merge` group melt into each other through an SDF smooth-min shader on one shared canvas.
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
[docs/research](docs/research/competitive-landscape.md).

## License

MIT
