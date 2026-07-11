# @surdeddd/liquidglass

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
