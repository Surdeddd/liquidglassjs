# Browser support

LiquidGlassJS never asks "is this browser good enough?" — it probes what the engine can actually do
and routes each surface to the best backend available. Every browser gets glass; the fidelity
differs, and this page documents exactly how.

## What each engine gets

| Engine | Auto-selected backend | Refraction over live DOM | Notes |
| --- | --- | --- | --- |
| Blink (Chrome, Edge, Opera, Samsung Internet) | `css-svg` | yes | `backdrop-filter: url(#…)` with a generated displacement map |
| WebKit (Safari desktop, all iOS browsers) | `svg-content` | yes | counter-positioned live clone refracted through `filter: url(#…)` |
| Gecko (Firefox) | `svg-content` | yes | same path as WebKit |
| Anything older / filters unavailable | `css-fallback` | no | blur + saturation + tint, never looks broken |

`webgl-overlay` and `webgl-scene` are never picked automatically in a modern browser — see
[Forcing and debugging a backend](#forcing-and-debugging-a-backend).

## How the tier is chosen

`probeCapabilities()` runs once per page and caches the result:

| Capability | Detected by |
| --- | --- |
| `backdropFilter` | `CSS.supports('backdrop-filter', 'blur(1px)')` or the `-webkit-` form |
| `backdropFilterUrl` | `backdropFilter` **and** a Blink user agent **and** `CSS.supports('backdrop-filter', 'url(#lg)')` |
| `svgFilterOnContent` | `CSS.supports('filter', 'url(#lg)')` |
| `webgl2` | a throwaway canvas returns a `webgl2` context |
| `webgpu` | `'gpu' in navigator` |
| `reducedMotion` / `reducedTransparency` | the matching media queries |

Backends are then tried by priority, highest first:

| Backend | Priority | Required capability | Auto-selectable |
| --- | --- | --- | --- |
| `css-svg` | 30 | `backdropFilterUrl` | yes |
| `svg-content` | 20 | `svgFilterOnContent` | yes |
| `webgl-overlay` | 10 | `webgl2` | yes |
| `webgl-scene` | 5 | `webgl2` | no — explicit only |
| `css-fallback` | 0 | none | yes |

The Blink gate on `backdropFilterUrl` is deliberate. `CSS.supports()` is optimistic in engines that
parse `url()` in `backdrop-filter` without rendering the referenced filter, so the probe trusts the
declaration only where the path is known to actually paint. Everywhere else the engine falls through
to `svg-content`, which produces real refraction through a different mechanism.

## Fidelity matrix

| Feature | `css-svg` | `svg-content` | `webgl-overlay` | `webgl-scene` | `css-fallback` |
| --- | --- | --- | --- | --- | --- |
| Refraction over live DOM | yes | yes | snapshot | scene only | no |
| Chromatic dispersion | yes — 3-pass, 1-pass on the low tier | **no** — single pass | yes | yes | no |
| Frost grain | yes | yes | yes | yes | no |
| Blur | yes | yes | yes | yes | yes |
| Tint + saturation + brightness | yes | yes | yes | yes | yes |
| Specular bevel ring | yes | yes | yes | yes | yes |
| Squircle shape | yes | yes | yes | yes | yes |
| Metaball merging | no | no | **yes** | no | no |
| Spring physics | yes | yes | yes | yes | yes |
| Adaptive contrast + tone hook | yes | yes | yes | yes | yes |

Physics, material resolution, the specular bezel and adaptive contrast live above the renderer, so
they behave identically on every tier — only the optics differ.

Chromatic dispersion is the one optical feature that is not universal. It needs three displacement
passes with the R/G/B channels shifted apart and recomposited. `css-svg` builds that chain whenever
`dispersion > 0` and the device tier allows three passes; `svg-content` always builds a single-pass
chain, so on Safari and Firefox the `dispersion` option currently has no visible effect. Refraction,
frost, bevel and everything else on that path are unaffected.

Metaball merging needs several lenses solved in one shader pass, which no CSS or SVG filter path can
express. `merge` groups therefore require `webgl-overlay`; `<liquid-glass-group>` sets that backend
on its children automatically.

## Platform feature floors

Sourced from Can I Use, July 2026.

| Feature | Chrome | Edge | Firefox | Safari | Safari iOS | Samsung Internet |
| --- | --- | --- | --- | --- | --- | --- |
| `backdrop-filter` | 76 | 17 | 103 | 9 (`-webkit-`) | 9 (`-webkit-`) | 12.0 |
| CSS `filter` property | 18 | 79 | 35 | 6 | 6 | 4 |
| WebGL 2 | 56 | 79 | 51 | 15 | 15 | 7.2 |
| `prefers-reduced-transparency` | 118 | 118 | behind a flag | not supported | not supported | — |

Global support for both `backdrop-filter` and WebGL 2 sits at roughly **94.6%** of tracked traffic.
Below those floors the library still attaches and still renders — you get `css-fallback`, which is a
translucent tinted surface with whatever blur the engine does support.

The `svg-content` path needs `url(#…)` references inside the CSS `filter` property specifically,
which landed later than the filter functions in the table above and at different times per engine.
That is why it is feature-detected at runtime rather than version-gated: if `CSS.supports('filter',
'url(#lg)')` is false, the surface simply resolves to `css-fallback`.

## Accessibility behaviour per engine

| Signal | Effect | Where it works |
| --- | --- | --- |
| `prefers-reduced-motion: reduce` | physics controller is not created, motion-driven light is disabled, changes apply live | everywhere |
| `prefers-reduced-transparency: reduce` | refraction and dispersion drop to 0, blur is capped at 4px, tint opacity is raised to at least 0.85 | Chromium 118+ only; Firefox keeps the query behind a flag and Safari has not shipped it, so on those engines the OS setting is not observable from the page |
| Backdrop tone sampling | tint auto-flips to dark over light backdrops and sets `data-liquid-glass-tone` | everywhere `getComputedStyle` exists |

Tone sampling walks composited background colors up the ancestor chain. Over a background **image or
gradient** it cannot resolve a luminance and returns `null` — the tint is then left exactly as
authored, and no `data-liquid-glass-tone` attribute is written. If you need adaptive contrast over
imagery, pass `tint` explicitly or use the `tonechange` event to drive your own styling.

## Engine-specific caveats

**Safari / WebKit.** SVG filters are rasterized on the CPU, so large glass surfaces cost noticeably
more than in Blink. The quality profile lowers the displacement-map resolution on weak devices, and
the fps watchdog is the backstop: if the median frame rate stays under 45 fps across three
consecutive 90-frame windows, auto-selected `webgl-overlay` instances are demoted once per page.
`svg-content` also clones the backdrop element into a refraction layer, which means a very large or
very dynamic backdrop is the thing to watch, not the number of lenses.

**Firefox / Gecko.** `backdrop-filter: url()` is not implemented, which is exactly why the
`svg-content` path exists. Everything except metaball merging works.

**Choosing a `backdrop`.** `svg-content` refracts a designated element, not the whole page. Pass
`backdrop` to point at it explicitly. Without the option the backend walks up from the glass and
takes the nearest ancestor that actually paints a background; if nothing in that chain paints, the
surface stays on blur and tint. Keeping the source small is also the cheapest option — the backend
clones it, so a tight container beats a page-sized one.

**iOS.** All browsers on iOS are WebKit, so an iOS Chrome or Firefox build behaves like Safari.
Hover magnetism is disabled automatically on coarse pointers unless you pass `physics.hover`
explicitly.

**`webgl-overlay` snapshots.** This backend rasterizes the page to a texture. It inherits the usual
DOM-to-image constraints: cross-origin images without CORS headers and webfonts that fail to inline
will not appear in the refracted texture. Dirty tracking keeps re-snapshots rare, but the tier is a
specialty path for merging, not a general-purpose default.

**WebGPU.** `'webgpu'` is a valid `BackendId` in the type surface, but no WebGPU backend is
registered yet. Requesting it falls through to normal auto-selection rather than failing.

**Content Security Policy.** The lens-map generator runs in a worker spawned from a `Blob` URL. Under
a strict CSP you need `worker-src blob:` (or `child-src blob:`). Without it the worker creation fails
and the library silently falls back to generating maps on the main thread — correct output, slightly
more main-thread work.

## Forcing and debugging a backend

```js
attach(el, { backend: 'svg-content' })
```

```html
<liquid-glass backend="webgl-overlay"></liquid-glass>
```

An explicit backend is honoured only if its capability requirement is met; otherwise auto-selection
takes over. Every attached element carries its resolved state as attributes, which makes support
questions inspectable in devtools:

| Attribute | Meaning |
| --- | --- |
| `data-liquid-glass` | the active preset |
| `data-liquid-glass-backend` | the backend actually rendering |
| `data-liquid-glass-tone` | sampled backdrop tone, absent when unresolved |
| `data-liquid-glass-pressed` | present while the physics controller holds a press |
| `data-liquid-glass-degraded` | present after the fps watchdog demoted this instance |

Mark any element you do not want captured in an overlay snapshot or cloned into a refraction layer
with `data-liquid-glass-ignore`.

```js
handle.on('backendchange', id => console.log('now rendering with', id))
```

The web component mirrors the same events onto the DOM, so framework-free pages can listen without
touching the handle:

```js
document.addEventListener('liquid-glass:backendchange', event => console.log(event.detail))
```

**GPU context loss.** When the browser drops the WebGL context — a GPU process restart, a driver
reset, too many live contexts — the WebGL tiers stop drawing rather than freezing a stale frame, and
re-upload their texture when the context is restored.

## What CI verifies

Every push runs the end-to-end suite against Chromium, WebKit and Firefox, plus emulated iPhone 15
(Mobile Safari) and Pixel 7 (Chrome Android) profiles. Per engine the suite asserts that the
expected backend is resolved, that the refraction layer and its `url(#…)` filter chain are actually
applied, that the shared overlay canvas stays a singleton, that adaptive tone lands on the element,
that a squircle clips to a superellipse, that press physics writes a transform, and that
`prefers-reduced-motion` suppresses it.

Pixel-level baselines — the screenshots that prove the rim genuinely bends what is behind it — are
currently macOS-only and are skipped on other platforms, so they gate local runs rather than CI.
