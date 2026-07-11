# @surdeddd/liquidglass-element

## 0.1.0

### Minor Changes

- 7b5d5f9: Blob merge: the GL shader now combines up to 8 SDF shapes with smooth-min, so lenses in the same merge group melt into each other iOS-26-style on the shared overlay canvas. New `merge` (group name) and `mergeStrength` options, `merge` attribute on the element, union-quad rendering between lenses and a motion poll loop that keeps merged groups in sync while they move.
- 720a5ae: Core engine foundations: material model with presets and clamping, capability probe, SurfaceTracker dom-sync, pluggable backend registry and the css-fallback backend rendering real glass styles.
- bad67ed: Full adapter surface: the React component and useLiquidGlass hook now pass every engine option through (attach once, shallow-guarded set on updates, ref forwarding, isomorphic layout effect), the Vue component accepts a complete options prop and exposes the handle, the element gains a glass getter, and all packages are verified SSR-safe by a node smoke test wired into CI.
- 0327121: Living spring physics: mass-spring-damper system drives press-squash, release-wobble and hover-magnetism on any backend via composed host transforms. Enabled by default, configurable through the `physics` option (press/hover/wobble), fully disabled by `physics: false`, the `physics="false"` attribute or prefers-reduced-motion. The rAF loop runs only while springs are moving.
- 215f5e1: Squircle shape: new `shape: 'squircle'` material param renders iOS-style superellipse surfaces across every backend — superellipse SDF in the displacement maps and the GL shader plus a polygon clip-path on styled hosts. The element gains a `shape` attribute.
- 0dbb013: svg-content backend brings live-DOM refraction to Safari and Firefox: a counter-positioned clone of the designated backdrop element is refracted with filter url() displacement inside the glass, kept in sync via MutationObserver and dom-sync. New `backdrop` option (Element or selector) on attach and the `<liquid-glass backdrop>` attribute.
- 2d05d92: webgl-scene backend: full glass optics in a WebGL2 shader (SDF shape, bevel refraction, chromatic dispersion, poisson blur, saturation, tint, frost noise, specular rim) rendered over a scene image aligned with a reference element. New `sceneImage` option, explicit-only backend selection via autoSelect, and `backend`/`scene-image` attributes on the element.

### Patch Changes

- Updated dependencies [133bd73]
- Updated dependencies [7b5d5f9]
- Updated dependencies [40bd688]
- Updated dependencies [720a5ae]
- Updated dependencies [720a5ae]
- Updated dependencies [0327121]
- Updated dependencies [215f5e1]
- Updated dependencies [0dbb013]
- Updated dependencies [279289e]
- Updated dependencies [2d05d92]
  - @surdeddd/liquidglass-core@0.1.0
