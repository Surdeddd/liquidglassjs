---
'@surdeddd/liquidglass': minor
---

The glass is now calibrated against Apple's own renderer instead of being tuned by eye.

A small SwiftUI app renders the same scenes with `glassEffect` on the iOS 26.5 simulator, and every
material constant below comes from measuring those frames against the web output.

- **The lens bends inward, like Apple's.** The rim magnifies what lies under the glass instead of
  pulling in the surroundings. The band is 20 px wide on anything 60 px or larger and narrows on small
  controls; the shift decays from the rim exactly as measured. There is no whole-body zoom any more —
  `magnify` now defaults to 0.
- **`clear`** is a pure lens: a small, constant lift with colour untouched, and no adaptive tint.
- **`frosted`** compresses the backdrop into a light frost or a dark smoke and keeps its colour. It
  follows the page's declared `color-scheme`; in a light scheme it also turns to smoke over dark
  surroundings. Its text colour (`--lg-on-glass`, `data-liquid-glass-tone`) follows the material.
- **`tinted`** is solid colour glass, as Apple's tinted controls are.
- **`frost`** now means diffuse scattering inside the glass rather than grain noise.
- **The rim** is a one-pixel light line along the light axis, brighter and more vivid in a dark scheme,
  and the default light now comes from the top left. The vertical sheen and the inner floor shadow are
  gone; dispersion is off in every preset.
- **WebGL blur** now has the same strength as CSS `blur()` for the same value.
- **Fixed:** in Chromium the lens map of the default `css-svg` tier was placed against a zero-sized
  viewport, so the refraction showed up as a shifted block with a seam. The map is now positioned in
  element pixels on both SVG tiers.
