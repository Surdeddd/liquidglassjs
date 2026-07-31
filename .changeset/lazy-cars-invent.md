---
'@surdeddd/liquidglass': patch
---

One WebGL context for every scene surface, and cheaper backdrop cloning.

- `webgl-scene` used to create a WebGL2 context per element. Browsers cap live contexts at around a
  dozen and silently drop the oldest, so a page with many scene lenses would start losing them. The
  tier now renders through one shared context and blits each frame into the host's own 2D canvas,
  reference-counted so the context goes away with the last scene.
- `svg-content` skips reclones for mutations that land outside the lens and its bevel band, so
  unrelated activity elsewhere in the backdrop no longer rebuilds the refraction copy. Nodes without
  a box yet, and lenses that have not been measured, still reclone rather than risk a stale layer.
