# Performance

What each surface costs, and which knob moves it.

## Where the time goes

| Work | When it runs | Cost driver |
| --- | --- | --- |
| Displacement map | On mount, and when the surface's size, radius, ior, thickness or bevel changes | `mapSide` — `mapSide²` is the texel budget for the surface's area, plus a PNG encode. A floor keeps 8 texels across the bevel band on a long thin bar, and a ceiling holds the result to 3× the budget |
| SVG filter chain | On mount, and when material values change the chain shape | `caPasses` — on `css-svg`, three displacement passes for dispersion instead of one |
| Backdrop clone (`svg-content`) | On mount, and on backdrop mutations near the lens | Size of the cloned subtree |
| Page snapshot (`webgl-overlay`) | Debounced after page mutations, and never while the viewport is moving | Document size, capped at 4096 px on the longest side — not configurable |
| Per-frame draw | Only while something moves | Number of lenses; shader samples per pixel |
| Tone sampling | At most every 250 ms per surface | Ancestor chain length |

The scheduler runs one shared `requestAnimationFrame` loop for the whole page and idles when no
spring is active and nothing is scrolling. A static page with attached glass does no per-frame work,
the fps watchdog included: it measures only while the viewport is moving, in short bursts that a
scroll or a resize starts, and it throws away any gap over 4 seconds rather than reading it as jank.
A quiet page is never mistaken for a slow one because it is never sampled.

## The knobs

```ts
import { configure, deviceTier, getQuality } from '@surdeddd/liquidglass'

deviceTier()   // 'high' | 'mid' | 'low', from cores, memory and dpr
getQuality()   // the profile in force
configure({ mapSide: 420, caPasses: 1, maxDpr: 1.5, snapshotThrottleMs: 400 })
```

| Setting | Default by tier | Applies to | Effect |
| --- | --- | --- | --- |
| `mapSide` | 600 / 480 / 320 | `css-svg`, `svg-content` | Displacement map budget. Halving it quarters the map work |
| `caPasses` | 3 / 3 / 1 | `css-svg` only | `1` drops chromatic dispersion to a single pass |
| `maxDpr` | 2 / 2 / 1.5 | the GL tiers | Caps the device pixel ratio they render at |
| `snapshotThrottleMs` | 250 / 350 / 500 | `webgl-overlay` | Floor between overlay page snapshots |
| `overlayZIndex` | 2147483000 | `webgl-overlay` | Stacking band for the shared overlay canvas. The scroll edge sits at 2147483003 and a morphing element at 2147483002; neither is configurable |

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
merging, not a default. Snapshots are held off while the viewport is moving and resume 180 ms after
it stops, so the rasterization lands in the quiet gap instead of in the middle of a scroll.

**`svg-content` clones the backdrop.** Each lens keeps a positioned copy of its refraction source.
Point `backdrop` at the smallest element that covers the lens rather than a large container, and the
clone shrinks with it. Mutations that land outside the lens and its bevel band are ignored.

**Dispersion triples the displacement work on `css-svg`**, since each channel gets its own pass;
`caPasses: 1` keeps the refraction and drops the colour split. `css-svg` is also the only tier that
reads `caPasses` at all — `svg-content` always builds a single-pass chain and ignores `dispersion`
entirely, and the WebGL tiers do the channel split inside the shader, where `caPasses` has no
effect.

**Frost adds a turbulence node** to the filter chain. It is free at `frost: 0`, which is the default
for `clear`.

## The fps watchdog

Sampling happens in bursts rather than continuously. A scroll or a resize opens one; it runs for at
most 2.25 seconds and then closes itself, so a page nobody touches never produces a sample. Inside a
burst the real frame times are collected into windows: a window closes after 90 frames or 1.5
seconds, whichever comes first, and needs at least 8 samples to count at all.

If three consecutive windows come back with a median under 45 fps, the engine reacts in two ways at
once:

- dispersion drops to a single pass page-wide, which is the cheapest large win on `css-svg` and
  where most of the recovery comes from
- auto-selected `webgl-overlay` lenses re-mount onto the CSS tier

`handle.on('degrade')` fires either way. Explicit `backend` choices are never re-mounted — if you
asked for a tier, you keep it — and the watchdog only arms when at least one surface is on `auto`,
so a page that configures everything by hand is left alone entirely. The frame sampler is released
when the last lens is destroyed.

Below 60 fps a window is closed by the 1.5-second clock rather than by the frame count, so a burst
contributes exactly one window and three separate bursts — roughly seven seconds of unbroken
scrolling — have to go slow before anything happens. A page that stutters once is not punished for
it.

The drop is sticky. The watchdog writes `caPasses: 1` into the same override object your own
`configure()` writes to, and it stays there for the life of the page. `configure({ caPasses: 3 })`
opts back in; `resetQuality()` clears every override, including yours.

## Measuring

```sh
pnpm --filter demo exec vite --port 4173 --strictPort   # one shell
pnpm bench                                              # another; exits non-zero below 55 fps
```

`pnpm bench` opens `http://localhost:4173/bench.html`, which is why the demo has to be served on that
port — plain `vite` serves 5173, and `BENCH_URL` is how you point the bench at it instead. The bench
runs headless unless you invoke the script directly as `node scripts/fps-bench.mjs --headed`, which
is where the table below comes from.

The benchmark drives ten lenses through continuous scrolling and prints two numbers: the cold rate
over the first five seconds, and the settled rate after the engine has had time to react. On headed
Chromium on an M-series machine that reads roughly:

| | fps |
| --- | --- |
| Ten lenses, dispersion at three passes | 34–38 |
| Same page after the watchdog drops to one pass | 92–114 |
| `dispersion: 0` from the start | 54 |
| No glass on the page at all | 118 |

Dispersion is the dominant cost on the CSS tier — it very nearly halves the frame rate on its own.
If you know a page carries many lenses, setting `caPasses: 1` up front is better than waiting for
the watchdog to work it out, and a surface that does not need the colour split can simply run
`dispersion: 0`.

Headless lands far lower on all of these: it renders through SwiftShader, a software rasterizer.

The docs landing carries its own profile in `e2e/perf-audit.spec.ts`, which asserts the harness
produced frames and holds an fps floor where the hardware is real.
