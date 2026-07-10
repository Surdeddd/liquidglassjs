---
'@surdeddd/liquidglass-core': minor
---

Adaptive contrast and accessibility: WCAG-luminance backdrop tone sampling flips the default tint over light content and exposes data-liquid-glass-tone for text styling (honest null over gradients), prefers-reduced-transparency switches glass to an opaque distortion-free mode, prefers-reduced-motion is now watched live, and every injected render layer is aria-hidden. Opt out per lens with `adaptive: false`.
