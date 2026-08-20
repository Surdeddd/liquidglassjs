---
'@surdeddd/liquidglass': minor
---

The material now follows the backdrop, the way Apple's does.

Adaptive glass used to fight what was beneath it: a white film over dark pages, near-black pucks
over light ones. Apple's material does the opposite — dark backdrops get dark smoke, light
backdrops get white frost, and it is the content color that flips. The default tint now follows
that rule, and every surface carries `--lg-on-glass`, a ready-to-use color for whatever you set
on the glass.

Tone detection also learned to read gradients. Pages rarely sit on a flat color; the observer now
averages a gradient's stops instead of giving up, so surfaces over gradient walls resolve a tone
instead of keeping the old film. Raster images still yield, honestly, to `null`.

Explicit `tint` attributes are untouched — this only moves surfaces that never chose a color.
