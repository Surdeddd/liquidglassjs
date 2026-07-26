---
'@surdeddd/liquidglass': minor
---

Engine correctness, packaging and release hardening.

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
