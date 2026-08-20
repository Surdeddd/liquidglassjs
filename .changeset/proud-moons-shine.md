---
'@surdeddd/liquidglass': minor
---

The SVG backends can light the rim now — measured, and off by default because of what it costs.

Until now the entire light model lived in the WebGL shader, which is not the backend anyone gets
unless they ask: Chromium routes to `css-svg` and Safari and Firefox to `svg-content`, and neither
had a lighting primitive at all. Every specular improvement landed where almost nobody could see it,
and the default material's whole light response was one conic gradient in the DOM.

The displacement map was already carrying a wasted channel — blue held a constant 128 — so it now
carries the dome height instead, and the same texture that bends the backdrop can shade it. The
chain lifts that channel into alpha, runs `feSpecularLighting` against a distant light, and masks
the result to the bevel by subtracting the dome from a stepped "inside" mask, because a flat
interior under a distant light returns a uniform wash rather than a rim. Verified by differencing
the panel with the highlight on and off: the change is a bright band around the perimeter, brightest
toward the light, with a completely unchanged interior.

It is opt-in through a new `lighting` option, defaulting to `false`, and that is the honest part.
On the ten-lens benchmark it takes the settled figure from 119 fps to 14 — an eight-fold cost, where
the threshold for keeping it on by default was ten percent. It is meant for one or two surfaces that
carry a page, not for a page made of glass.
