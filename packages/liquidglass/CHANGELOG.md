# @surdeddd/liquidglass

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
