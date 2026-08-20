# Web component

`<liquid-glass>` is the framework-free surface: a custom element that attaches the engine when it
enters the document and detaches when it leaves. It works in any framework, and in no framework at
all.

```sh
npm i @surdeddd/liquidglass
```

## The smallest thing that works

```html
<script type="module">
  import { define } from '@surdeddd/liquidglass/element'
  define()
</script>

<liquid-glass class="card" preset="frosted">Hello</liquid-glass>
```

Or with no build step at all. The CDN bundle registers the element as it loads, so the import and
the `define()` call are already done for you:

```html
<liquid-glass class="card" preset="frosted">Hello</liquid-glass>

<script src="https://unpkg.com/@surdeddd/liquidglass@0.10.0/dist/liquidglass.global.js"></script>
```

Everything the core exports is on the `LiquidGlass` global in that build — `attach`, `autoAttach`,
`configure`, `morphGlass`, `getInstance`.

**Give it a `display`.** A custom element is `display: inline` until you say otherwise, which is
rarely what a glass panel wants:

```css
liquid-glass {
  display: block;
}
```

## `define()`

```ts
function define(tag?: string): void
```

Registers `<liquid-glass>` and `<liquid-glass-group>`. It is idempotent — calling it twice is safe,
and it skips any tag name that is already registered — and it returns immediately without doing
anything when `customElements` is undefined, which is what makes it safe to call during server
rendering.

Pass a name to register under a different tag. The group tag follows it:

```js
define('x-glass') // registers <x-glass> and <x-glass-group>
```

## Options are attributes

Every attribute maps to one engine option. Numeric attributes take a number; a value that does not
parse is ignored and the option keeps its preset default.

| Attribute | Option | Values |
| --- | --- | --- |
| `preset` | `preset` | `clear`, `frosted`, `tinted`; anything else reads as `clear` |
| `backend` | `backend` | one of the six backend ids; anything else reads as `auto` |
| `backdrop` | `backdrop` | a CSS selector for the refraction source |
| `scene-image` | `sceneImage` | image URL for `webgl-scene` |
| `shape` | `shape` | `squircle`; anything else reads as `rounded` |
| `physics` | `physics` | `false` or `off` disable it; any other value — including empty — enables it |
| `adaptive` | `adaptive` | `false` or `off` disable it; any other value enables it |
| `motion-light` | `motionLight` | boolean attribute: present is on, absent is off |
| `merge` | `merge` | group name |
| `merge-strength` | `mergeStrength` | number |
| `blur`, `saturation`, `brightness`, `tint-opacity`, `refraction`, `ior`, `magnify`, `bevel-depth`, `dispersion`, `specular`, `frost` | the matching option | number |
| `tint` | `tint` | any CSS colour the engine can parse — hex or `rgb()` |
| `thickness`, `bevel-width`, `radius` | the matching option | number, or `auto` |

Six of those are read even when the attribute is absent, which is how a bare `<liquid-glass>` still
gets sensible behaviour: `preset` (`clear`), `backend` (`auto`), `shape` (`rounded`), `physics`
(on), `adaptive` (on) and `motion-light` (off). Every other option falls through to whatever the
preset sets.

Attributes are observed, so changing one at runtime applies it, and **removing one resets that
option to its preset default**:

```js
const el = document.querySelector('liquid-glass')
el.setAttribute('ior', '1.9')
el.removeAttribute('ior') // back to 1.5
```

Three options have no attribute: `shadow`, `lighting` and `quality`. Set those through the handle.

## Properties

| Property | Type | What it gives you |
| --- | --- | --- |
| `el.glass` | `LiquidGlassHandle \| undefined` | The live handle, or `undefined` before the element is connected and after it is removed |
| `el.options` | `LiquidGlassOptions` | The options as currently parsed from the attributes — a fresh read, not a cached snapshot |

```js
const el = document.querySelector('liquid-glass')

el.glass?.set({ shadow: 0, quality: { mapSide: 240, caPasses: 1 } })
console.log(el.glass?.backend)
```

`el.glass` is the escape hatch for everything the attribute surface does not cover: per-surface
quality, `shadow`, subscribing to events with an unsubscribe function you keep.

## Events

Every engine event is re-dispatched on the element as a `CustomEvent`, `bubbles: true` and
`composed: true`, so a listener on `document` sees all of them.

| DOM event | `detail` |
| --- | --- |
| `liquid-glass:backendchange` | `BackendId` |
| `liquid-glass:degrade` | `BackendId` |
| `liquid-glass:tonechange` | `'light' \| 'dark' \| null` |
| `liquid-glass:press` | `{ x: number, y: number }` — relative to the element's top-left corner |
| `liquid-glass:release` | `null` |

```js
document.addEventListener('liquid-glass:tonechange', event => {
  event.target.classList.toggle('on-light', event.detail === 'light')
})
```

The subscriptions are torn down in `disconnectedCallback`, so an element that has left the document
stops emitting.

`HTMLElementEventMap` is augmented by the package, so in TypeScript a listener on the element itself
types its `detail` without a cast. `DocumentEventMap` is not augmented — TypeScript has no way to
know a given document will ever contain one — so a delegated listener on `document` needs one:

```ts
document.addEventListener('liquid-glass:tonechange', (event: Event) => {
  const { detail } = event as CustomEvent<'light' | 'dark' | null>
})
```

## Groups

`<liquid-glass-group>` is a thin wrapper that puts every glass element under it into one metaball
group:

```html
<liquid-glass-group spacing="46">
  <liquid-glass class="bar"></liquid-glass>
  <liquid-glass class="pill"></liquid-glass>
</liquid-glass-group>
```

It generates a group name, writes `merge` and `merge-strength` onto each descendant, and sets
`backend="webgl-overlay"` on any of them that does not already name a backend — merging exists only
on that tier. `spacing` becomes `mergeStrength`; a missing, non-numeric or non-positive value falls
back to `40`. The group watches its own subtree, so lenses added later join it.

A group holds **8** lenses, which is the size of the shader's shape array, and every member renders
with the **first** member's material. See
[Troubleshooting](troubleshooting.md#only-some-of-my-lenses-merge).

## Server rendering and hydration

`<liquid-glass>` markup rendered on the server is inert HTML until `define()` runs in the browser
and the element upgrades. `define()` itself is a no-op without `customElements`, so importing and
calling it in shared code is safe.

Two things follow:

- **The element has no styling of its own before it upgrades.** Style it as you would any other
  element and it will look right immediately; the glass is added on top. `liquid-glass:not(:defined)`
  is the hook if you want to treat the pre-upgrade state differently.
- **Nothing about the upgrade changes the DOM structure**, so there is no hydration mismatch to
  manage in any framework.

## Using it inside a framework

| | What it needs |
| --- | --- |
| Vanilla, Svelte, Angular | Nothing — attributes and events work as written |
| React | Attributes pass through on both 18 and 19. In TSX you need your own `JSX.IntrinsicElements` entry: the package augments `HTMLElementTagNameMap` and `HTMLElementEventMap`, not the JSX namespace |
| Vue | Tell the compiler the tag is a custom element, or Vue warns about an unknown component: `compilerOptions.isCustomElement: tag => tag.startsWith('liquid-glass')` in your Vite or Vue config |

React and Vue also have first-class adapters — [react.md](react.md), [vue.md](vue.md) — which are
the better choice inside those frameworks. The custom element earns its place in plain HTML, in
templating languages, in design systems that ship one artifact for several frameworks, and anywhere
the CDN build is the whole install.

## Attaching without an element

For markup you do not control the tag name of, `autoAttach()` scans for a data attribute instead:

```html
<div data-liquid-glass-auto='{"preset":"frosted","ior":1.6}'>…</div>

<script src="https://unpkg.com/@surdeddd/liquidglass@0.10.0/dist/liquidglass.global.js"></script>
<script>
  LiquidGlass.autoAttach()
</script>
```

The attribute value is JSON. `autoAttach` keeps watching, so elements added later are picked up and
elements removed from the document are detached; it returns a stop function, and it is inert without
a DOM. A malformed attribute is contained to its own element — that element is still attached, with
default options, rather than skipped.

## Cleanup and lifecycle

`connectedCallback` attaches and subscribes; `disconnectedCallback` unsubscribes and detaches, which
restores the inline styles the engine took over and removes the injected layers. Moving an element
in the DOM runs both, so it comes back attached with its attributes re-read.

**One glass per element.** If you also call `attach()` on a `<liquid-glass>` node by hand, you get
the same handle back with your options applied — not a second surface — and removing the element
from the document destroys it for both callers.

## A composed example

A tab bar whose selection pill melts into it, in plain HTML.

```html
<div class="dock">
  <liquid-glass-group spacing="46">
    <liquid-glass class="dock-bar" preset="clear" physics="false"></liquid-glass>
    <liquid-glass class="dock-pill" preset="clear" physics="false"></liquid-glass>
  </liquid-glass-group>
  <nav class="dock-tabs" data-liquid-glass-ignore aria-label="Sections">
    <button type="button" aria-current="page">home</button>
    <button type="button">search</button>
    <button type="button">library</button>
  </nav>
</div>
```

```css
.dock {
  position: relative;
  width: 336px;
  height: 60px;
  margin: 0 auto;
}

.dock-bar,
.dock-pill,
.dock-tabs {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

.dock-pill {
  right: auto;
  width: 112px;
  transition: translate 260ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.dock-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  z-index: 2147483001;
}

.dock-tabs button {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
```

```js
const pill = document.querySelector('.dock-pill')

document.querySelector('.dock-tabs').addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button) return
  const index = [...button.parentElement.children].indexOf(button)
  for (const tab of button.parentElement.children) tab.removeAttribute('aria-current')
  button.setAttribute('aria-current', 'page')
  pill.style.translate = `${index * 112}px 0`
})
```

Three things in there are load-bearing:

- **`.dock` is `position: relative`, not `position: fixed`.** A fixed element creates a stacking
  context, and everything inside one is trapped below the overlay canvas no matter how high its own
  z-index goes. The same applies to an ancestor with `transform`, `filter`, `opacity` under 1,
  `isolation: isolate` or `contain: paint`.
- **The label layer clears the overlay's z-index band.** The shared canvas sits at 2147483000 by
  default (`configure({ overlayZIndex })` moves it, `getQuality().overlayZIndex` reads it). 2147483002
  and 2147483003 belong to `morphGlass` and `mountScrollEdge`, so one above the canvas is the step to
  take.
- **`data-liquid-glass-ignore` keeps the labels out of the snapshot.** The overlay tier rasterizes
  the page to get its refraction texture. Without the attribute the labels are refracted *and*
  painted over the top, which reads as a double image.

## Where to look next

- [Options and events](../README.md#options) — the full option table and the handle API
- [Recipes](recipes.md) — more whole components
- [Accessibility](accessibility.md) — the element has no implicit role, and what that means
- [Troubleshooting](troubleshooting.md) — merge groups, stacking order, CSP
