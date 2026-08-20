# Contributing

## Getting set up

```sh
pnpm install
pnpm build
```

Node 20.19+ and the pinned pnpm version in `packageManager` are the only requirements. The demo and
docs apps run with `pnpm --filter demo dev` and `pnpm --filter docs dev`.

## The gate

Everything below has to be green before a change is ready. CI runs the same list.

```sh
pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm coverage && pnpm ssr && pnpm size
pnpm e2e
```

`pnpm build` comes first on purpose: the framework adapters resolve `@surdeddd/liquidglass-core`
through its built output, so their tests run against `packages/core/dist`, not `src`. Skipping the
build means testing the previous bundle.

Pixel baselines under `e2e/visual.spec.ts-snapshots/` are captured on macOS and the visual suite
skips itself elsewhere. Regenerate them with `pnpm e2e --update-snapshots` on a Mac when the demo
layout or the optics change, and say so in the pull request.

## House rules

- **No comments in source.** Names and structure carry the meaning; if a line needs a paragraph, it
  needs a better shape instead.
- **A changeset per user-visible change.** Run `pnpm changeset` and name `@surdeddd/liquidglass` —
  the six packages move together, and it is the only one that publishes.
- **Tests that can fail.** A regression test should be verified to fail against the unfixed code
  before it is committed.
- **The engine stays dependency-free.** Anything that has to be bundled goes through a lazy dynamic
  import and gets an entry in `packages/liquidglass/THIRD-PARTY-NOTICES.md`.

## Where things live

`docs/architecture.md` maps the core module layout and the dependency direction.
`docs/browser-support.md` documents the tier selection and the per-backend fidelity matrix — if a
change alters what a backend can do, that matrix is part of the change.

## Reporting a bug

Include the browser and version, the value of `data-liquid-glass-backend` on the affected element,
the package version, and a minimal reproduction. The backend attribute is the single most useful
line in the report: five tiers can render the same surface.
