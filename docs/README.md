# Documentation

The [root README](../README.md) is the reference: install, the full option table, the handle and its
events, and what `attach()` takes over on your element. Everything here goes deeper on one thing.

## Start here

If you are new to the library, in this order:

1. **[Root README](../README.md)** — install it, attach one surface, read the option table.
2. **Your framework** — [React](react.md), [Vue](vue.md), [Svelte](svelte.md) or the
   [web component](web-component.md). Each one covers the same ground for its own idioms: the
   smallest working example, how options map to props or attributes, how to reach the engine handle,
   what happens during server rendering, and one composed component at the end.
3. **[Recipes](recipes.md)** — whole components, framework-agnostic. A floating nav, a tactile card,
   a melting tab bar, a morph, a lens over your own artwork.
4. **[Accessibility](accessibility.md)** — before you ship. What the engine handles for you and what
   it structurally cannot.

Then, when a specific question comes up:

- **[Troubleshooting](troubleshooting.md)** — symptom first. Start with "read the element".
- **[Browser support](browser-support.md)** — what each engine actually renders.
- **[Performance](performance.md)** — what a surface costs and which knob moves it.

## Every document

| Document | What it is for |
| --- | --- |
| [react.md](react.md) | The `LiquidGlass` component, `useLiquidGlass`, reaching the handle, the missing `"use client"` banner, Strict Mode |
| [vue.md](vue.md) | The component and the `v-liquid-glass` directive, the `preset` / `options` split, the exposed `glass()`, Nuxt |
| [svelte.md](svelte.md) | The `use:liquidGlass` action and the Svelte 5 `{@attach glass()}` form, when each one is right, `glassOf` |
| [web-component.md](web-component.md) | `<liquid-glass>` and `<liquid-glass-group>`: the whole attribute surface, DOM events, groups, CDN use, framework interop |
| [recipes.md](recipes.md) | Working patterns, each one a whole component rather than a fragment |
| [accessibility.md](accessibility.md) | Injected layers, the OS preferences the engine honours, the contrast it cannot decide for you, how to check all of it |
| [troubleshooting.md](troubleshooting.md) | Symptoms and causes: flat lenses, merge groups, stacking order, CSP, hydration, a stuck watchdog |
| [browser-support.md](browser-support.md) | Engine-by-engine behaviour, the capability probe, the per-backend fidelity matrix, version floors |
| [performance.md](performance.md) | Where the time goes, the quality knobs, the fps watchdog, how to measure |
| [architecture.md](architecture.md) | Module map, dependency direction, how a tier is selected. Read this before changing the engine |
| [research/competitive-landscape.md](research/competitive-landscape.md) | Sources and methodology behind the comparison table in the README |

The generated API reference lives at
[liquidglassjs.vercel.app/api/](https://liquidglassjs.vercel.app/api/), built from the published
entry points. `docs/superpowers/` holds implementation plans and is history rather than
documentation.

## Contributing to these documents

[CONTRIBUTING.md](../CONTRIBUTING.md) has the gate every change has to pass. Two rules apply to the
documentation specifically:

- **If a change alters what a backend can do, the fidelity matrix in
  [browser-support.md](browser-support.md#fidelity-matrix) is part of that change.**
- **Every code sample has to be valid against the current API.** The exported surface is
  `packages/core/src/index.ts` and the four adapter entry points; a sample that would not compile is
  a bug.
