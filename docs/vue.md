# Vue

`@surdeddd/liquidglass/vue` ships a component and a directive. Vue 3.4 or newer is an optional peer
dependency — installing the package does not pull it in.

```sh
npm i @surdeddd/liquidglass
```

## The smallest thing that works

```vue
<script setup>
import { LiquidGlass } from '@surdeddd/liquidglass/vue'
</script>

<template>
  <LiquidGlass class="card" preset="frosted">Hello</LiquidGlass>
</template>
```

`LiquidGlass` renders a real element — a `div` by default — and attaches the engine to it on mount.
There is no wrapper element and no teleport; what you style is what the engine paints on.

## Options split across two props

`preset` is its own prop because it is the one value most surfaces set. Everything else goes in
`options`.

```vue
<LiquidGlass
  as="nav"
  class="nav"
  preset="clear"
  :options="{ backdrop: 'main', ior: 1.6, dispersion: 0.3, physics: false }"
/>
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `preset` | `'clear' \| 'frosted' \| 'tinted'` | `'clear'` | Merged in front of `options` |
| `as` | string | `'div'` | The tag to render |
| `options` | `LiquidGlassOptions` | `{}` | Everything else the engine takes |

The two are merged as `{ preset, ...options }`, so a `preset` inside `options` wins over the prop.
Pick one and stay with it rather than setting both.

Attributes that are not props fall through to the rendered element — `class`, `style`, `id`,
`aria-*`, `@click` — because the render function returns a single root. That is where a tone class
or a click handler goes.

The `options` object is watched deeply, so replacing it or mutating a field both work. Dropping a
key resets that option to its preset default rather than leaving the old value in place: going from
`{ dispersion: 0.4 }` to `{}` puts `dispersion` back where the preset had it.

## The directive

For an element you already own — one rendered by another component, or plain markup you do not want
to wrap:

```vue
<script setup>
import { vLiquidGlass } from '@surdeddd/liquidglass/vue'
</script>

<template>
  <div v-liquid-glass="{ preset: 'clear', dispersion: 0.3 }">…</div>
</template>
```

Importing `vLiquidGlass` into `<script setup>` registers it locally. Register it once for the whole
app instead if you prefer:

```ts
import { createApp } from 'vue'
import { vLiquidGlass } from '@surdeddd/liquidglass/vue'

createApp(App).directive('liquid-glass', vLiquidGlass).mount('#app')
```

The directive attaches on `mounted`, applies the new binding on `updated` — with the same
drop-a-key-resets-it behaviour as the component — and detaches on `unmounted`. It keeps no handle of
its own; use `getInstance(el)` when you need one.

## Reaching the handle

The component exposes one thing: a `glass()` function that returns the live handle, or `null` before
mount and after unmount.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { LiquidGlass, type LiquidGlassHandle } from '@surdeddd/liquidglass/vue'

const panel = ref<{ glass(): LiquidGlassHandle | null } | null>(null)

onMounted(() => {
  panel.value?.glass()?.on('backendchange', id => console.log('rendering with', id))
})
</script>

<template>
  <LiquidGlass ref="panel" preset="frosted">…</LiquidGlass>
</template>
```

Child components mount before their parent, so the handle exists by the time the parent's
`onMounted` runs. `on()` returns its own unsubscribe function; keep it if the subscription should
outlive less than the component does.

With the directive, or with any element you did not render through the component, go through the
element instead:

```ts
import { getInstance } from '@surdeddd/liquidglass/vue'

const glass = getInstance(el)
glass?.set({ dispersion: 0 })
```

## Server rendering

Every entry imports cleanly in bare Node and nothing touches `window` at import time, so Nuxt and
any other Vue SSR setup can import the component on the server.

- The component's render function runs on the server and emits the plain tag with your fallthrough
  attributes and slot content. `onMounted` does not run there, so no glass is applied and there is
  no markup for hydration to disagree about.
- The directive defines no `getSSRProps`, so it contributes nothing to server-rendered markup and
  takes effect on the client after hydration.
- Neither needs a `<ClientOnly>` wrapper.

One frame of the hydrated page is painted before the engine attaches. If that flash matters, give
the element a background in CSS — the engine overwrites `background` inline once it attaches, so a
placeholder colour costs nothing.

## Cleanup and lifecycle

`onBeforeUnmount` destroys the handle: the inline styles the engine took over are restored from the
snapshot it captured at mount, `data-liquid-glass*` attributes are removed, and the injected bezel,
glow and refraction layers go with it.

The component also watches its own root element ref with `flush: 'post'`, so changing `as` destroys
the surface on the old node and attaches a new one — the same path a real unmount takes.

**One glass per element.** `attach()` on an element that already has one returns the same handle and
applies the new options. If the component and the directive both land on the same node they share a
handle, and the first teardown removes it for both.

## A composed example

A player bar that refracts the page, restyles its own text over light content, and swaps material
when it collapses.

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LiquidGlass, type BackdropTone, type LiquidGlassHandle } from '@surdeddd/liquidglass/vue'

const bar = ref<{ glass(): LiquidGlassHandle | null } | null>(null)
const tone = ref<BackdropTone | null>(null)
const compact = ref(false)

const options = computed(() => ({
  backdrop: 'main',
  physics: false,
  blur: compact.value ? 14 : 6,
  dispersion: compact.value ? 0 : 0.3
}))

onMounted(() => {
  bar.value?.glass()?.on('tonechange', next => {
    tone.value = next
  })
})
</script>

<template>
  <LiquidGlass
    ref="bar"
    as="footer"
    class="player"
    :class="{ 'player--on-light': tone === 'light' }"
    preset="clear"
    :options="options"
  >
    <button type="button" @click="compact = !compact">
      {{ compact ? 'expand' : 'collapse' }}
    </button>
  </LiquidGlass>
</template>

<style scoped>
.player {
  position: fixed;
  inset: auto 16px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-radius: 26px;
  color: #f4f5f7;
}

.player--on-light {
  color: #16181d;
}
</style>
```

`physics: false` keeps page chrome from moving under the pointer. `backdrop: 'main'` gives Safari
and Firefox a concrete element to refract instead of making them walk the ancestor chain looking for
one that paints, and it is the cheaper choice — that element is what gets cloned into the refraction
layer. `tone` is `null` whenever the backdrop cannot be resolved — a gradient, an image — so style
that case as your neutral default rather than assuming dark.

Dropping `dispersion` to `0` in the compact state is not decoration. On the Chromium tier dispersion
costs three displacement passes instead of one, and a bar that is on screen the whole time is
exactly where that shows up.

## Where to look next

- [Options and events](../README.md#options) — the full option table and the handle API
- [Recipes](recipes.md) — whole components, framework-agnostic
- [Accessibility](accessibility.md) — what the engine handles and what stays yours
- [Troubleshooting](troubleshooting.md) — including hydration and stacking order
