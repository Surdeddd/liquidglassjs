# Troubleshooting

Symptoms, causes and what to do about them. Almost every question here is answered faster by looking
at the element first.

## Read the element before anything else

The engine writes its resolved state onto your element as attributes. Five tiers can render the same
surface, and knowing which one is running narrows most problems to one paragraph.

| Attribute | Meaning |
| --- | --- |
| `data-liquid-glass` | the active preset |
| `data-liquid-glass-backend` | the backend actually rendering |
| `data-liquid-glass-tone` | sampled backdrop tone; absent when it could not be resolved |
| `data-liquid-glass-pressed` | present while the physics controller holds a press |
| `data-liquid-glass-degraded` | present after the fps watchdog demoted this instance |
| `data-liquid-glass-morphing` | present on the target of `morphGlass()` while its spring runs |

```js
const el = document.querySelector('[data-liquid-glass]')
console.log(el.dataset.liquidGlassBackend, getInstance(el)?.options)
console.table(probeCapabilities())
```

`probeCapabilities()` is cached for the life of the page; `resetCapabilitiesCache()` forces a re-probe
if you are toggling things in the console.

## Nothing looks like glass

`data-liquid-glass-backend` reads `css-fallback`. That tier is blur, saturation and tint — no
refraction — and it is what you get when every optical path failed its feature test.

`probeCapabilities()` says which one:

- `backdropFilterUrl: false` — no Chromium displacement path. This is expected everywhere except
  Blink; the probe deliberately gates it on the engine, because `CSS.supports()` returns true in
  browsers that parse `url()` in `backdrop-filter` without rendering it.
- `svgFilterOnContent: false` — no `filter: url(#…)` at all, which rules out the Safari and Firefox
  path too. This is an old browser.
- `webgl2: false` — no GL tiers, and no metaball merging.

Nothing here is a bug to fix in your code. See
[browser-support.md](browser-support.md#how-the-tier-is-chosen).

## Safari or Firefox shows flat blur

Those engines refract a **cloned source element**, not the live page behind the lens. Without a
source there is nothing to bend.

Without an explicit `backdrop`, the backend walks up from the lens looking for the nearest ancestor
that paints — a background colour with alpha over 0.01, or any background image. It stops **before**
`<body>` and `<html>`. A page whose only background lives on `body` therefore has no source, and the
surface falls back to blur and tint with one console warning per page.

```ts
attach(panel, { backdrop: '.hero-art' })
```

```html
<liquid-glass backdrop="main"></liquid-glass>
```

Naming the source is also the cheaper option: it is the element that gets cloned into the refraction
layer, so a tight container beats a page-sized one.

## The lens looks flat — a rim, but nothing bending

Refraction displaces what is behind the lens. Displacing a uniform field produces a uniform field:
over a flat colour, a perfectly correct lens is invisible. There is nothing broken to fix; there is
nothing to refract.

Confirm it in one move — scroll something with structure under the lens, or drop an image behind it.
If the edges of that structure bow at the rim, the optics are working.

If they do not, check the three options that can switch refraction off:

| Option | Value that flattens it |
| --- | --- |
| `ior` | `1` — the index of refraction of air; nothing bends |
| `refraction` | `0` — the rim bend is scaled to nothing |
| `bevelWidth` | `0` — no rim band for the bend to live in |

And check the tier: `css-fallback` never refracts, and `svg-content` ignores `dispersion` entirely,
so a lens on Safari or Firefox has a bend but no colour split at the rim.

## `merge` does nothing

Metaball merging is solved by one shader pass over several shapes, which no CSS or SVG filter path
can express. It exists only on `webgl-overlay`.

Under `backend: 'auto'` the engine switches to that tier by itself when a `merge` group is set and
WebGL2 is available. If it cannot — no WebGL2, or the page has already been demoted by the fps
watchdog — the group is ignored and the engine logs it.

**That warning fires once per page.** A second group with the same problem is silent, so do not read
the absence of a warning as evidence that merging is working. Read
`data-liquid-glass-backend` instead: it says `webgl-overlay` or the group is not merging.

`<liquid-glass-group>` sets the backend on its children for you.

## Only some of my lenses merge

A group holds **8** lenses. That is the size of the shape array in the fragment shader, not a
configurable limit.

The ninth and later members of a group are dropped from the overlay pass entirely. They keep their
blur, tint, border radius and cast shadow — those come from inline styles, not from the shader — and
they get neither refraction nor merging. **Nothing is logged.** A dock whose last two tabs quietly
stopped melting has hit this.

Split the rest into a second `merge` group. Two groups of five behave like one group of ten
everywhere except at the seam between them.

Membership order is the order the surfaces were **attached**, not their order in the DOM. If you are
near the limit, that is what decides which lens falls off the end.

## A merged lens renders with the wrong material

Every member of a `merge` group is drawn with the **first** member's material — one draw call, one
set of uniforms. `mergeStrength` is the exception: the group uses the largest value any member asked
for.

So a group whose bar is `preset: 'clear'` and whose pill is `preset: 'tinted'` renders entirely
clear, or entirely tinted, depending on which one attached first. Give every member of a group the
same material and set it once.

## My content disappeared behind the merge overlay

The `webgl-overlay` tier paints through **one canvas parked at the top of the page's z-order**, not
through your element. Four stacking layers are involved:

| Layer | z-index | Configurable |
| --- | --- | --- |
| the shared overlay canvas | `overlayZIndex` — 2147483000 | `configure({ overlayZIndex })` |
| a lens host on that tier | `overlayZIndex + 1` | derived; written only when the host's computed z-index is `auto` or `0` |
| the target of `morphGlass()`, while its spring runs | 2147483002 | no |
| the layer `mountScrollEdge()` mounts | 2147483003 | no |

Promoting the host is what keeps *your* content — the text inside the lens — above the canvas. Two
things defeat it:

**An ancestor that creates a stacking context.** A promoted z-index only ranks the host inside its
own stacking context, and the canvas is a child of `<body>`. Wrap a lens in anything that opens a
context and the whole subtree is buried under the canvas no matter how large the number is. The
usual culprits: `position: fixed`, `transform`, `filter`, `opacity` below 1, `isolation: isolate`,
`contain: paint`, `will-change` on any of those.

Verified in Chromium: an identical lens renders its label on top inside a `position: relative`
wrapper and behind the canvas inside a `position: fixed` one.

**A z-index you set yourself.** The engine leaves the host alone when its computed `z-index` is
anything other than `auto` or `0`. `z-index: 10` on a lens host means the canvas at 2147483000 wins.

The fix for both is the same shape:

- Let the lens host be the positioned element. Do not wrap the group in a fixed or transformed
  container — put `position: fixed` on the lens itself.
- Put content that has to read over the glass in its own layer above `overlayZIndex`, and mark it
  `data-liquid-glass-ignore` so it is not rasterized into the refraction texture as well as painted
  over it.

```css
.dock { position: relative; }

.dock-labels {
  position: absolute;
  inset: 0;
  z-index: 2147483001;
}
```

```html
<nav class="dock-labels" data-liquid-glass-ignore>…</nav>
```

2147483002 and 2147483003 are taken by `morphGlass` and `mountScrollEdge`, so one above the canvas is
the step to take rather than the largest number you can type.

## Images or text vanish inside a merge group

The overlay tier rasterizes the document to get its refraction texture, and inherits the usual
DOM-to-image constraints. Cross-origin images served without CORS headers, and webfonts that cannot
be inlined, do not make it into the snapshot — so they are missing from what the lens refracts, while
still being visible on the page itself.

Serve the images with `Access-Control-Allow-Origin`, or move that lens to `css-svg` or `svg-content`,
which refract the live backdrop and never take a snapshot.

The snapshot is also capped at 4096 px on its longest side and is not taken while the viewport is
moving. See [performance.md](performance.md#costs-worth-knowing-about).

## My background, box-shadow or focus ring disappeared

The engine paints through inline styles on your element, and for the life of the surface its value
wins. Which properties each tier takes over is in the
[README](../README.md#what-attach-takes-over).

Two consequences catch people:

- **`background` and `box-shadow` are replaced.** The glass is the surface now. `shadow: 0` is how
  you ask for no cast shadow.
- **A focus ring drawn with `box-shadow` is overwritten.** `outline` and `outline-offset` are not
  touched by any tier, so a focus ring belongs there.

Whatever you had set *inline* is captured at mount and restored by `destroy()`. Rules from a
stylesheet are not overwritten, they are simply outranked — with one exception you can use: an
author `!important` declaration beats a normal inline one.

```css
@media (forced-colors: active) {
  [data-liquid-glass] {
    background: Canvas !important;
    backdrop-filter: none !important;
  }
}
```

## The layout jumped when the glass attached

Three inline changes can move things:

- **`position: static` becomes `relative`.** Every tier that mounts a layer inside the host needs a
  containing block, and the specular bezel and press glow both do. Absolutely positioned children of
  that host, which used to resolve against some ancestor, now resolve against the host.
- **`display: inline` becomes `inline-block`.** The physics controller does this so a transform has
  something to apply to.
- **A custom element is `display: inline` to begin with.** `<liquid-glass>` needs a `display` rule
  from you before it will lay out as a panel.

The division that works: style layout on the host — size, margin, padding, `display`, `position`, and
the `border-radius` that `radius: 'auto'` reads — and leave paint to the engine.

## A strict CSP breaks the lens

Two directives matter, and both were measured in Chromium against the shipped build.

**`worker-src blob:`** (or `child-src blob:`). Displacement maps are generated in a worker spawned
from a `Blob` URL. Without the directive the worker is blocked, one console error is logged, and the
library falls back to generating the maps on the main thread — correct output, more main-thread work.
The lens still looks right.

**`img-src data:`.** The generated map is handed to the filter chain as a `data:image/png` URL on an
`feImage` node. Without `data:` the map never loads: the backend still resolves to `css-svg`, the
element still carries its `backdrop-filter: url(#lg-…)`, and the lens renders **blur and tint with
no bend at all** — the same symptom as landing on the wrong tier, from a completely different cause.
An `img-src` violation is reported for the map.

`style-src` needs nothing. The engine writes every style through the CSSOM — `element.style.setProperty`
— which CSP does not gate; `'unsafe-inline'` is not required.

A policy that runs the library clean, with no violations on either the CSS or the overlay tier:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; worker-src blob:
```

## Server rendering and hydration

Every entry imports cleanly in bare Node, `attach()` is a client-side call, and `autoAttach()`
returns an inert stop function when there is no DOM. Nothing needs a `browser` guard.

**React Server Components.** `@surdeddd/liquidglass/react` ships **without** a `"use client"` banner,
so importing it from a server component fails the build. Put the directive at the top of your own
module — the one that imports `LiquidGlass`, `useLiquidGlass` or `useLiquidGlassHandle` — or reach it
through `dynamic(() => import('./glass'), { ssr: false })`. `pnpm ssr` proves the entries load in
bare Node; it does not exercise the RSC boundary and will not catch this for you.

**Nuxt, SvelteKit, Astro.** The component, directive, action and attachment all render the plain
element on the server and attach after hydration, so there is no markup for hydration to disagree
about. No `<ClientOnly>` needed.

**`<liquid-glass>`.** Server-rendered markup is inert until `define()` runs in the browser and the
element upgrades. `define()` is a no-op without `customElements`, so it is safe to call in shared
code. Style the element normally; `liquid-glass:not(:defined)` is the hook if the pre-upgrade state
needs to look different.

**The one-frame flash.** Whichever framework you are in, the hydrated page paints once before the
engine attaches. Give the element a background in CSS if that matters — the engine overwrites
`background` inline the moment it attaches, so the placeholder costs nothing.

## The page is stuck on a degraded backend

The fps watchdog fires **once per page**. When three consecutive sampling windows come back under 45
fps it does two things at once: writes `caPasses: 1` into the global quality overrides, and re-mounts
every auto-selected `webgl-overlay` lens onto the CSS tier. `data-liquid-glass-degraded` appears on
the demoted elements and `handle.on('degrade')` fires.

Getting out of it, in the order the pieces come back:

```ts
import { configure, resetQuality } from '@surdeddd/liquidglass'

configure({ caPasses: 3 })            // dispersion back to three passes
resetQuality()                        // or: clear every override, yours included
handle.set({ backend: 'webgl-overlay' })  // this surface back on the overlay tier
```

**An explicit backend is immune to the whole mechanism.** The watchdog only re-mounts surfaces whose
`backend` is `auto`, and naming a tier also bypasses the check that keeps new `auto` attaches off
`webgl-overlay` after a demotion. That is the escape hatch, and it is also the reason a page that
configures every tier by hand never arms the watchdog at all.

What no public API undoes: the flag that says this page has already been demoted. After it is set,
**a fresh `attach()` with `backend: 'auto'` still avoids `webgl-overlay`**, even after
`resetQuality()`. Only a reload clears it. Verified against the engine.

`resetQuality()` does re-arm the frame sampler, so a page that has been reset can be demoted a second
time.

If the demotion is not what you wanted, the durable answer is to stop qualifying for it — set
`caPasses: 1` or `dispersion: 0` up front on a page you know carries many lenses, rather than paying
three passes until the watchdog notices. See [performance.md](performance.md#the-fps-watchdog).

## Text over glass is unreadable

`adaptive` samples the backdrop and flips the **glass** tint. It does not touch your text, and it
cannot resolve a luminance over a gradient or an image at all — in that case `tonechange` gives you
`null` and no `data-liquid-glass-tone` attribute is written.

Three ways to make it deterministic, in [accessibility.md](accessibility.md#the-contrast-of-your-content).
The short version: style from `data-liquid-glass-tone`, or raise `tintOpacity` until the composite
stops depending on what is behind it, or give the text its own backing.

Automated contrast checkers will not catch this. They read the declared background, and the declared
background of a `clear` surface is a 6% white wash.

## The surface went opaque on its own

`prefers-reduced-transparency: reduce` or `forced-colors: active` is on. The engine switches to a
reduced material — refraction and dispersion to 0, blur capped at 4 px, tint opacity raised to at
least 0.85 — and follows the OS setting live.

This is deliberate. If you need to shape it differently, see
[accessibility.md](accessibility.md#forced-colors-in-detail).

## `attach()` returned a handle I did not expect

`attach()` is attach-or-update. Called on an element that already has a surface, it returns the
**same** handle and applies your options to it, rather than creating a second one.

That means two owners on one node share a lifetime: the first `destroy()` or `detach()` removes the
surface for both. Give them separate elements if they need separate lifetimes.

Calling `destroy()` twice is safe, and a stale handle cannot tear down a surface that was attached
after it.

## Still stuck

Open an issue with the browser and version, the value of `data-liquid-glass-backend` on the affected
element, the package version, and a minimal reproduction. The backend attribute is the single most
useful line in the report.
