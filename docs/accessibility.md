# Accessibility

Glass is a translucent layer between your content and whatever is behind it, which makes it an
accessibility problem by construction. The engine handles the half it owns — its own injected DOM,
the OS preferences, the tone of the backdrop — and cannot handle the half you own, which is the
contrast of your text sitting on top. This page is the line between the two.

## What the engine does for you

### Injected layers are hidden from assistive tech

Every node the engine adds to your page carries `aria-hidden="true"` and, where it could otherwise
swallow input, `pointer-events: none`.

| Node | Which tier adds it | Marked with |
| --- | --- | --- |
| `div[data-liquid-glass-layer="bezel"]` | any tier, when `specular > 0` | `aria-hidden`, `pointer-events: none` |
| `div[data-liquid-glass-layer="glow"]` | any tier, first time a press lands | `aria-hidden`, `pointer-events: none` |
| `div[data-liquid-glass-layer="refract"]` | `svg-content` | `aria-hidden`, `pointer-events: none`, `z-index: -1` |
| the backdrop clone inside that layer | `svg-content` | `aria-hidden`, `inert`, `pointer-events: none`, `user-select: none`, and every `id` and `name` stripped |
| `svg[data-liquid-glass-ignore]` holding the filter defs | `css-svg`, `svg-content` | `aria-hidden`, positioned off-screen at zero size |
| `canvas[data-liquid-glass-overlay]` | `webgl-overlay` | `aria-hidden`, `pointer-events: none` |
| the scene canvas | `webgl-scene` | `aria-hidden`, `pointer-events: none`, `z-index: -1` |
| `div[data-liquid-glass-layer="scroll-edge"]` | `mountScrollEdge()` | `aria-hidden`, `pointer-events: none`, `data-liquid-glass-ignore` |

The stripped `id` and `name` attributes on the `svg-content` clone are the subtle one. That tier
duplicates a live subtree into a refraction layer, and a duplicated `id` would silently break every
`label[for]`, `aria-labelledby` and `aria-describedby` pointing at the original — the first match in
document order wins, and the clone can be first. The clone is also `inert`, so nothing in it takes
focus.

The end-to-end suite asserts this on every engine, on every push.

### Reduced motion is honoured, live

Under `prefers-reduced-motion: reduce`:

- **No physics controller is created at all.** No press squash, no release wobble, no hover
  magnetism. The `press` and `release` events do not fire either, because nothing is listening for
  the pointer.
- **The bezel highlight stops moving.** It is still painted, at a fixed 45° light angle; the pointer
  and device-orientation drivers are not registered.
- **`morphGlass()` does not animate.** It hides the source element and resolves its promise
  immediately, so anything you chained off the promise still runs — the target simply appears where
  it belongs instead of springing there.

The engine subscribes to the media query rather than reading it once, so turning the OS setting on
tears the physics down and turning it off builds it back, without a reload.

### Reduced transparency and forced colors switch the material

`prefers-reduced-transparency: reduce` and `forced-colors: active` both put the surface on the same
reduced material:

| | Normal | Reduced |
| --- | --- | --- |
| `refraction` | as configured | `0` |
| `dispersion` | as configured | `0` |
| `blur` | as configured | capped at `4`px |
| `tintOpacity` | as configured | raised to at least `0.85` |

Note the last row: **0.85 is not opaque.** Roughly 15% of the backdrop still shows through, so this
raises the floor under your contrast without guaranteeing it. If you need a genuinely solid surface,
set `tintOpacity: 1` yourself, or override it in CSS under the same media query.

Both queries are watched, so the change follows the OS setting live.

`prefers-reduced-transparency` is only observable from a page in Chromium 118+ — Firefox keeps it
behind a flag and Safari has not shipped it — so on those engines the user's setting is invisible to
the library. Treat the reduced material as a bonus, not as your contrast plan.

### Adaptive tone

With `adaptive` left on, which is the default, the engine works out whether the surface is standing
on light or dark content and reacts twice:

- It makes the **default** tint follow the backdrop, the way Apple's material does: `#14171e` smoke
  at an opacity of at least `0.32` over dark content, white frost at an opacity of at least `0.4`
  over light. A `tint` you set explicitly is never touched — setting one is how you opt out.
- It writes `data-liquid-glass-tone="light"` or `"dark"` on your element, sets `--lg-on-glass` to a
  matching content color you can use directly, and emits `tonechange` for anything richer.

The crossover is a relative luminance of `0.179`, which is where black and white text trade places
for contrast against a grey.

Two sources feed it. The first walks up the ancestor chain compositing background colours; a CSS
gradient is reduced to the average of its stops, and only a raster background image makes it give
up — `null`, no attribute. The second is a coarse luminance grid built from the page snapshot, which only exists once a
`webgl-overlay` lens has taken one; `setLuminanceGrid()` is exported so you can supply your own from
whatever you already know about the page.

### What the engine deliberately does not touch

It sets no `role`, no `tabindex` and no `aria-*` on your element, and it never changes what the
element is. `<liquid-glass>` is a plain `HTMLElement` with no implicit role — if it is a button, put
a real `<button>` inside it or give it the role and keyboard handling yourself.

Physics is driven entirely by pointer events. There is no keyboard equivalent of the press squash,
so a control that only signals activation through the glass signals nothing to a keyboard user.

## What it cannot do for you

### The contrast of your content

This is the one that matters. Adaptive tone adapts **the glass**. Nothing adapts your text.

The effective background behind your text is `tint` at `tintOpacity`, composited over a blurred,
saturated, refracted copy of whatever is behind the element. At `preset: 'clear'` that is a 6% white
wash over live page content — which means the contrast of your text is, in the general case, whatever
happens to scroll underneath it.

Three ways out, roughly in order of how much they cost you visually:

1. **Style from the tone.** Subscribe to `tonechange`, or select on `[data-liquid-glass-tone="light"]`,
   and switch your text colour. Handle the `null` case as a neutral default rather than assuming
   dark — that is what you get over a gradient or an image.
2. **Make the surface deterministic.** Raise `tintOpacity` until the composite no longer depends on
   the backdrop. `preset: 'frosted'` (14%) is a start; anything that has to meet a contrast ratio
   with certainty wants considerably more.
3. **Give the text its own backing.** A `text-shadow` or a small solid chip behind the label costs
   nothing and survives any backdrop.

Measure the composite, not the tint. Screenshot the rendered surface and sample the pixels under
your text — the value in the option table is one layer of several.

### Focus indication

The engine takes over `background`, `box-shadow`, `border-radius` and `clip-path` as inline styles
for the life of the surface. **A focus ring drawn with `box-shadow` will be overwritten.**

`outline` and `outline-offset` are never touched by any tier, so that is where a focus ring belongs:

```css
[data-liquid-glass]:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
```

### Pointer targets that move

Hover magnetism translates the element toward the pointer by 5% of the pointer's offset from the
element's centre — at most 5% of its half-width, since the listener is on the element itself. It is
off by default on coarse pointers, and it can be off everywhere:

```ts
attach(el, { physics: { press: true, hover: false } })
```

Anything with a small hit target, or anything a user with a motor impairment has to land on twice,
should not move under the pointer.

## How to check it

**The injected layers.** Run this in the console on a page with glass on it; it should return an
empty array. It is the same assertion the end-to-end suite makes:

```js
[...document.querySelectorAll('[data-liquid-glass-layer], [data-liquid-glass-overlay], svg defs')]
  .map(node => node.closest('svg') ?? node)
  .filter(node => node.getAttribute('aria-hidden') !== 'true')
```

**Reduced motion.** DevTools → Rendering → *Emulate CSS media feature prefers-reduced-motion*, or in
a test:

```ts
await page.emulateMedia({ reducedMotion: 'reduce' })
```

Then press the surface and read `getComputedStyle(el).transform`. It should stay `none`.

**Forced colors.**

```ts
await page.emulateMedia({ forcedColors: 'active' })
```

**Reduced transparency.** Playwright's `emulateMedia` has no option for it. Use DevTools → Rendering
→ *Emulate CSS media feature prefers-reduced-transparency*, or drive it over CDP in Chromium:

```ts
const cdp = await context.newCDPSession(page)
await cdp.send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
})
```

The surface should come back with `backdrop-filter: blur(4px) …` and a tint alpha of at least 0.85.

**Keyboard.** Tab through the page. The lens should not take focus unless you made it focusable, and
whatever is inside it should be reachable in the order the markup implies.

**Contrast.** Screenshot and sample. Automated contrast checkers read declared colours, and the
declared colour of a glass surface is a 6% tint — they will report a pass that does not exist.

## Forced colors, in detail

Windows High Contrast and the other forced-colors modes replace the page's palette with the user's.
Three facts about how that interacts with this library:

- The engine reacts to `forced-colors: active` by switching to the reduced-transparency material
  above, and follows the setting live.
- It sets `forced-color-adjust` nowhere. Whatever the platform substitutes, it substitutes; the
  library neither opts your content out nor forces it in.
- The specular bezel and the press glow are painted as gradients, and forced colors does not remove
  background images. The bezel is there until you remove it — `specular: 0` drops the layer
  entirely — and the glow only exists while a press is held, which means only when physics is on.

If you would rather the glass simply stop existing under forced colors, do it in CSS. Author
`!important` beats the engine's inline values:

```css
@media (forced-colors: active) {
  [data-liquid-glass] {
    background: Canvas !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }
}
```

## Where to look next

- [Browser support](browser-support.md#accessibility-behaviour-per-engine) — which signals each
  engine can actually report
- [Troubleshooting](troubleshooting.md#text-over-glass-is-unreadable) — the symptom-first version of
  the contrast section
- [Recipes](recipes.md#reacting-to-what-the-glass-is-standing-on) — wiring `tonechange` into a
  component
