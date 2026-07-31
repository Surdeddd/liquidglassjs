---
'@surdeddd/liquidglass': minor
---

Rendering accuracy, adapter lifecycle, accessibility modes and a full web-component surface.

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
