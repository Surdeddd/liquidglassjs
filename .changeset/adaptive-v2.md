---
'@surdeddd/liquidglass': minor
---

Adaptive contrast v2: when the overlay snapshot exists the engine samples real backdrop luminance under each glass (48-column grid, hysteresis at the threshold) instead of guessing from ancestor background colors — tone flips now match what is actually behind the lens, with a graceful fallback to the old heuristic.
