---
'@surdeddd/liquidglass': patch
---

Adaptive tone believes the page over the snapshot, and re-reads it when the backdrop changes.

Two bugs met in one place. Tone was resolved once at attach and then only re-evaluated when the
element's own rect moved, so a lens sitting still while its surroundings arrived — a section that
fades in, an image that loads, a theme that switches — kept the answer it guessed on an empty page
forever. And when a page snapshot existed, its luminance grid outranked the live ancestor sampler,
so a lens on a plainly light card could report `dark` because the rasterized copy of the page
disagreed with the page.

The live sampler wins now whenever it can actually see a painted ancestor; the grid is the fallback
for backdrops it cannot reduce, like gradients and images. Tone is re-read when a new grid lands and
when a surface first becomes visible, so the `tonechange` event fires on the transitions consumers
care about rather than only when the lens moves.
