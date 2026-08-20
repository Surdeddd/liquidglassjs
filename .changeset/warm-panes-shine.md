---
'@surdeddd/liquidglass': minor
---

The pane reads as glass on a smooth backdrop — sheen, edge light and interior depth on every tier.

Refraction only shows where the backdrop has structure. Over a flat wall the material used to
collapse into a tinted rectangle, because everything else was too faint: a 0.33-alpha ring and two
hairlines. Apple's material stays glass on any backdrop, and the cues it uses are cheap.

Three of them now ship on all CSS/SVG tiers, composed from the existing layers with no new DOM:

- an interior sheen — light falling down the surface to a faint floor shade, composed behind the
  tint (`--lg-sheen-angle` rotates it);
- a lit inner edge and a soft pool of depth inside the bottom rim, so the pane has thickness;
- a bezel ring bright enough to see (0.85·specular at the lit arc, up from 0.55).

All three scale with `specular` and vanish at `specular: 0`. Forced-colors and reduced-transparency
modes now zero `specular` too, so a high-contrast surface is genuinely flat rather than decorated.

The press is honest gel now as well: a uniform swell with the specular flash rather than the old
wider-and-shorter squash, and travel stretch follows real page-space movement and always relaxes on
its own.
