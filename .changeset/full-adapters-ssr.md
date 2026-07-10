---
'@surdeddd/liquidglass-react': minor
'@surdeddd/liquidglass-vue': minor
'@surdeddd/liquidglass-element': minor
---

Full adapter surface: the React component and useLiquidGlass hook now pass every engine option through (attach once, shallow-guarded set on updates, ref forwarding, isomorphic layout effect), the Vue component accepts a complete options prop and exposes the handle, the element gains a glass getter, and all packages are verified SSR-safe by a node smoke test wired into CI.
