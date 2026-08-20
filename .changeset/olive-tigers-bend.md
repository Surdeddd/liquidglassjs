---
'@surdeddd/liquidglass': minor
---

The material reads as glass now: light bends at the rim instead of being smeared across it, and the pane finally sits on a shadow.

Apple describes Liquid Glass as three layers — highlight, shadow, illumination — and as a material
that *bends* light where earlier ones scattered it. Measured against that, five things were wrong.

**The blur ran after the displacement**, where Apple's material softens the backdrop and then bends
it. The SVG chain now matches that order. Measured honestly, this one is a small correction rather
than a visible win: over a frosted panel the two orders differ by at most 8 levels out of 255, on
3.68% of pixels, with rim and interior detail unchanged — a Gaussian is near enough shift-invariant
that the orders only diverge in the thin band where the displacement gradient is steep. It is kept
because it is the right order, not because it repaints the material.

**There was no shadow at all, on any backend.** A new `shadow` parameter (default `0.55`) draws a
soft ambient cast sized from the element plus a tight contact line, so the glass stops reading as a
hole cut in the page. `box-shadow` also joins the overlay backend's restore list, so a shadow you
authored yourself now survives a backend swap.

**Wide elements had no rim optics left.** The displacement map budgeted by longest side, so a
1440×64 bar spent its texels on length and resolved a 24px bevel with 5.7 of them — on the one shape
this material is used for most. The budget is an area now, with a floor on texels across the band and
a ceiling so a weak tier is never handed more than it can afford: that bar goes from 5.7 to 24 texels
across the band, a 420×280 card from 19.6 to 24, and a small pill is unchanged.

**Dispersion was inverted in the WebGL shader.** Blue refracts more than red; the shader displaced
red more, so the two backends drew mirrored fringes and the GL one was backwards.

**The highlight could not move.** The shader tested a flat three-pixel mask with a very broad lobe,
giving a ring that changed brightness around the perimeter but never shifted position — and the rim
brightening was a linear white ramp across the whole bevel. Both now use the surface slope the
refraction step already solves for: Blinn-Phong against a real normal, so the highlight rolls across
the bevel as the light moves, with a weak second lobe opposite it, and Schlick instead of the ramp,
so the edge brightening is a hairline where the surface turns edge-on and it reflects an environment
rather than flat white.

Also: the bezel's conic highlight sat 90° from the light direction it tracks, so on the default
backends — where that ring is the entire light response — the material was lit from the wrong side.
