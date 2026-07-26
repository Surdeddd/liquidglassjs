# Changelog

One package ships from this repository, so its changelog is the release history:
[packages/liquidglass/CHANGELOG.md](packages/liquidglass/CHANGELOG.md).

The workspace packages (`-core`, `-element`, `-react`, `-vue`, `-svelte`) are private build inputs.
They are versioned in lockstep with the published package and are not installable on their own.

## Versioning

Pre-1.0, so a minor bump can carry a breaking change. Anything that changes rendering output,
option semantics or the public entry surface is called out in the release notes.

The public API is what `@surdeddd/liquidglass` and its `/element`, `/react`, `/vue` and `/svelte`
entries export. Internals such as `GlRenderer`, `sdfSuperellipse` or `setLuminanceGrid` are exported
for the demo and tests and can change without a major bump.
