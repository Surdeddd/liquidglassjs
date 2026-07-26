# Security policy

## Supported versions

The latest published `@surdeddd/liquidglass` release receives fixes. The project is pre-1.0, so
patches land on the current minor rather than being backported.

## Reporting a vulnerability

Report privately through GitHub's advisory form:
<https://github.com/Surdeddd/liquidglassjs/security/advisories/new>.

Please do not open a public issue for anything exploitable. A useful report includes the affected
version, the browser and backend in play (`data-liquid-glass-backend` on the element), and a minimal
page that reproduces it.

Expect an acknowledgement within a week. If a fix is warranted, the advisory is published together
with the release that carries it.

## Scope notes

This is a rendering library that injects DOM and runs WebGL in the host page. The areas worth the
most scrutiny:

- the `webgl-overlay` backend rasterizes the page into a texture, so it touches every node in the
  document
- `svg-content` clones a designated element into an inert, aria-hidden layer
- lens maps are generated in a worker spawned from a `Blob` URL, which a strict CSP must allow
  (`worker-src blob:`)
- `autoAttach()` parses JSON out of a `data-liquid-glass-auto` attribute; malformed input is
  contained per element and never aborts the scan
