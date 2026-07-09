# LiquidGlassJS

Liquid Glass for the whole web — one engine, every browser, every framework.

[![CI](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml/badge.svg)](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@liquidglass/core)](https://www.npmjs.com/package/@liquidglass/core)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

> ⚠️ Early development. APIs are not stable yet.

## Why another liquid glass library?

Every existing implementation picked one rendering lane and died in it:

- **SVG filters in `backdrop-filter`** — real refraction over live DOM, but Chromium-only; Safari and Firefox silently degrade to flat blur.
- **WebGL over a DOM screenshot** — great optics everywhere, but the backdrop is a frozen raster: stale text, no CSS animations, CORS landmines.
- **WebGL with an owned background** — perfect physics, useless over arbitrary UI.
- **WebGPU + HTML-in-Canvas** — the endgame, still behind a Chrome flag.

LiquidGlassJS is a **capability-tiered engine**: it probes what the browser can do and routes each glass surface to the best available backend — under a single API. Fidelity silently improves as browsers ship new capabilities.

```
@liquidglass/core
├─ physics        springs, inertia, gel deformation — shared across all backends
├─ material       ior, frost, bevel, dispersion, specular, tint, presets
├─ dom-sync       resize / intersection / scroll tracking, viewport culling
├─ probe          capability detection → backend routing
└─ backends
   ├─ css-svg         backdrop-filter + displacement map   (Chromium, live DOM)
   ├─ svg-content     filter on content, wrap/copy modes    (Safari + Firefox, live DOM)
   ├─ webgl-overlay   one shared canvas for all lenses      (snapshot fallback)
   ├─ webgl-scene     owned background, full optics         (hero / landing scenes)
   └─ webgpu          HTML-in-Canvas                        (progressive, flag-gated today)
```

## Packages

| Package | Description |
|---|---|
| `@liquidglass/core` | Framework-agnostic engine, zero dependencies |
| `@liquidglass/element` | `<liquid-glass>` web component |
| `@liquidglass/react` | React 18 & 19 bindings |
| `@liquidglass/vue` | Vue 3 component + `v-liquid-glass` directive |
| `@liquidglass/svelte` | Svelte action + component |

## Quick start

```ts
import { attach } from '@liquidglass/core'

const glass = attach(document.querySelector('.panel'), { preset: 'frosted' })
glass.set({ preset: 'clear' })
glass.destroy()
```

```html
<script type="module">
  import { define } from '@liquidglass/element'
  define()
</script>

<liquid-glass preset="frosted">Hello</liquid-glass>
```

```tsx
import { LiquidGlass } from '@liquidglass/react'

<LiquidGlass as="nav" preset="clear">…</LiquidGlass>
```

## Roadmap

- [x] Competitive research — 25 implementations analyzed
- [x] Monorepo scaffolding, CI/CD, three-browser e2e
- [ ] Core: dom-sync, capability probe, material model
- [ ] Backend: css-svg (Chromium)
- [ ] Backend: svg-content (Safari + Firefox)
- [ ] Backends: webgl-overlay + webgl-scene
- [ ] Spring physics: press-squash, drag-wobble, release-settle
- [ ] Blob merge / shape morphing (SDF metaballs)
- [ ] Adaptive contrast + accessibility (`prefers-reduced-*`, WCAG under glass)
- [ ] Framework adapters + SSR smoke tests
- [ ] Playground studio + docs site

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm e2e
```

## License

MIT
