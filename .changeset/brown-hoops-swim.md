---
'@surdeddd/liquidglass': minor
---

Per-surface quality, and an overlay snapshot that cannot go stale.

- `quality` is an option now, not only a global setting: `attach(el, { quality: { mapSide: 240,
  caPasses: 1 } })` gives one lens a cheaper displacement map and drops its dispersion pass while
  the rest of the page keeps the tier defaults. It layers on top of `configure()`.
- The shared overlay's snapshot debounce restarted on every mutation, so a steady stream of them
  could starve it indefinitely and a lens would keep sampling a texture captured before the content
  under it painted. There is a max-wait now, and a surface becoming visible asks for a fresh
  capture.
