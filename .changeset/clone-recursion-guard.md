---
'@surdeddd/liquidglass-core': patch
---

svg-content backdrop clones now strip glass elements and injected layers, preventing infinite clone recursion when the backdrop contains the lens itself (previously hung page load in browsers without WebGL2 where explicit GL backends fall back to svg-content). Mutations inside glass surfaces no longer trigger backdrop reclones, and elements are marked before backend mount.
