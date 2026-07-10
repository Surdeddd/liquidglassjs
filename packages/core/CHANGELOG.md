# @surdeddd/liquidglass-core

## 0.1.0

### Minor Changes

- 133bd73: Adaptive contrast and accessibility: WCAG-luminance backdrop tone sampling flips the default tint over light content and exposes data-liquid-glass-tone for text styling (honest null over gradients), prefers-reduced-transparency switches glass to an opaque distortion-free mode, prefers-reduced-motion is now watched live, and every injected render layer is aria-hidden. Opt out per lens with `adaptive: false`.
- 7b5d5f9: Blob merge: the GL shader now combines up to 8 SDF shapes with smooth-min, so lenses in the same merge group melt into each other iOS-26-style on the shared overlay canvas. New `merge` (group name) and `mergeStrength` options, `merge` attribute on the element, union-quad rendering between lenses and a motion poll loop that keeps merged groups in sync while they move.
- 720a5ae: Core engine foundations: material model with presets and clamping, capability probe, SurfaceTracker dom-sync, pluggable backend registry and the css-fallback backend rendering real glass styles.
- 720a5ae: css-svg backend for Chromium: generated SDF displacement maps drive real refraction over live DOM via backdrop-filter url(), with blur and saturation folded into the same SVG filter chain.
- 0327121: Living spring physics: mass-spring-damper system drives press-squash, release-wobble and hover-magnetism on any backend via composed host transforms. Enabled by default, configurable through the `physics` option (press/hover/wobble), fully disabled by `physics: false`, the `physics="false"` attribute or prefers-reduced-motion. The rAF loop runs only while springs are moving.
- 215f5e1: Squircle shape: new `shape: 'squircle'` material param renders iOS-style superellipse surfaces across every backend — superellipse SDF in the displacement maps and the GL shader plus a polygon clip-path on styled hosts. The element gains a `shape` attribute.
- 0dbb013: svg-content backend brings live-DOM refraction to Safari and Firefox: a counter-positioned clone of the designated backdrop element is refracted with filter url() displacement inside the glass, kept in sync via MutationObserver and dom-sync. New `backdrop` option (Element or selector) on attach and the `<liquid-glass backdrop>` attribute.
- 279289e: webgl-overlay backend: one shared viewport canvas renders every overlay lens through the GL optics shader over a live page snapshot (lazy html-to-image optional dependency), with mutation-driven dirty tracking, debounced re-snapshots, scroll/resize on-demand rendering and viewport culling.
- 2d05d92: webgl-scene backend: full glass optics in a WebGL2 shader (SDF shape, bevel refraction, chromatic dispersion, poisson blur, saturation, tint, frost noise, specular rim) rendered over a scene image aligned with a reference element. New `sceneImage` option, explicit-only backend selection via autoSelect, and `backend`/`scene-image` attributes on the element.

### Patch Changes

- 40bd688: svg-content backdrop clones now strip glass elements and injected layers, preventing infinite clone recursion when the backdrop contains the lens itself (previously hung page load in browsers without WebGL2 where explicit GL backends fall back to svg-content). Mutations inside glass surfaces no longer trigger backdrop reclones, and elements are marked before backend mount.
