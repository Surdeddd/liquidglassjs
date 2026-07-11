---
'@surdeddd/liquidglass': minor
'@surdeddd/liquidglass-core': minor
'@surdeddd/liquidglass-element': minor
'@surdeddd/liquidglass-react': minor
'@surdeddd/liquidglass-vue': minor
'@surdeddd/liquidglass-svelte': minor
---

One-package install: new `@surdeddd/liquidglass` bundles every framework entry behind subpath exports (`/react`, `/vue`, `/svelte`, `/element`) with optional peers. Safari performance: backdrop clones are positioned with cached transforms instead of per-frame left/top writes, and the host backdrop-filter turns off when the clone fully covers the glass, removing double blur. Snapshot layout is pinned with explicit width/height, glass UI layers can opt out of refraction via `data-liquid-glass-ignore`, and CSS radius percentages now resolve correctly everywhere.
