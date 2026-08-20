---
'@surdeddd/liquidglass': patch
---

The glass finally sees the finished page, not a half-drawn one.

Two texture bugs starved the WebGL tier of its backdrop. The snapshot listened for mutations but
not for endings: a CSS transition flips a class once and then animates silently, so the texture
froze mid-reveal — surfaces sampled a page at 70% opacity, or plain black. The overlay now also
listens for transitionend and animationend near its surfaces and quietly retakes the snapshot when
the motion settles.

Worse, the band crop distorted the page it was photographing: forcing the clone's height and
translating it collided with `overflow-x: hidden` on real pages, clipping everything below the
fold of the band — the dock sampled a void. The snapshot now renders the page's SVG at its full,
untouched layout and crops the band on the canvas side instead, so the clone is never deformed.

The dock demo also dresses for the theme now: dark smoke over the shelf in dark, white frost in
light — the way Apple's own bars follow the system, not the local pixels.
