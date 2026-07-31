# Architecture

One package on npm (`@surdeddd/liquidglass`), five workspace modules behind it. The engine lives in `packages/core`.

## Core module map

```text
packages/core/src
├── engine.ts          attach/set/destroy lifecycle, backend selection, degrade watchdog
├── index.ts           the only public entry — everything re-exports through here
├── types.ts           public option/handle types
├── material.ts        presets, clamps, resolveMaterial
├── optics.ts          Snell lens profile, interior magnification
├── displacement.ts    SDFs, offset fields, lens map pixels + png encoding, LRU
├── color.ts           tint parsing and alpha composition
├── options.ts         option-key map, resetMissingOptions
├── style-restore.ts   inline-style snapshot/restore for clean destroy
├── auto.ts            autoAttach scanner for data-liquid-glass-auto
├── runtime/
│   ├── scheduler.ts   the single rAF loop + shared scroll/resize listeners
│   ├── dom-sync.ts    SurfaceTracker: rect/visibility per glass, fed by scheduler
│   └── events.ts      micro emitter behind handle.on()
├── quality/
│   ├── probe.ts       capability detection (webgl2, backdrop-filter url, media)
│   ├── profile.ts     device tier → QualityProfile, configure(), fps watchdog
│   ├── contrast.ts    document luminance grid for adaptive tone
│   └── a11y.ts        media watchers, reduced transparency, tone adaptation
├── fx/
│   ├── bezel.ts       two-tone specular ring driven by the light angle
│   ├── light.ts       pointer/orientation light direction hub
│   ├── glow.ts        press glow layer
│   ├── morph.ts       spring FLIP morph between elements
│   └── scroll-edge.ts progressive-blur scroll edges
├── physics/           mass-spring-damper press/hover controller
├── backends/          css-fallback · css-svg · svg-content · webgl-overlay · webgl-scene + registry
├── gl/                shared WebGL2 renderer (sdf shapes, refraction shader)
└── worker/            lens-map worker source + host with sync fallback
```

## Dependency direction

`index` → `engine` → everything else. `backends` and `fx` may import `runtime`, `quality`, and the material math; nothing imports `engine` back. `worker/lens-worker` is compiled to a separate bundle and inlined as text at build time (`virtual:lens-worker`), spawned from a Blob with a synchronous in-thread fallback.

## Rendering tiers

Auto-selection walks these by priority:

1. `css-svg` (30) — per-element SVG displacement filter through `backdrop-filter: url(#…)`.
2. `svg-content` (20) — WebKit and Gecko path: positioned clone of the backdrop refracted through an SVG filter.
3. `webgl-overlay` (10) — one shared canvas for every glass, page snapshot as texture, metaball merging.
4. `css-fallback` (0) — blur/saturation/tint only, supported everywhere.

`webgl-scene` is never auto-selected. It owns its own scene rather than refracting the page, so it
is opt-in through `backend: 'webgl-scene'` plus `sceneImage`. `webgl-overlay` is reachable under
`auto` only where the two SVG tiers are unsupported, or when `merge` asks for metaballs — which is
also the only tier the fps watchdog can demote, once per page.

The meta package (`packages/liquidglass`) bundles all of this into one artifact: esm + cjs subpath
entries that share a single core runtime, plus an iife global build for CDN script tags that also
registers `<liquid-glass>` on load.
