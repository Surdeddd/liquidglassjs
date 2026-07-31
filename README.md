# LiquidGlassJS

Liquid Glass for the whole web — one engine, every browser, every framework.

[![CI](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml/badge.svg)](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@surdeddd/liquidglass)](https://www.npmjs.com/package/@surdeddd/liquidglass)
[![size](https://img.shields.io/bundlephobia/minzip/@surdeddd/liquidglass)](https://bundlephobia.com/package/@surdeddd/liquidglass)
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

Competitor capabilities as of July 2026 — methodology and sources in
[docs/research/competitive-landscape.md](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/research/competitive-landscape.md).
The engine ships zero runtime dependencies; the optional snapshot tier bundles a vendored copy of
`html-to-image` into a lazily imported chunk, credited in `THIRD-PARTY-NOTICES.md`.

## Requirements

| | Supported |
| --- | --- |
| React | `>=18 <20` |
| Vue | `^3.4` |
| Svelte | `4` or `5` |
| Node (toolchain only) | `>=20.19` |
| Chromium | 76+ for the CSS tier, WebGL2 for the GL tiers |
| Safari | 18+ for the content tier (`filter: url()` on live DOM) |
| Firefox | 128+ for the content tier |

Anything older lands on `css-fallback`, which is blur and tint — never a broken surface. Per-engine
detail and the fidelity matrix live in
[docs/browser-support.md](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/browser-support.md).

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

The CDN build carries the web component and registers `<liquid-glass>` on load, so a script tag is
the whole setup. Drop the version to track latest at your own risk.

```html
<liquid-glass preset="frosted">Hello</liquid-glass>
<div data-liquid-glass-auto='{"preset":"clear"}'>glass</div>

<script src="https://unpkg.com/@surdeddd/liquidglass@0.8.0/dist/liquidglass.global.js"></script>
<script>
  LiquidGlass.autoAttach()
</script>
```

```ts
import { attach } from '@surdeddd/liquidglass'

const panel = document.querySelector<HTMLElement>('.panel')
if (panel) {
  const glass = attach(panel, {
    preset: 'frosted',
    ior: 1.5,
    dispersion: 0.3,
    motionLight: true,
    physics: { wobble: 0.8 }
  })

  glass.on('tonechange', tone => console.log('backdrop is', tone))
  glass.set({ preset: 'clear' })
  glass.destroy()
}
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
<script setup>
import { LiquidGlass, vLiquidGlass } from '@surdeddd/liquidglass/vue'
</script>

<template>
  <LiquidGlass preset="frosted" :options="{ dispersion: 0.3 }">…</LiquidGlass>
  <div v-liquid-glass="{ preset: 'clear' }">…</div>
</template>
```

```svelte
<script>
  import { liquidGlass, glass } from '@surdeddd/liquidglass/svelte'
</script>

<div use:liquidGlass={{ preset: 'frosted' }}>…</div>

<!-- svelte 5 attachment -->
<div {@attach glass({ preset: 'frosted' })}>…</div>
```

The Vue directive is registered locally by importing `vLiquidGlass` into `<script setup>`; register
it globally with `app.directive('liquid-glass', vLiquidGlass)` if you prefer.

On Safari and Firefox the engine refracts a designated element rather than the whole page. It picks
the nearest ancestor that paints a background on its own; pass `backdrop` when you want a specific
one — it is also the cheaper choice, because that element gets cloned into the refraction layer.

```ts
attach(panel, { backdrop: '.hero-art' })
```

## Options

Every option is optional and can be changed at runtime through `set()`. Numeric values are clamped
to the range shown; anything non-finite falls back to the default.

| Option | Type | Default | Range | Notes |
| --- | --- | --- | --- | --- |
| `preset` | `'clear' \| 'frosted' \| 'tinted'` | `'clear'` | — | Starting point for every material value below |
| `blur` | number | 2 / 10 / 8 per preset | 0–100 | Backdrop blur in px |
| `saturation` | number | 1.4 | 0–3 | Backdrop saturation multiplier |
| `brightness` | number | 1 | 0–3 | Backdrop brightness multiplier |
| `tint` | string | `#ffffff` | hex or `rgb()` | Set it explicitly to opt out of adaptive tinting |
| `tintOpacity` | number | 0.06–0.28 per preset | 0–1 | Tint alpha |
| `refraction` | number | 0.45–0.65 per preset | 0–1 | Strength of the rim bend |
| `ior` | number | 1.5 | 1–2.5 | Index of refraction; 1 bends nothing |
| `magnify` | number | 0.015 | 0–0.1 | Whole-body magnification |
| `thickness` | number \| `'auto'` | `'auto'` | 0–100 | Glass depth in px |
| `bevelWidth` | number \| `'auto'` | `'auto'` | 0–200 | Rim band width; `auto` tracks the corner radius |
| `bevelDepth` | number | 0.6 | 0–1 | Rim profile curvature |
| `dispersion` | number | 0.15 | 0–1 | Chromatic split at the rim — Chromium and WebGL tiers only |
| `specular` | number | 0.6 | 0–1 | Bezel highlight strength; 0 removes the bezel layer |
| `frost` | number | 0–0.35 per preset | 0–1 | Grain displacement |
| `radius` | number \| `'auto'` | `'auto'` | ≥ 0 | `auto` reads the element's border-radius |
| `shape` | `'rounded' \| 'squircle'` | `'rounded'` | — | Squircle also clips the host |
| `backend` | `BackendId \| 'auto'` | `'auto'` | — | Honoured only if the tier is supported |
| `backdrop` | `Element \| string \| null` | `null` | — | Refraction source for `svg-content` |
| `sceneImage` | string \| null | `null` | — | Texture for `webgl-scene` |
| `physics` | boolean \| `{ press, hover, wobble }` | `true` | `wobble` 0–1 | Disabled entirely under reduced motion |
| `merge` | string \| null | `null` | — | Metaball group name; needs `webgl-overlay` |
| `mergeStrength` | number | 40 | px | Distance at which group members melt together |
| `adaptive` | boolean | `true` | — | Backdrop tone sampling and automatic tint flip |
| `motionLight` | boolean | `false` | — | Drive the bezel highlight from device orientation |

## Runtime and events

```ts
const glass = attach(el, { preset: 'frosted' })

glass.on('backendchange', id => console.log('now rendering with', id))
glass.on('tonechange', tone => root.classList.toggle('on-light', tone === 'light'))
glass.on('press', point => console.log('pressed at', point.x, point.y))
glass.on('release', () => {})
glass.on('degrade', id => console.log('fps watchdog dropped to', id))

glass.options.preset
```

Every payload is typed per event: `backendchange` and `degrade` give a `BackendId`, `tonechange`
gives `'light' | 'dark' | null`, `press` gives the point in client coordinates, `release` gives
`null`. `handle.options` reports the resolved configuration, and every subscription returns its own
unsubscribe function.

The web component mirrors the same events onto the DOM as composed `liquid-glass:*` CustomEvents,
so a page without a handle can listen too:

```js
document.addEventListener('liquid-glass:tonechange', event => console.log(event.detail))
```

**One glass per element.** `attach()` on an element that already has one returns the same handle and
applies the new options — it is attach-or-update, not a second surface. `destroy()` and `detach()`
remove it for everyone, so two independent owners on the same node share a lifetime; give them
separate elements if they need separate lifetimes. Calling `destroy()` twice is safe, and a stale
handle cannot tear down a surface that was attached after it.

Beyond the handle:

| API | What it does |
| --- | --- |
| `autoAttach(root?)` | Attaches every `[data-liquid-glass-auto]` element and keeps watching for new ones. Returns a stop function; inert without a DOM |
| `configure({ mapSide, caPasses, maxDpr, snapshotThrottleMs })` | Overrides the quality profile the device tier picked |
| `deviceTier()` / `getQuality()` | Reads what the engine decided for this device |
| `probeCapabilities()` | The capability snapshot behind backend selection |
| `mountScrollEdge(el, { position })` | Progressive blur edge for floating bars |
| `morphGlass(from, to)` | Hands one control's geometry to another on a spring |
| `getInstance(el)` / `detach(el)` | Reach or tear down a surface you did not keep a handle to |

The resolved state is also on the element, which makes it inspectable in devtools:
`data-liquid-glass` (preset), `data-liquid-glass-backend`, `data-liquid-glass-tone`,
`data-liquid-glass-pressed`, `data-liquid-glass-degraded`.

## Highlights

- **Real lens optics** — a convex squircle dome refracted by Snell's law (`ior`, default 1.5): optically flat interior with a subtle whole-body magnification (`magnify`) and all the bending concentrated in a rim band that tracks your corner radius, exactly like iOS 26.
- **Edge chromatic aberration** — `dispersion` splits R/G/B along the rim on the Chromium and WebGL paths ([fidelity matrix](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/browser-support.md#fidelity-matrix)).
- **Living specular bezel** — a two-tone rim highlight that follows the pointer (or device tilt with `motionLight: true`) instead of a painted-on gradient.
- **Tiered rendering** — capability probe picks the best backend per browser; fidelity improves as browsers ship new APIs, your code never changes.
- **Metaballs** — wrap lenses in `<liquid-glass-group spacing="48">` (or share a `merge` group) and they melt into each other through an SDF smooth-min shader, the GlassEffectContainer way.
- **Scroll edge** — `mountScrollEdge(document.body, { position: 'top' })` progressively dissolves content under your floating bars, like iOS scroll edge effects.
- **Morphing** — `morphGlass(from, to)` hands one control's geometry to another on a spring, the glassEffectID transition.
- **Living physics** — a mass–spring–damper system drives gel squash, wobbly release and magnetic hover on any backend; sleeps when idle.
- **Adaptive contrast** — glass samples backdrop luminance, flips its own tint over light content and exposes `data-liquid-glass-tone` for your text.
- **Accessible by default** — reduced motion and reduced transparency are respected live; every injected layer is aria-hidden.
- **Fast** — 10 lenses at 105 fps on Apple silicon (bench script included); render-on-demand everywhere, no idle loops.

## Troubleshooting

**Safari or Firefox shows flat blur.** Those engines refract a cloned source rather than the live
backdrop. The engine falls back to the nearest ancestor that paints a background — if every ancestor
is transparent, nothing can be cloned. Pass `backdrop` explicitly.

**`merge` does nothing.** Metaball merging exists only on `webgl-overlay`. Under `backend: 'auto'`
the engine now switches to it when a `merge` group is set and WebGL2 is available; if WebGL2 is
missing, the group is dropped and the engine logs it once. `<liquid-glass-group>` sets the backend
for its children.

**Strict CSP blocks the worker.** Lens maps are generated in a worker spawned from a `Blob` URL, so
allow `worker-src blob:`. Without it the library silently generates maps on the main thread — same
output, more main-thread work.

**Next.js / Nuxt / SvelteKit.** Every entry imports cleanly on the server and `attach()` is a
client-side call; run it from an effect. `autoAttach()` is safe to call anywhere — it returns an
inert stop function when there is no DOM.

**Images vanish inside a metaball group.** The `webgl-overlay` tier rasterizes the page to a
texture, so cross-origin images without CORS headers and webfonts that cannot be inlined do not make
it into the snapshot.

**Reduced transparency or Windows High Contrast.** The surface switches to an opaque material
(refraction and dispersion off, tint raised). This is deliberate, and it follows the OS setting live.

**Text over glass is unreadable.** `adaptive` samples the backdrop and flips the default tint, but it
cannot resolve a luminance over an unpainted or image-only backdrop. Use the `tonechange` event or
the `data-liquid-glass-tone` attribute to style text yourself, or set `tint` explicitly.

## Development

```sh
pnpm install
pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm coverage && pnpm ssr && pnpm size
pnpm e2e
```

That is the same list CI runs, in the same order. `pnpm build` comes first because the framework
adapters resolve the engine through its built output, so their tests run against `packages/core/dist`
rather than `src`.

The fps benchmark needs the demo served first:

```sh
pnpm --filter demo dev          # one shell
pnpm bench                      # another; exits non-zero below 55 fps
```

Headed Chromium on an M-series machine reports ~105 fps for ten lenses over five seconds of
scrolling; headless on SwiftShader lands near 40, which is a software rasterizer figure rather than
a rendering regression.

The landing + playground lives in `apps/docs`, the test harness in `apps/demo`, research notes in
[docs/research](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/research/competitive-landscape.md).

Engine-by-engine behaviour, the per-backend fidelity matrix and the platform version floors live in
[docs/browser-support.md](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/browser-support.md).

## License

MIT
