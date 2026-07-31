---
'@surdeddd/liquidglass': patch
---

Typed custom element, honest shader tests, and the last perf odds and ends.

- `<liquid-glass>` and `<liquid-glass-group>` are declared in `HTMLElementTagNameMap`, and the five
  `liquid-glass:*` events in `HTMLElementEventMap`, so `document.querySelector('liquid-glass')`
  returns a typed element with `glass` and `options`, and listeners get typed details.
- `autoAttach` drops surfaces by checking `isConnected` instead of running `contains` for every
  removed node against every attached element.
- The lens-map generator no longer allocates a pair array per interior pixel.
- The capability probe releases its WebGL2 context; `resetBackends()` lets the registry start clean.
