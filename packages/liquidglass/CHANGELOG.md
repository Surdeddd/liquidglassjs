# @surdeddd/liquidglass

## 0.11.0

### Minor Changes

- 3a88d8f: Glass that stretches when it travels, and one switch that turns the whole material off.

  Apple's material is liquid, and the tell is what happens when a control moves: it elongates along
  its own travel and pinches across it, like a drop, then settles round again. Nothing here did that —
  the physics could squash on press and drift toward a pointer, but a surface crossing the screen
  arrived the same shape it left.

  `physics.stretch` (0 to 1, default `0.6`) drives it from the element's measured velocity, so it works
  for anything that moves the box: a spring-driven tab pill, a drag, a layout animation. The elongation
  is capped at 18% and volume-compensated on the cross axis, and it rides its own spring, so it
  overshoots slightly and recovers rather than snapping. It costs no extra layout reads — the velocity
  comes from the rect the surface tracker already measures each frame. Set it to `0` for travel without
  deformation.

  `effects: false` turns everything off: no backend, no bevel, no physics, no injected layers — the
  element renders exactly as authored, and flipping it back to `true` brings the material and the
  chosen backend back. It is a real switch rather than a preset, so a page can offer "reduce effects"
  next to its dark-mode toggle, and a consumer who wants glass on some devices and not others does not
  have to branch around `attach` at all. `handle.backend` reports `'inert'` while it is off.

- dc4a243: The page stops freezing while you scroll, and the fps watchdog can finally see what it is guarding.

  Three faults compounded into the stutter people actually felt.

  The overlay backend rasterized the **whole document** through `html-to-image` whenever anything
  relevant mutated — and scrolling a page with reveal-on-scroll sections mutates constantly, because
  each section that fades in is an attribute change. A profile of the docs site showed the cost plainly:
  `setProperty`, `getPropertyValue` and `serializeToString` at the top, with main-thread freezes up to
  1054 ms. Yet the texture never needed re-capturing for a scroll at all: it lives in document
  coordinates, so panning cannot invalidate it. Snapshots are now held back while the viewport is
  moving and taken once it settles. Measured on the docs site, interleaved A/B under matched load:
  78–82 fps and 1073–1219 ms of blocking became 113–114 fps and **zero** long tasks.

  The watchdog was measuring nothing. It listened on the passive frame channel, but that channel only
  reports a gap when the previous frame scheduled the next one — and on a page whose only motion is
  scrolling, the loop sleeps between events, so every sample it received was exactly `0` and was
  discarded on arrival. It now measures in short bursts while the viewport is actually moving, taking
  real timestamps instead of the delta the physics integrator clamps to 1/20 s for stability.

  Its window was also counted in frames: 90 frames, three windows. At 60 fps that is a 4.5 s reaction,
  but at 8 fps it is 38 s — the worse the stall, the longer the rescue took. Windows now close on
  elapsed time as well, so relief arrives in seconds no matter how bad it gets. On the ten-lens
  benchmark the watchdog now drops dispersion from three passes to one in both headed and software
  rendering, and the settled figure went from 7–9 fps to 119.

- 98e70ff: The material reads as glass now: light bends at the rim instead of being smeared across it, and the pane finally sits on a shadow.

  Apple describes Liquid Glass as three layers — highlight, shadow, illumination — and as a material
  that _bends_ light where earlier ones scattered it. Measured against that, five things were wrong.

  **The blur ran after the displacement**, where Apple's material softens the backdrop and then bends
  it. The SVG chain now matches that order. Measured honestly, this one is a small correction rather
  than a visible win: over a frosted panel the two orders differ by at most 8 levels out of 255, on
  3.68% of pixels, with rim and interior detail unchanged — a Gaussian is near enough shift-invariant
  that the orders only diverge in the thin band where the displacement gradient is steep. It is kept
  because it is the right order, not because it repaints the material.

  **There was no shadow at all, on any backend.** A new `shadow` parameter (default `0.55`) draws a
  soft ambient cast sized from the element plus a tight contact line, so the glass stops reading as a
  hole cut in the page. `box-shadow` also joins the overlay backend's restore list, so a shadow you
  authored yourself now survives a backend swap.

  **Wide elements had no rim optics left.** The displacement map budgeted by longest side, so a
  1440×64 bar spent its texels on length and resolved a 24px bevel with 5.7 of them — on the one shape
  this material is used for most. The budget is an area now, with a floor on texels across the band and
  a ceiling so a weak tier is never handed more than it can afford: that bar goes from 5.7 to 24 texels
  across the band, a 420×280 card from 19.6 to 24, and a small pill is unchanged.

  **Dispersion was inverted in the WebGL shader.** Blue refracts more than red; the shader displaced
  red more, so the two backends drew mirrored fringes and the GL one was backwards.

  **The highlight could not move.** The shader tested a flat three-pixel mask with a very broad lobe,
  giving a ring that changed brightness around the perimeter but never shifted position — and the rim
  brightening was a linear white ramp across the whole bevel. Both now use the surface slope the
  refraction step already solves for: Blinn-Phong against a real normal, so the highlight rolls across
  the bevel as the light moves, with a weak second lobe opposite it, and Schlick instead of the ramp,
  so the edge brightening is a hairline where the surface turns edge-on and it reflects an environment
  rather than flat white.

  Also: the bezel's conic highlight sat 90° from the light direction it tracks, so on the default
  backends — where that ring is the entire light response — the material was lit from the wrong side.

- 156ada2: The SVG backends can light the rim now — measured, and off by default because of what it costs.

  Until now the entire light model lived in the WebGL shader, which is not the backend anyone gets
  unless they ask: Chromium routes to `css-svg` and Safari and Firefox to `svg-content`, and neither
  had a lighting primitive at all. Every specular improvement landed where almost nobody could see it,
  and the default material's whole light response was one conic gradient in the DOM.

  The displacement map was already carrying a wasted channel — blue held a constant 128 — so it now
  carries the dome height instead, and the same texture that bends the backdrop can shade it. The
  chain lifts that channel into alpha, runs `feSpecularLighting` against a distant light, and masks
  the result to the bevel by subtracting the dome from a stepped "inside" mask, because a flat
  interior under a distant light returns a uniform wash rather than a rim. Verified by differencing
  the panel with the highlight on and off: the change is a bright band around the perimeter, brightest
  toward the light, with a completely unchanged interior.

  It is opt-in through a new `lighting` option, defaulting to `false`, and that is the honest part.
  On the ten-lens benchmark it takes the settled figure from 119 fps to 14 — an eight-fold cost, where
  the threshold for keeping it on by default was ten percent. It is meant for one or two surfaces that
  carry a page, not for a page made of glass.

- e5e2d03: The material now follows the backdrop, the way Apple's does.

  Adaptive glass used to fight what was beneath it: a white film over dark pages, near-black pucks
  over light ones. Apple's material does the opposite — dark backdrops get dark smoke, light
  backdrops get white frost, and it is the content color that flips. The default tint now follows
  that rule, and every surface carries `--lg-on-glass`, a ready-to-use color for whatever you set
  on the glass.

  Tone detection also learned to read gradients. Pages rarely sit on a flat color; the observer now
  averages a gradient's stops instead of giving up, so surfaces over gradient walls resolve a tone
  instead of keeping the old film. Raster images still yield, honestly, to `null`.

  Explicit `tint` attributes are untouched — this only moves surfaces that never chose a color.

- 38d1286: The pane reads as glass on a smooth backdrop — sheen, edge light and interior depth on every tier.

  Refraction only shows where the backdrop has structure. Over a flat wall the material used to
  collapse into a tinted rectangle, because everything else was too faint: a 0.33-alpha ring and two
  hairlines. Apple's material stays glass on any backdrop, and the cues it uses are cheap.

  Three of them now ship on all CSS/SVG tiers, composed from the existing layers with no new DOM:

  - an interior sheen — light falling down the surface to a faint floor shade, composed behind the
    tint (`--lg-sheen-angle` rotates it);
  - a lit inner edge and a soft pool of depth inside the bottom rim, so the pane has thickness;
  - a bezel ring bright enough to see (0.85·specular at the lit arc, up from 0.55).

  All three scale with `specular` and vanish at `specular: 0`. Forced-colors and reduced-transparency
  modes now zero `specular` too, so a high-contrast surface is genuinely flat rather than decorated.

  The press is honest gel now as well: a uniform swell with the specular flash rather than the old
  wider-and-shorter squash, and travel stretch follows real page-space movement and always relaxes on
  its own.

### Patch Changes

- 9481396: Scrolling is no longer mistaken for travel, and the page stops paying for it.

  Travel stretch reads the surface's own motion, but every element moves in one coordinate space
  when the page scrolls: in-flow content through the viewport, fixed bars through the page. The
  first fix pinned travel to page space, which silenced in-flow surfaces and quietly woke every
  fixed one — a fixed bar kept its physics running for the whole scroll, rewriting transforms and
  re-rasterizing its backdrop every frame. On the ten-lens bench that cost two thirds of the frame
  rate.

  Travel is now the smaller of the page-space and viewport-space motions per axis. A scroll moves
  an element in exactly one of those spaces, so it reads as zero; a drag, a morph flight or any
  real journey moves both, so the stretch is untouched. The bench went from 35 fps back to the 80s.

- 291ec0d: The page snapshot learned to photograph only where the glass stands.

  The overlay tier used to rasterize the entire document for its backdrop texture — on a long page
  that meant serializing thousands of nodes and megabytes of pixels nobody would ever sample. The
  snapshot now covers a band around the surfaces that actually need it, with a viewport of margin on
  each side: subtrees below the band are pruned before serialization, texel density is capped where
  blur would hide the difference anyway, and the luminance grid follows the band instead of the whole
  page. If a surface ever walks toward the band's edge, the snapshot quietly retakes itself.

  Same picture through the glass — sharper, if anything — for roughly half the cloning work and a
  fraction of the texture memory on long pages.

## 0.10.0

### Minor Changes

- e62a78b: Per-surface quality, and an overlay snapshot that cannot go stale.

  - `quality` is an option now, not only a global setting: `attach(el, { quality: { mapSide: 240,
caPasses: 1 } })` gives one lens a cheaper displacement map and drops its dispersion pass while
    the rest of the page keeps the tier defaults. It layers on top of `configure()`.
  - The shared overlay's snapshot debounce restarted on every mutation, so a steady stream of them
    could starve it indefinitely and a lens would keep sampling a texture captured before the content
    under it painted. There is a max-wait now, and a surface becoming visible asks for a fresh
    capture.

- 948b280: The fps watchdog now helps the tier most pages actually use.

  It only ever armed for an auto-selected `webgl-overlay`, the one tier it could re-mount. A Chromium
  page full of `css-svg` lenses — the common case — had no recovery path at all: it just stayed slow.

  Measured on ten lenses scrolling continuously, headed Chromium, M-series: 31 fps with dispersion at
  three displacement passes, 54 with dispersion off, 118 with no glass on the page. Dispersion is most
  of the cost, and it is the part that can be given up without losing the refraction.

  So the watchdog arms whenever any surface is on `auto`, and when it fires it drops dispersion to a
  single pass page-wide before re-mounting any overlay lenses. The same bench page recovers from 22 to
  77 fps on its own. Explicit `backend` choices are still never re-mounted, and a page that configures
  every surface by hand never arms the watchdog at all.

### Patch Changes

- b357043: Adaptive tone believes the page over the snapshot, and re-reads it when the backdrop changes.

  Two bugs met in one place. Tone was resolved once at attach and then only re-evaluated when the
  element's own rect moved, so a lens sitting still while its surroundings arrived — a section that
  fades in, an image that loads, a theme that switches — kept the answer it guessed on an empty page
  forever. And when a page snapshot existed, its luminance grid outranked the live ancestor sampler,
  so a lens on a plainly light card could report `dark` because the rasterized copy of the page
  disagreed with the page.

  The live sampler wins now whenever it can actually see a painted ancestor; the grid is the fallback
  for backdrops it cannot reduce, like gradients and images. Tone is re-read when a new grid lands and
  when a surface first becomes visible, so the `tonechange` event fires on the transitions consumers
  care about rather than only when the lens moves.

## 0.9.0

### Minor Changes

- 29142e0: CDN build carries the web component, typed event payloads, and the last of the audit tail.

  - The `unpkg`/`jsdelivr` global is built from an entry that includes `<liquid-glass>` and registers
    it on load, so the documented script-tag path actually gives you the element. It previously
    shipped the core entry alone, leaving `define()` unreachable from a script tag. The dist verifier
    now asserts the global exposes it.
  - `handle.on()` payloads are typed per event through `LiquidGlassEventMap`: `backendchange` and
    `degrade` give a `BackendId`, `tonechange` gives `'light' | 'dark' | null`, `press` gives the
    point in client coordinates, `release` gives `null`. Previously every payload was a `string` and
    press/release carried an empty one.
  - `handle.options` reports the resolved configuration, so a consumer can read back what a surface is
    running with instead of tracking it separately.
  - `BackdropTone` has one declaration again, and the duplicate `LiquidGlassEvent` alias is gone in
    favour of `LiquidGlassEventName`.
  - Hover magnetism coalesces pointer moves into one rect read per frame instead of one per event,
    keeping the leading edge immediate.
  - `svg-content` holds reclones while its surface is off screen or the document is hidden, and
    catches up on the next visible sync rather than rebuilding the clone for nobody.
  - The capability probe releases the WebGL2 context it creates to answer one boolean.
  - React's callback ref is stable across renders, so a forwarded ref is no longer detached and
    reattached on every render.

### Patch Changes

- 3e29037: One WebGL context for every scene surface, and cheaper backdrop cloning.

  - `webgl-scene` used to create a WebGL2 context per element. Browsers cap live contexts at around a
    dozen and silently drop the oldest, so a page with many scene lenses would start losing them. The
    tier now renders through one shared context and blits each frame into the host's own 2D canvas,
    reference-counted so the context goes away with the last scene.
  - `svg-content` skips reclones for mutations that land outside the lens and its bevel band, so
    unrelated activity elsewhere in the backdrop no longer rebuilds the refraction copy. Nodes without
    a box yet, and lenses that have not been measured, still reclone rather than risk a stale layer.

- a514d05: Typed custom element, honest shader tests, and the last perf odds and ends.

  - `<liquid-glass>` and `<liquid-glass-group>` are declared in `HTMLElementTagNameMap`, and the five
    `liquid-glass:*` events in `HTMLElementEventMap`, so `document.querySelector('liquid-glass')`
    returns a typed element with `glass` and `options`, and listeners get typed details.
  - `autoAttach` drops surfaces by checking `isConnected` instead of running `contains` for every
    removed node against every attached element.
  - The lens-map generator no longer allocates a pair array per interior pixel.
  - The capability probe releases its WebGL2 context; `resetBackends()` lets the registry start clean.
  - The Svelte action is typed as `LiquidGlassAction`, and `glassOf(node)` reaches the handle an action
    created without threading it through the component.
  - The GL renderer caches parsed tints instead of running a regex per draw.
  - Svelte 5 gets `glass(options)` as an attachment alongside the existing action.
  - `destroy()` is idempotent, so a stale handle can no longer tear down a surface that was attached
    after it. The ownership contract — one glass per element, `attach` is attach-or-update, `destroy`
    removes it for every owner — is now stated in the README rather than implied.
  - The shared scheduler reuses its dispatch buffers instead of allocating two arrays per frame.
  - The published API reference documents the real entry points — `@surdeddd/liquidglass` and its
    `/element`, `/react`, `/vue`, `/svelte` subpaths — rather than internal workspace packages whose
    names resolve to nothing on npm.

## 0.8.0

### Minor Changes

- aecd0cd: Rendering accuracy, adapter lifecycle, accessibility modes and a full web-component surface.

  - The shared overlay keeps its texture aligned with the page it rasterizes. `getComputedStyle`
    reports the computed value of `margin: 0 auto` — `0px`, not the offset the browser resolved — so a
    centered `max-width` container landed flush left in the clone and lenses right of centre sampled
    past the content, rendering a flat dark quad. The backend now measures each surface's ancestors
    against their parent content box and pins the resolved offset for the duration of the snapshot.
    Pinning only applies where an auto margin can be the cause: a block-level child in a block
    container, no float, ltr.
  - Adaptive contrast compared two different luminance scales against the same `0.5` cutoff — the
    document grid summed raw sRGB bytes while the ancestor sampler applied the transfer. Both use one
    implementation now, and the cutoff sits at the `0.179` crossover where black and white text trade
    places, so mid greys stop being classified as dark and keeping unreadable white text.
  - Lens-map cache keys are bucketed (8px on size, 0.5px on detail) and the cache is genuinely LRU, so
    a resize drag reuses maps instead of re-rendering and re-encoding a PNG per frame.
  - WebGL tiers survive context loss: the renderer stops drawing while the context is gone and
    re-uploads its texture on restore. Shaders are deleted after linking and the vertex buffer is
    released on destroy.
  - `<liquid-glass>` exposes all 25 options as attributes instead of 12, adds an `options` getter, and
    re-dispatches engine events as composed `liquid-glass:*` DOM events.
  - React re-attaches when the mount target node changes and compares option objects structurally, so
    an inline `physics` object no longer rebuilds the controller — and strands a press — on every
    render. Vue binds through a watcher on the element ref.
  - `forced-colors: active` joins reduced transparency in switching the surface to the opaque
    material, and reduced motion is read live at attach rather than from the cached capability probe.
  - `configure({ overlayZIndex })` moves the shared overlay canvas and its hosts out of the fixed
    `2147483000` band, and `svg-content` warns once when neither `backdrop` nor a painted ancestor
    resolves instead of silently degrading.
  - The `svg-content` backdrop clone is inert, aria-hidden and stripped of `id`/`name`, so it stops
    duplicating ids, tab stops and find-in-page text.
  - `merge` under `backend: 'auto'` selects `webgl-overlay` when WebGL2 is available; backends that
    cannot merge say so once instead of dropping the group silently.

- bce5475: Engine correctness, packaging and release hardening.

  - `svg-content` now resolves a refraction source on its own: without an explicit `backdrop` it walks
    up to the nearest ancestor that actually paints a background and refracts that, so Safari and
    Firefox no longer fall back to flat blur just because the option was omitted. When nothing in the
    ancestor chain paints, the surface keeps the previous blur-and-tint behaviour.
  - `autoAttach()` no longer throws in a no-DOM environment. The `document` default was evaluated
    before the SSR guard could run, so any isomorphic caller crashed the render.
  - The fps watchdog releases its `requestAnimationFrame` sampler when the last glass is destroyed.
    It previously kept the shared scheduler awake for the lifetime of the page.
  - Built-in backends register lazily through the registry, which makes `sideEffects: false` honest:
    importing only `selectBackend`/`listBackends` no longer risks an empty registry after tree-shaking.
  - `clampMaterial` coerces and validates every numeric field, so `NaN` or non-numeric option values
    fall back to defaults instead of emitting `blur(NaNpx)` or throwing inside tint parsing.
  - Teardown restores host inline styles in strict LIFO order, so a press cycle no longer leaves an
    inline `position: relative` behind, and `destroy()` clears `data-liquid-glass-degraded`.
  - `css-svg` invalidates its pending lens-map request on destroy.
  - Published package: `main` points at the CJS bundle instead of an ESM file, `./package.json` is
    exported, and the tarball now carries `LICENSE` plus a `THIRD-PARTY-NOTICES.md` for the bundled
    `html-to-image` copy. Added `homepage`, `bugs`, `author` and npm provenance.

## 0.7.0

### Minor Changes

- Performance, adaptivity and DX overhaul

  - one shared frame scheduler drives every tracker, physics controller and the light hub: a page full of glass now costs a single scroll listener and a single rAF loop (was one of each per element); steady-scroll long tasks drop ~30% with far smaller worst-case spikes
  - lens refraction maps are computed in a Worker spawned from an inlined source, keeping Snell math off the main thread, with a synchronous in-thread fallback when Workers or CSP are unavailable
  - adaptive quality: the engine resolves a device tier (map resolution, chromatic-aberration passes, DPR cap, snapshot throttle) from hardware signals, exposes `configure()` for overrides, and an fps watchdog demotes auto-selected webgl-overlay instances to the css tier once if the page cannot hold 45fps; touch devices skip the hover magnet automatically
  - new DX surface: `handle.on('backendchange' | 'tonechange' | 'press' | 'release' | 'degrade')`, `autoAttach()` scanning `[data-liquid-glass-auto]` with live add/remove tracking, and a CDN global build (`dist/liquidglass.global.js`, unpkg/jsdelivr) — glass with one script tag and zero build steps
  - core reorganized into `runtime/`, `quality/`, `fx/` modules with a documented dependency direction (docs/architecture.md); public API unchanged

## 0.6.1

### Patch Changes

- README media and links use absolute GitHub URLs so screenshots render on the npm package page

## 0.6.0

### Minor Changes

- Lifecycle and API hardening

  - destroy() now restores the exact inline styles the element had before attach — every backend, physics, bezel and glow snapshot user values (including priority) instead of blindly removing properties
  - set() re-selects the backend when switching back to `auto`, tracks live `prefers-reduced-motion` changes, and resubscribes the light driver when `motionLight` changes
  - passing `undefined` for any option resets it to its default; option types now accept explicit `undefined`
  - React, Vue and Svelte adapters reset options dropped between renders instead of merging them forever
  - the React component forwards plain HTML props (id, aria-\*, event handlers, title) to the rendered element
  - `define('x-glass')` groups now target the custom tag, and removing numeric attributes (`ior`, `magnify`, `thickness`, `merge-strength`) returns them to defaults
  - subpath entries (`/element`, `/react`, `/vue`, `/svelte`) share one core runtime with the root entry in both ESM and CJS — no more duplicated registries when mixing imports
  - exported `VERSION` now reports the real package version; npm tarball includes the README; the release workflow verifies build, types, lint and tests before publishing

## 0.5.0

### Minor Changes

- ac037f0: morphGlass(from, to): spring-driven glassEffectID-style transition — one glass control hands its geometry to another and the material rides the spring between them; instant under prefers-reduced-motion.

## 0.4.0

### Minor Changes

- 5ed9201: Adaptive contrast v2: when the overlay snapshot exists the engine samples real backdrop luminance under each glass (48-column grid, hysteresis at the threshold) instead of guessing from ancestor background colors — tone flips now match what is actually behind the lens, with a graceful fallback to the old heuristic.
- 303edf8: GlassEffectContainer-style grouping: wrap lenses in liquid-glass-group with a spacing attribute and they share a merge group on the overlay backend. New mountScrollEdge() progressively dissolves content under floating bars, matching the iOS scroll edge effect.
- b1e1989: Apple-parity press optics: glass flattens optically on press (refraction dips, specular brightens) with an inner glow spreading from the touch point, and thickness defaults to 'auto' — larger surfaces render as thicker glass with deeper lensing, the way iOS scales its material.

## 0.3.0

### Minor Changes

- One package for everything: the engine ships fully bundled with framework entries `@surdeddd/liquidglass/react`, `/vue`, `/svelte` and `/element` behind optional peers — zero runtime dependencies. Includes Snell lens optics, edge chromatic aberration, dynamic two-tone bezel, metaball merging, spring physics, adaptive contrast, and the Safari clone-performance fixes.
