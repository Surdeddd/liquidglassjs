# Svelte

`@surdeddd/liquidglass/svelte` is two ways to put glass on an element plus a lookup. Svelte 4 and 5
are both supported; Svelte is an optional peer dependency, so installing the package does not pull
it in.

```sh
npm i @surdeddd/liquidglass
```

## The smallest thing that works

```svelte
<script>
  import { liquidGlass } from '@surdeddd/liquidglass/svelte'
</script>

<div class="card" use:liquidGlass={{ preset: 'frosted' }}>Hello</div>
```

The action attaches the engine to the element it sits on. There is no wrapper component, so what you
style is what the engine paints on.

## Action or attachment

Two entry points, and the difference between them is what happens when the options change.

```svelte
<script>
  import { glass, liquidGlass } from '@surdeddd/liquidglass/svelte'
</script>

<!-- svelte 4 and 5 -->
<div use:liquidGlass={{ preset: 'frosted', dispersion: 0.3 }}>…</div>

<!-- svelte 5 attachment -->
<div {@attach glass({ preset: 'frosted', dispersion: 0.3 })}>…</div>
```

| | `use:liquidGlass` | `{@attach glass(…)}` |
| --- | --- | --- |
| Svelte | 4 and 5 | 5 |
| Signature | `(node: Element, options?: LiquidGlassOptions) => { update, destroy }` | `(options?: LiquidGlassOptions) => (node: Element) => () => void` |
| On option change | `update()` applies them to the live handle | no update path — Svelte reruns the attachment, which destroys the surface and builds a new one |
| Teardown | `destroy()` | the returned cleanup |

Reach for the action when the options are driven by state that changes while the surface is on
screen. Reach for the attachment when they are fixed, or when you are already writing Svelte 5 and
the options never move.

The action's `update` also resets what you drop: going from `{ dispersion: 0.4 }` to `{}` puts
`dispersion` back to its preset default rather than leaving the old value in place.

## Reaching the handle

`glassOf(node)` returns the handle for a node the engine has attached to, and `undefined` for
anything else — including `null` and `undefined`, so you do not have to guard the call itself.

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { glassOf, liquidGlass } from '@surdeddd/liquidglass/svelte'

  let bar: HTMLElement

  onMount(() => glassOf(bar)?.on('backendchange', id => console.log('rendering with', id)))
</script>

<div bind:this={bar} class="bar" use:liquidGlass={{ preset: 'clear' }}>…</div>
```

Actions run while the element is being created, so the handle exists by the time `onMount` runs.
`on()` returns its own unsubscribe function, which is why it can be returned straight from
`onMount`.

When neither entry point fits — you want to subscribe to an event and drive local state from it —
write your own action over `attach`. That is the escape hatch, and it is three lines:

```svelte
<script lang="ts">
  import { attach, type BackdropTone, type LiquidGlassOptions } from '@surdeddd/liquidglass/svelte'

  let tone: BackdropTone | null = null

  function tonedGlass(node: Element, options: LiquidGlassOptions) {
    const handle = attach(node, options)
    const off = handle.on('tonechange', next => (tone = next))
    return {
      update: (next: LiquidGlassOptions) => handle.set(next),
      destroy: () => {
        off()
        handle.destroy()
      }
    }
  }
</script>

<div use:tonedGlass={{ preset: 'clear' }} class:on-light={tone === 'light'}>…</div>
```

Everything the core exports is re-exported from `@surdeddd/liquidglass/svelte`, so `attach`,
`getInstance`, `morphGlass`, `configure` and the types come from the same import as the action.

## Server rendering

Every entry imports cleanly in bare Node and nothing touches `window` at import time, so SvelteKit
can import the module in a component that renders on the server.

Actions and attachments are client-only by definition — Svelte does not run them during SSR — so the
server emits your plain element and the glass appears after hydration. No `browser` guard, no
`onMount` wrapper, no dynamic import.

One frame of the hydrated page is painted before the action runs. If that flash matters, give the
element a background in CSS — the engine overwrites `background` inline once it attaches, so a
placeholder colour costs nothing.

## Cleanup and lifecycle

`destroy()` — the action's, or the attachment's returned cleanup — restores the inline styles the
engine took over from the snapshot it captured at mount, removes the `data-liquid-glass*`
attributes, and takes the injected bezel, glow and refraction layers with it. Svelte calls it when
the element leaves the DOM; you only call it yourself in a hand-written action like the one above.

**One glass per element.** `attach()` on an element that already has one returns the same handle and
applies the new options. Two actions on the same node therefore share a handle, and the first
teardown removes it for both.

## A composed example

A dock whose selection pill melts into the bar as it travels between tabs. Metaball merging needs
the `webgl-overlay` tier, so both lenses ask for it by name and share a `merge` group.

The shape of this markup is not arbitrary. The two lenses are **siblings**, and the tab labels sit in
their own layer **above** both, because the merged refraction is painted by a single canvas parked at
the top of the page's z-order — anything that has to read over the glass has to clear it.

```svelte
<script lang="ts">
  import { getQuality, liquidGlass } from '@surdeddd/liquidglass/svelte'

  const tabs = ['home', 'search', 'library']
  let active = $state(0)

  const lens = { backend: 'webgl-overlay', merge: 'dock', mergeStrength: 46, physics: false } as const
  const labelLayer = `z-index: ${getQuality().overlayZIndex + 1}`
</script>

<div class="dock">
  <div class="bar" use:liquidGlass={lens}></div>
  <div class="pill" style="--i: {active}" use:liquidGlass={lens}></div>
  <nav class="tabs" style={labelLayer} data-liquid-glass-ignore aria-label="Sections">
    {#each tabs as tab, i (tab)}
      <button
        type="button"
        aria-current={i === active ? 'page' : undefined}
        onclick={() => (active = i)}
      >
        {tab}
      </button>
    {/each}
  </nav>
</div>

<style>
  .dock {
    position: relative;
    width: 336px;
    height: 60px;
    margin: 0 auto;
  }

  .bar,
  .pill,
  .tabs {
    position: absolute;
    inset: 0;
    border-radius: 999px;
  }

  .pill {
    right: auto;
    width: 112px;
    translate: calc(var(--i) * 112px) 0;
    transition: translate 260ms cubic-bezier(0.2, 0.9, 0.2, 1);
  }

  .tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .tabs button {
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
</style>
```

The neck between the pill and the bar forms on its own — the overlay polls member geometry while
anything in the group is moving. Three things in there are load-bearing:

- **`.dock` is `position: relative`, not `position: fixed`.** A fixed element creates a stacking
  context, and everything inside one is trapped below the overlay canvas no matter how high its own
  z-index goes. The same applies to an ancestor with `transform`, `filter`, `opacity` under 1,
  `isolation: isolate` or `contain: paint`.
- **The label layer clears `overlayZIndex`.** `getQuality().overlayZIndex` is the band the shared
  canvas sits in — 2147483000 by default. Anything above it paints over the glass; 2147483002 and
  2147483003 belong to `morphGlass` and `mountScrollEdge`, so `+ 1` is the step to take.
- **`data-liquid-glass-ignore` keeps the labels out of the snapshot.** The overlay tier rasterizes
  the page to get its refraction texture. Without the attribute the labels are refracted *and*
  painted over the top, which reads as a double image.

Two limits are worth knowing before a dock grows: a `merge` group holds **8** lenses, and every
member of a group renders with the **first** member's material. Both are properties of the shader
pass, not options — [Troubleshooting](troubleshooting.md#only-some-of-my-lenses-merge) has the
detail.

`$state` and `onclick` above are Svelte 5. In Svelte 4 they are a plain `let` and `on:click`;
`use:liquidGlass` itself is unchanged.

## Where to look next

- [Options and events](../README.md#options) — the full option table and the handle API
- [Recipes](recipes.md) — whole components, framework-agnostic
- [Accessibility](accessibility.md) — what the engine handles and what stays yours
- [Troubleshooting](troubleshooting.md) — including merge groups and stacking order
