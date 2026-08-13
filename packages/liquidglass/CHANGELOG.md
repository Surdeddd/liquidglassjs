# @surdeddd/liquidglass

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
