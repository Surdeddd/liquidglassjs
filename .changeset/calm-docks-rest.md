---
'@surdeddd/liquidglass': patch
---

Scrolling is no longer mistaken for travel, and the page stops paying for it.

Travel stretch reads the surface's own motion, but every element moves in one coordinate space
when the page scrolls: in-flow content through the viewport, fixed bars through the page. The
first fix pinned travel to page space, which silenced in-flow surfaces and quietly woke every
fixed one — a fixed bar kept its physics running for the whole scroll, rewriting transforms and
re-rasterizing its backdrop every frame. On the ten-lens bench that cost two thirds of the frame
rate.

Travel is now the smaller of the page-space and viewport-space motions per axis. A scroll moves
an element in exactly one of those spaces, so it reads as zero; a drag, a morph flight or any
real journey moves both, so the stretch is untouched. The bench went from 35 fps back to the 80s.
