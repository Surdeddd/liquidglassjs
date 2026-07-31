# @surdeddd/liquidglass

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
