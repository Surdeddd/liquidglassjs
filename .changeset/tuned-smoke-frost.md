---
'@surdeddd/liquidglass': patch
---

The smoke and the frost are now measured against Apple's material, not guessed.

Pixel-probing Apple's own frames put their dark glass at 0.86-1.26x of the backdrop's luminance
and their light frost at +24..+55 luminance over it, hue preserved in both. Ours sat outside that
envelope: the dark smoke crushed backdrops to 0.58-0.73x, and the light frost blew dark backdrops
out to +117. The adaptive floors moved to match - dark smoke to 0.24, light frost to 0.36 - and
every surface now lands inside the measured envelope in both themes.
