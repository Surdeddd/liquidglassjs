---
'@liquidglass/core': minor
'@liquidglass/element': minor
---

Blob merge: the GL shader now combines up to 8 SDF shapes with smooth-min, so lenses in the same merge group melt into each other iOS-26-style on the shared overlay canvas. New `merge` (group name) and `mergeStrength` options, `merge` attribute on the element, union-quad rendering between lenses and a motion poll loop that keeps merged groups in sync while they move.
