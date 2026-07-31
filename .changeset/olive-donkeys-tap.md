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
- The Svelte action is typed as `LiquidGlassAction`, and `glassOf(node)` reaches the handle an action
  created without threading it through the component.
- The GL renderer caches parsed tints instead of running a regex per draw.
- The published API reference documents the real entry points — `@surdeddd/liquidglass` and its
  `/element`, `/react`, `/vue`, `/svelte` subpaths — rather than internal workspace packages whose
  names resolve to nothing on npm.
