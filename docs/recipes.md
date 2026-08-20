# Recipes

Working patterns, each one a whole component rather than a fragment. Every snippet assumes
`npm i @surdeddd/liquidglass`.

## A floating nav bar

The pill sits above the page and refracts whatever scrolls under it. Keep `physics` off for chrome
that should not move under the pointer, and give it a backdrop so Safari and Firefox refract the
page rather than falling back to blur.

```html
<liquid-glass class="nav" preset="clear" physics="false" backdrop="main" motion-light>
  <a href="#features">features</a>
  <a href="#pricing">pricing</a>
</liquid-glass>
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
}
```

`max-width` matters: the pill is laid out by its content, and long link lists overflow small screens
without it.

## A card that reacts to touch

Press physics is the default; the values below exaggerate it for a tactile card.

```ts
import { attach } from '@surdeddd/liquidglass'

attach(document.querySelector('.card'), {
  preset: 'frosted',
  physics: { press: true, hover: true, wobble: 0.85 }
})
```

Hover magnetism turns itself off on coarse pointers unless you ask for it explicitly, so a phone
does not get a lens chasing a finger it cannot see.

## A tab bar where the selection melts between tabs

Give the bar and the moving pill the same `merge` group and they flow into each other as the pill
travels. Metaball merging needs the WebGL tier, which `<liquid-glass-group>` selects for you.

```html
<liquid-glass-group spacing="46">
  <liquid-glass class="dock"></liquid-glass>
  <liquid-glass class="dock-pill"></liquid-glass>
</liquid-glass-group>
```

Move the pill with a transform and the neck forms on its own — the group polls member geometry while
anything in it is moving. A group holds 8 lenses; the ninth and later members render without
refraction and without merging, so a bar with more parts than that needs a second `merge` group.

## Morphing one control into another

```ts
import { morphGlass } from '@surdeddd/liquidglass'

button.addEventListener('click', async () => {
  panel.hidden = false
  await morphGlass(button, panel)
})

close.addEventListener('click', () => {
  panel.hidden = true
  button.style.visibility = ''
})
```

The material rides a spring from the source geometry to the target. `morphGlass` hides the source
(`visibility: hidden`) and never puts it back — that is the FLIP illusion, and restoring it when the
target closes is yours to do, as above. Neither element has to have a glass attached; it works on
plain elements. It returns a promise that resolves when the spring settles and takes
`{ stiffness, damping }`, defaulting to 320 and 26. Under `prefers-reduced-motion` it hides the
source and resolves immediately without moving the target, so anything you hang off the promise
still runs.

## A lens over your own artwork

`webgl-scene` owns its scene instead of refracting the page, which is what you want over a canvas,
a video poster or a generated gradient.

```ts
attach(hero, {
  backend: 'webgl-scene',
  sceneImage: '/art/aurora.jpg',
  ior: 1.7,
  magnify: 0.04,
  dispersion: 0.25
})
```

All scene surfaces share one WebGL context, so a page can carry many without exhausting the
browser's context budget.

## Spending less on a surface that does not need the detail

Quality is a per-surface option, not only a global setting. A large decorative panel can run a
coarse displacement map while a small control keeps the sharp one.

```ts
attach(banner, { preset: 'frosted', quality: { mapSide: 240, caPasses: 1 } })
```

`configure()` still sets the page-wide floor; a surface option layers on top of it.

## Reacting to what the glass is standing on

```ts
const glass = attach(panel, { preset: 'clear' })

glass.on('tonechange', tone => {
  panel.classList.toggle('on-light', tone === 'light')
})
```

`tone` is `'light'`, `'dark'`, or `null` when the backdrop cannot be resolved — a gradient or an
image with no dominant luminance. Style the `null` case as a neutral default rather than assuming
dark.

## Attaching without writing JavaScript

```html
<div data-liquid-glass-auto='{"preset":"frosted","ior":1.6}'>…</div>
<script src="https://unpkg.com/@surdeddd/liquidglass@0.10.0/dist/liquidglass.global.js"></script>
<script>
  LiquidGlass.autoAttach()
</script>
```

`autoAttach` keeps watching, so elements added later are picked up. It returns a stop function, and
a malformed attribute is contained to its own element instead of aborting the scan — that element is
still attached, silently, with default options rather than skipped.
