# Performance

What each surface costs, and which knob moves it.

## Where the time goes

| Work | When it runs | Cost driver |
| --- | --- | --- |
| Displacement map | On mount, and when the surface's size, radius, ior, thickness or bevel changes | `mapSide` — the map is `mapSide²` pixels of SDF plus a PNG encode |
| SVG filter chain | On mount, and when material values change the chain shape | `caPasses` — three displacement passes for dispersion instead of one |
| Backdrop clone (`svg-content`) | On mount, and on backdrop mutations near the lens | Size of the cloned subtree |
| Page snapshot (`webgl-overlay`) | Debounced after page mutations | Document size, capped by `MAX_SNAPSHOT_SIDE` |
| Per-frame draw | Only while something moves | Number of lenses; shader samples per pixel |
| Tone sampling | At most every 250 ms per surface | Ancestor chain length |

The scheduler runs one shared `requestAnimationFrame` loop for the whole page and idles when no
spring is active and nothing is scrolling. A static page with attached glass does no per-frame work.

## The knobs

```ts
import { configure, deviceTier, getQuality } from '@surdeddd/liquidglass'

deviceTier()   // 'high' | 'mid' | 'low', from cores, memory and dpr
getQuality()   // the profile in force
configure({ mapSide: 420, caPasses: 1, maxDpr: 1.5, snapshotThrottleMs: 400 })
```

| Setting | Default by tier | Effect |
| --- | --- | --- |
| `mapSide` | 600 / 480 / 320 | Displacement map resolution. Halving it quarters the map work |
| `caPasses` | 3 / 3 / 1 | `1` drops chromatic dispersion to a single pass |
| `maxDpr` | 2 / 2 / 1.5 | Caps the device pixel ratio the GL tiers render at |
| `snapshotThrottleMs` | 250 / 350 / 500 | Floor between overlay page snapshots |
| `overlayZIndex` | 2147483000 | Stacking band for the shared overlay canvas |

Per surface, `quality` overrides `mapSide`, `caPasses` and `maxDpr` for that lens only:

```ts
attach(panel, { quality: { mapSide: 240, caPasses: 1 } })
```

## Choosing a tier deliberately

`auto` picks the best supported path, which is usually right. Reach for an explicit `backend` when:

- you want metaball merging — `webgl-overlay`, or a `<liquid-glass-group>` which selects it
- the glass sits over artwork you own — `webgl-scene`, which never rasterizes the page
- you are on a page whose layout the rasterizer reproduces badly — `css-svg` or `svg-content`
  refract the live backdrop and never take a snapshot

## Costs worth knowing about

**The overlay rasterizes the page.** One shared canvas serves every merged lens, but the texture
behind it is a snapshot of the document, re-taken when the page mutates near a lens. On a page that
mutates constantly it is the most expensive tier by a wide margin. It is the specialty path for
merging, not a default.

**`svg-content` clones the backdrop.** Each lens keeps a positioned copy of its refraction source.
Point `backdrop` at the smallest element that covers the lens rather than a large container, and the
clone shrinks with it. Mutations that land outside the lens and its bevel band are ignored.

**Dispersion triples the displacement work** on the SVG tiers, since each channel gets its own pass.
`caPasses: 1` keeps the refraction and drops the colour split.

**Frost adds a turbulence node** to the filter chain. It is free at `frost: 0`, which is the default
for `clear`.

## The fps watchdog

An auto-selected `webgl-overlay` surface is watched: if the median frame rate stays under 45 for
three consecutive 90-frame windows, every auto-selected overlay lens on the page drops to the CSS
tier once, and `handle.on('degrade')` fires. Explicit `backend` choices are never demoted — if you
asked for a tier, you keep it.

The watchdog only arms for the tier it can actually demote, and releases its frame sampler when the
last lens is destroyed.

## Measuring

```sh
pnpm --filter demo dev      # one shell
pnpm bench                  # another; exits non-zero below 55 fps
```

The benchmark drives ten lenses through five seconds of scrolling. Headed Chromium on an M-series
machine reports ~105 fps; headless on SwiftShader lands near 40, which is a software rasterizer
figure rather than a regression.

The docs landing carries its own profile in `e2e/perf-audit.spec.ts`, which asserts the harness
produced frames and holds an fps floor where the hardware is real.
