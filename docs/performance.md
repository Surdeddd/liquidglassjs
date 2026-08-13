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

If the median frame rate stays under 45 for three consecutive 90-frame windows, the engine reacts in
two ways at once:

- dispersion drops to a single pass page-wide, which is the cheapest large win on the CSS tiers and
  where most of the recovery comes from
- auto-selected `webgl-overlay` lenses re-mount onto the CSS tier

`handle.on('degrade')` fires either way. Explicit `backend` choices are never re-mounted — if you
asked for a tier, you keep it — and the watchdog only arms when at least one surface is on `auto`,
so a page that configures everything by hand is left alone entirely. The frame sampler is released
when the last lens is destroyed.

Roughly 270 slow frames have to pass before it acts, so a page that is briefly busy is not punished
for it. On the bench that is about nine seconds.

## Measuring

```sh
pnpm --filter demo dev      # one shell
pnpm bench                  # another; exits non-zero below 55 fps
```

The benchmark drives ten lenses through continuous scrolling and prints two numbers: the cold rate
over the first five seconds, and the settled rate after the engine has had time to react. On headed
Chromium on an M-series machine that reads roughly:

| | fps |
| --- | --- |
| Ten lenses, dispersion at three passes | 31 |
| Same page after the watchdog drops to one pass | 77 |
| `dispersion: 0` from the start | 54 |
| No glass on the page at all | 118 |

Dispersion is the dominant cost on the CSS tier — it very nearly halves the frame rate on its own.
If you know a page carries many lenses, setting `caPasses: 1` up front is better than waiting for
the watchdog to work it out, and a surface that does not need the colour split can simply run
`dispersion: 0`.

Headless lands far lower on all of these: it renders through SwiftShader, a software rasterizer.

The docs landing carries its own profile in `e2e/perf-audit.spec.ts`, which asserts the harness
produced frames and holds an fps floor where the hardware is real.
