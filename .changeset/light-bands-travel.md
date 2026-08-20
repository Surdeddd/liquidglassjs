---
'@surdeddd/liquidglass': patch
---

The page snapshot learned to photograph only where the glass stands.

The overlay tier used to rasterize the entire document for its backdrop texture — on a long page
that meant serializing thousands of nodes and megabytes of pixels nobody would ever sample. The
snapshot now covers a band around the surfaces that actually need it, with a viewport of margin on
each side: subtrees below the band are pruned before serialization, texel density is capped where
blur would hide the difference anyway, and the luminance grid follows the band instead of the whole
page. If a surface ever walks toward the band's edge, the snapshot quietly retakes itself.

Same picture through the glass — sharper, if anything — for roughly half the cloning work and a
fraction of the texture memory on long pages.
