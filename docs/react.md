# React

`@surdeddd/liquidglass/react` is a component, a hook, and a way back to the engine handle. React 18
and 19 are both supported (`>=18 <20`); the adapter uses `forwardRef` and a layout effect, and does
nothing React-version-specific beyond that.

```sh
npm i @surdeddd/liquidglass
```

React is an optional peer dependency — installing the package does not pull it in.

## The smallest thing that works

```tsx
'use client'

import { LiquidGlass } from '@surdeddd/liquidglass/react'

export function Card() {
  return (
    <LiquidGlass className="card" preset="frosted">
      Hello
    </LiquidGlass>
  )
}
```

`LiquidGlass` renders a real element — a `div` by default — and attaches the engine to it after the
node lands. Everything the engine paints goes on that element; there is no wrapper, no portal and no
shadow root.

## Options are props

Props are split by name. Anything that is a key of `LiquidGlassOptions` becomes an engine option;
everything else goes on the DOM element untouched.

```tsx
<LiquidGlass
  as="nav"
  className="nav"
  aria-label="Primary"
  onPointerEnter={warm}
  preset="clear"
  backdrop="main"
  ior={1.6}
  dispersion={0.3}
  physics={{ press: false, hover: true, wobble: 0.4 }}
>
  {links}
</LiquidGlass>
```

| Prop | What it does |
| --- | --- |
| `as` | The tag to render. Any key of `HTMLElementTagNameMap`; defaults to `'div'` |
| `className`, `style`, `children` | Passed through as usual |
| Any option name | Read as an engine option, never written to the DOM |
| Anything else | Forwarded to the element — `id`, `title`, `aria-*`, `data-*`, event handlers |

Option names win the split, so a DOM attribute that shares a name with an option cannot be set this
way. Reach for `useLiquidGlass` with your own element if you need that.

Three things follow from how updates are applied:

- **Dropping a prop resets that option.** Rendering `dispersion={0.4}` and then rendering without it
  puts `dispersion` back to the preset default, rather than leaving the old value in place.
- **Inline objects do not thrash.** `physics` and `quality` objects are compared by value, one level
  deep, so a fresh `{ press: true }` literal on every render does not tear down and rebuild the
  physics controller.
- **Changing `as` re-attaches.** The old node is destroyed — inline styles restored, data attributes
  removed — and the new one is attached.

## The hook

```tsx
import { useRef } from 'react'
import { useLiquidGlass } from '@surdeddd/liquidglass/react'

export function Panel() {
  const ref = useRef<HTMLDivElement>(null)
  useLiquidGlass(ref, { preset: 'frosted', dispersion: 0.3 })
  return <div ref={ref} className="panel" />
}
```

```ts
function useLiquidGlass(ref: RefObject<Element | null>, options?: LiquidGlassOptions): void
```

The hook is what the component uses internally. Use it directly when you need the element itself —
a third-party component that forwards a ref, a `<canvas>`, an element you also measure.

It attaches in a layout effect, so the glass is applied before the browser paints. On the server the
layout effect degrades to `useEffect`, which does not run there at all.

## Reaching the handle

The component forwards a ref to the DOM node:

```tsx
const node = useRef<HTMLElement>(null)

<LiquidGlass ref={node} as="section" preset="clear" />
```

From a node, `getInstance` gives you the handle:

```tsx
import { getInstance } from '@surdeddd/liquidglass/react'

useEffect(() => {
  const glass = node.current ? getInstance(node.current) : undefined
  return glass?.on('backendchange', id => console.log('rendering with', id))
}, [])
```

A passive effect runs after the layout effect that attached the glass, so the handle is there by the
time the subscription is set up. `on()` returns its own unsubscribe function, which is why it can be
returned straight from the effect.

`useLiquidGlassHandle(ref)` is the same lookup read during render:

```ts
function useLiquidGlassHandle(ref: RefObject<Element | null>): LiquidGlassHandle | undefined
```

It does not subscribe and does not schedule a re-render, so on the first render it returns
`undefined` — the ref is still empty. It is meant for event handlers and callbacks that run after
mount, not for reading during render.

## Server rendering

Every entry imports cleanly in bare Node, and nothing touches `window` at import time. What the
component renders on the server is the plain tag with your `className`, `style` and children; the
glass is applied on the client after hydration, so there is no markup to mismatch.

**There is no `"use client"` banner in the package.** This is deliberate and it is the one thing you
have to handle yourself: a React Server Component that imports `LiquidGlass`, `useLiquidGlass` or
`useLiquidGlassHandle` will fail to build. Put the directive at the top of your own module — the one
that does the importing:

```tsx
'use client'

import { LiquidGlass } from '@surdeddd/liquidglass/react'
```

Or keep the import out of the server graph entirely:

```tsx
import dynamic from 'next/dynamic'

const Glass = dynamic(() => import('./glass').then(m => m.Glass), { ssr: false })
```

`pnpm ssr` in this repository proves the entries load in Node. It does not exercise the RSC
boundary, so it will not catch a missing directive for you.

One frame of the hydrated page is painted before the layout effect attaches. If that flash matters,
give the element a background in CSS — the engine overwrites `background` inline once it attaches,
so a placeholder colour costs nothing.

## Cleanup and lifecycle

Unmounting destroys the handle: inline styles the engine took over are restored from the snapshot it
captured at mount, `data-liquid-glass*` attributes are removed, and the injected bezel, glow and
refraction layers go with it.

The hook holds the handle in a ref rather than in state, so nothing about attaching or destroying
causes a render. Strict Mode's development double-invoke — mount, unmount, mount — tears the surface
down and rebuilds it, which is the same path a real remount takes.

Two lifetimes to keep straight:

- **One glass per element.** `attach()` on an element that already has one returns the same handle
  and applies the new options. If two components mount glass on the same node, they share a handle,
  and the first `destroy()` removes it for both.
- **The handle outlives nothing.** After unmount, a captured handle is inert; calling `destroy()` on
  it again is a no-op.

## A composed example

A floating nav that refracts the page under it and restyles its own text when it drifts over light
content.

```tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getInstance, useLiquidGlass, type BackdropTone } from '@surdeddd/liquidglass/react'

export function GlassNav({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [tone, setTone] = useState<BackdropTone | null>(null)

  useLiquidGlass(ref, {
    preset: 'clear',
    backdrop: 'main',
    physics: false,
    motionLight: true
  })

  useEffect(() => {
    const glass = ref.current ? getInstance(ref.current) : undefined
    return glass?.on('tonechange', setTone)
  }, [])

  return (
    <nav ref={ref} className={tone === 'light' ? 'nav nav--on-light' : 'nav'}>
      {children}
    </nav>
  )
}
```

```css
.nav {
  position: fixed;
  top: 18px;
  left: 50%;
  translate: -50% 0;
  z-index: 40;
  display: flex;
  gap: 20px;
  padding: 11px 22px;
  border-radius: 999px;
  max-width: calc(100vw - 20px);
  color: #f4f5f7;
}

.nav--on-light {
  color: #16181d;
}
```

`physics: false` keeps page chrome from moving under the pointer. `backdrop="main"` gives Safari and
Firefox a concrete element to refract instead of making them walk the ancestor chain looking for one
that paints. `tone` is `null` whenever the backdrop cannot be resolved — a gradient, an image — so
style that case as your neutral default rather than assuming dark.

## Where to look next

- [Options and events](../README.md#options) — the full option table and the handle API
- [Recipes](recipes.md) — whole components, framework-agnostic
- [Accessibility](accessibility.md) — what the engine handles and what stays yours
- [Troubleshooting](troubleshooting.md) — including the RSC boundary and hydration
