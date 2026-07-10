# @liquidglass/vue

## 0.1.0

### Minor Changes

- 720a5ae: Core engine foundations: material model with presets and clamping, capability probe, SurfaceTracker dom-sync, pluggable backend registry and the css-fallback backend rendering real glass styles.
- bad67ed: Full adapter surface: the React component and useLiquidGlass hook now pass every engine option through (attach once, shallow-guarded set on updates, ref forwarding, isomorphic layout effect), the Vue component accepts a complete options prop and exposes the handle, the element gains a glass getter, and all packages are verified SSR-safe by a node smoke test wired into CI.

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
  - @liquidglass/core@0.1.0
