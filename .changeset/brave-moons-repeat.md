---
'@surdeddd/liquidglass': minor
---

CDN build carries the web component, typed event payloads, and the last of the audit tail.

- The `unpkg`/`jsdelivr` global is built from an entry that includes `<liquid-glass>` and registers
  it on load, so the documented script-tag path actually gives you the element. It previously
  shipped the core entry alone, leaving `define()` unreachable from a script tag. The dist verifier
  now asserts the global exposes it.
- `handle.on()` payloads are typed per event through `LiquidGlassEventMap`: `backendchange` and
  `degrade` give a `BackendId`, `tonechange` gives `'light' | 'dark' | null`, `press` gives the
  point in client coordinates, `release` gives `null`. Previously every payload was a `string` and
  press/release carried an empty one.
- `handle.options` reports the resolved configuration, so a consumer can read back what a surface is
  running with instead of tracking it separately.
- `BackdropTone` has one declaration again, and the duplicate `LiquidGlassEvent` alias is gone in
  favour of `LiquidGlassEventName`.
- Hover magnetism coalesces pointer moves into one rect read per frame instead of one per event,
  keeping the leading edge immediate.
- `svg-content` holds reclones while its surface is off screen or the document is hidden, and
  catches up on the next visible sync rather than rebuilding the clone for nobody.
- The capability probe releases the WebGL2 context it creates to answer one boolean.
- React's callback ref is stable across renders, so a forwarded ref is no longer detached and
  reattached on every render.
