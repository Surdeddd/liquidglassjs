---
'@liquidglass/core': minor
---

webgl-overlay backend: one shared viewport canvas renders every overlay lens through the GL optics shader over a live page snapshot (lazy html-to-image optional dependency), with mutation-driven dirty tracking, debounced re-snapshots, scroll/resize on-demand rendering and viewport culling.
