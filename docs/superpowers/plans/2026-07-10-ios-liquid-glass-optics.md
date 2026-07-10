# Real iOS 26 Liquid Glass Optics (P0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ad-hoc edge falloff with a physically-derived squircle-dome lens (Snell, IOR 1.5), add edge-only chromatic aberration and a dynamic two-tone specular bezel on the default SVG backends, so glass surfaces read as real iOS 26 Liquid Glass instead of a blurred card.

**Architecture:** A new pure-math module `optics.ts` computes per-pixel refraction offsets from a convex-squircle height field refracted by Snell's law; `displacement.ts` bakes it into normalized R/G maps (quarter-symmetry, cached) whose intensity is driven via the `feDisplacementMap scale` attribute (never map rebuilds); `css-svg` gains a 3-pass per-channel chain for chromatic aberration; a shared `bezel.ts` renders a light-angle-driven two-tone rim; the GL shader ports the same profile for parity.

**Tech Stack:** TypeScript, SVG filters (`feImage`/`feDisplacementMap`/`feComponentTransfer`/`feTurbulence`), WebGL2 GLSL, vitest, Playwright.

## Global Constraints

- Package names: `@surdeddd/liquidglass-*` (rename already shipped; do not touch names).
- `@surdeddd/liquidglass-core` stays **zero-dependency**; size-limit budget 20 kB brotli (`pnpm size` must pass).
- Node 24, pnpm workspace; verify loop: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.
- New material params must be optional with defaults preserving current visual output *class* (no breaking API changes; presets may be retuned).
- All motion features must respect `prefers-reduced-motion` (existing `engine.ts` gate).
- Commit messages: conventional commits, **no AI/tool attribution trailers** (hard user rule).
- Reference research (context for implementers): Apple lensing = flat interior + rim band bending, band ≤ corner radius, IOR ≈ 1.5, CA edge-only, specular = lit arc + dark counter-sheen opposite, press scale ≈ 1.05. Sources: kube.io/blog/liquid-glass-css-svg, sorrell.info/blog/liquid-glass-lens-effect, WWDC25 session 219.

---

### Task 1: Pure lens optics module

**Files:**
- Create: `packages/core/src/optics.ts`
- Test: `packages/core/test/optics.test.ts`

**Interfaces:**
- Consumes: nothing (pure math).
- Produces: `lensProfile(depth: number, opts: LensOptions): number` (offset in px along outward normal, ≥ 0), `interiorZoomOffset(px: number, py: number, cx: number, cy: number, magnify: number): [number, number]`, `type LensOptions = { band: number; ior: number; thickness: number }`. Task 2 consumes both.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/optics.test.ts
import { describe, expect, it } from 'vitest'
import { lensProfile, interiorZoomOffset } from '../src/optics'

const opts = { band: 20, ior: 1.5, thickness: 12 }

describe('lensProfile', () => {
  it('is zero in the flat interior (depth >= band)', () => {
    expect(lensProfile(20, opts)).toBe(0)
    expect(lensProfile(35, opts)).toBe(0)
  })

  it('is zero outside the shape (negative depth)', () => {
    expect(lensProfile(-1, opts)).toBe(0)
  })

  it('increases monotonically toward the edge inside the band', () => {
    const inner = lensProfile(18, opts)
    const mid = lensProfile(10, opts)
    const outer = lensProfile(2, opts)
    expect(outer).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(inner)
  })

  it('caps the offset so the rim never folds (offset <= band * 0.9)', () => {
    expect(lensProfile(0.01, { band: 20, ior: 1.9, thickness: 100 })).toBeLessThanOrEqual(18)
  })

  it('ior = 1 refracts nothing', () => {
    expect(lensProfile(5, { ...opts, ior: 1 })).toBeCloseTo(0, 6)
  })

  it('higher ior bends more', () => {
    expect(lensProfile(5, { ...opts, ior: 1.8 })).toBeGreaterThan(lensProfile(5, { ...opts, ior: 1.2 }))
  })

  it('thicker glass bends more', () => {
    expect(lensProfile(5, { ...opts, thickness: 24 })).toBeGreaterThan(lensProfile(5, opts))
  })
})

describe('interiorZoomOffset', () => {
  it('pulls samples toward the element center (magnification)', () => {
    const [dx, dy] = interiorZoomOffset(150, 40, 100, 50, 0.02)
    expect(dx).toBeCloseTo(-1, 5) // (150-100) * -0.02
    expect(dy).toBeCloseTo(0.2, 5) // (40-50) * -0.02
  })

  it('is zero at the center and with magnify 0', () => {
    expect(interiorZoomOffset(100, 50, 100, 50, 0.05)).toEqual([0, 0])
    expect(interiorZoomOffset(10, 10, 100, 50, 0)).toEqual([0, 0])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- optics`
Expected: FAIL — `Cannot find module '../src/optics'`.

- [ ] **Step 3: Implement the module**

```ts
// packages/core/src/optics.ts
/** Convex-squircle lens refraction (Snell), matching iOS 26 Liquid Glass:
 *  optically flat interior, all bending concentrated in an edge band. */

export interface LensOptions {
  /** rim band width in px where bending happens */
  band: number
  /** index of refraction (glass ≈ 1.5) */
  ior: number
  /** simulated glass thickness in px — scales dome height and ray travel */
  thickness: number
}

const FOLD_CAP = 0.9 // max offset as fraction of band — rim compresses, never folds

/** Offset magnitude (px, along outward normal) for a pixel `depth` px inside the edge. */
export function lensProfile(depth: number, { band, ior, thickness }: LensOptions): number {
  if (depth < 0 || depth >= band || band <= 0 || ior <= 1) return 0
  const t = depth / band // 0 at edge → 1 at interior boundary
  const u = 1 - t
  // squircle dome h(t) = thickness * (1 - u^4)^(1/4): steep at edge, flat toward center
  // slope dh/d(depth) = thickness * u^3 * (1 - u^4)^(-3/4) / band  (clamped near the vertical edge wall)
  const slope = (thickness / band) * u * u * u * Math.pow(Math.max(1 - u * u * u * u, 1e-4), -0.75)
  const alpha = Math.atan(slope) // surface tilt
  const beta = Math.asin(Math.min(1, Math.sin(alpha) / ior)) // Snell: n1 sin a = n2 sin b
  const offset = thickness * Math.tan(alpha - beta)
  return Math.min(offset, band * FOLD_CAP)
}

/** Mild whole-body magnification: sample toward center by `magnify` per px of radius. */
export function interiorZoomOffset(
  px: number,
  py: number,
  cx: number,
  cy: number,
  magnify: number,
): [number, number] {
  if (magnify === 0) return [0, 0]
  return [(px - cx) * -magnify, (py - cy) * -magnify]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- optics`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/optics.ts packages/core/test/optics.test.ts
git commit -m "feat(core): squircle-dome Snell lens profile with fold cap and interior zoom"
```

---

### Task 2: Rebuild the displacement map generator on the new optics

**Files:**
- Modify: `packages/core/src/displacement.ts` (replace `displacementAt` + `generateDisplacementMap`)
- Test: `packages/core/test/displacement.test.ts` (extend)

**Interfaces:**
- Consumes: `lensProfile`, `interiorZoomOffset` from Task 1.
- Produces: `generateDisplacementMap(opts: MapOptions): { url: string; maxOffset: number }` where `MapOptions = { width: number; height: number; radius: number; shape: 'rounded' | 'squircle'; band: number; ior: number; thickness: number; magnify: number }`. **Breaking internal change:** the map is normalized so the strongest pixel = full channel deflection; callers must set `feDisplacementMap.scale = 2 * maxOffset * gain`. Tasks 3–5 rely on `maxOffset`. Keep existing exports `surfaceSdf`, `sdfSuperellipse`, `squircleClipPath` unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `packages/core/test/displacement.test.ts` (keep existing SDF tests; delete tests asserting the old `displacementAt` profile):

```ts
import { generateDisplacementMap } from '../src/displacement'

const base = { width: 200, height: 100, radius: 24, shape: 'rounded' as const, band: 24, ior: 1.5, thickness: 12, magnify: 0.015 }

describe('generateDisplacementMap (lens model)', () => {
  it('returns a data url and a positive max offset', () => {
    const { url, maxOffset } = generateDisplacementMap(base)
    expect(url).toMatch(/^data:image\/png/)
    expect(maxOffset).toBeGreaterThan(0)
  })

  it('center pixel is neutral apart from interior zoom', () => {
    const { pixelAt } = debugMap(base)
    const [r, g] = pixelAt(100, 50)
    expect(Math.abs(r - 128)).toBeLessThanOrEqual(1)
    expect(Math.abs(g - 128)).toBeLessThanOrEqual(1)
  })

  it('rim pixels deflect harder than mid-band pixels', () => {
    const { pixelAt } = debugMap({ ...base, magnify: 0 })
    const rim = Math.abs(pixelAt(2, 50)[0] - 128)
    const mid = Math.abs(pixelAt(12, 50)[0] - 128)
    expect(rim).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(0)
  })

  it('is symmetric across both axes (quarter-symmetry correctness)', () => {
    const { pixelAt } = debugMap({ ...base, magnify: 0 })
    const [rl, gl] = pixelAt(5, 50)
    const [rr, gr] = pixelAt(194, 50)
    expect(rl - 128).toBeCloseTo(-(rr - 128), 0) // x-mirrored → opposite x deflection
    expect(gl).toBeCloseTo(gr, 0)
  })

  it('caches identical option sets', () => {
    const a = generateDisplacementMap(base)
    const b = generateDisplacementMap({ ...base })
    expect(b.url).toBe(a.url)
  })
})
```

`debugMap` helper (add in the test file): render via the exported internal `computeOffsets(opts)` (see Step 3) instead of decoding the PNG:

```ts
import { computeOffsets } from '../src/displacement'

function debugMap(opts: typeof base) {
  const { data, width, maxOffset } = computeOffsets(opts)
  return {
    pixelAt(x: number, y: number): [number, number] {
      const i = (y * width + x) * 2
      const enc = (v: number) => Math.round(128 + (v / (maxOffset || 1)) * 127)
      return [enc(data[i]), enc(data[i + 1])]
    },
  }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- displacement`
Expected: FAIL — `computeOffsets` not exported / new signature missing.

- [ ] **Step 3: Implement the generator**

Replace the old `displacementAt` and `generateDisplacementMap` in `packages/core/src/displacement.ts`:

```ts
import { lensProfile, interiorZoomOffset } from './optics'

export interface MapOptions {
  width: number
  height: number
  radius: number
  shape: 'rounded' | 'squircle'
  band: number
  ior: number
  thickness: number
  magnify: number
}

const MAX_MAP_SIDE = 600
const cache = new Map<string, { url: string; maxOffset: number }>()
const CACHE_MAX = 32

/** Raw float offsets for one full map (quarter computed, mirrored). Exported for tests. */
export function computeOffsets(opts: MapOptions): { data: Float32Array; width: number; height: number; maxOffset: number } {
  const scale = Math.min(1, MAX_MAP_SIDE / Math.max(opts.width, opts.height))
  const w = Math.max(2, Math.round(opts.width * scale))
  const h = Math.max(2, Math.round(opts.height * scale))
  const r = opts.radius * scale
  const band = opts.band * scale
  const thickness = opts.thickness * scale
  const cx = w / 2
  const cy = h / 2
  const data = new Float32Array(w * h * 2)
  let maxOffset = 0

  const halfW = Math.ceil(w / 2)
  const halfH = Math.ceil(h / 2)
  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < halfW; x++) {
      const d = surfaceSdf(x + 0.5, y + 0.5, w, h, r, opts.shape)
      const depth = -d
      let dx = 0
      let dy = 0
      if (depth >= 0 && depth < band) {
        const mag = lensProfile(depth, { band, ior: opts.ior, thickness })
        // outward normal from SDF gradient (finite differences)
        const gx = surfaceSdf(x + 1.5, y + 0.5, w, h, r, opts.shape) - d
        const gy = surfaceSdf(x + 0.5, y + 1.5, w, h, r, opts.shape) - d
        const len = Math.hypot(gx, gy) || 1
        dx = (gx / len) * mag
        dy = (gy / len) * mag
      }
      if (depth >= 0) {
        const [zx, zy] = interiorZoomOffset(x + 0.5, y + 0.5, cx, cy, opts.magnify * scale)
        dx += zx
        dy += zy
      }
      const m = Math.max(Math.abs(dx), Math.abs(dy))
      if (m > maxOffset) maxOffset = m
      // write the pixel and its three mirrors with sign-flipped components
      writePx(data, w, x, y, dx, dy)
      writePx(data, w, w - 1 - x, y, -dx, dy)
      writePx(data, w, x, h - 1 - y, dx, -dy)
      writePx(data, w, w - 1 - x, h - 1 - y, -dx, -dy)
    }
  }
  return { data, width: w, height: h, maxOffset }
}

function writePx(data: Float32Array, w: number, x: number, y: number, dx: number, dy: number): void {
  const i = (y * w + x) * 2
  data[i] = dx
  data[i + 1] = dy
}

export function generateDisplacementMap(opts: MapOptions): { url: string; maxOffset: number } {
  const key = JSON.stringify(opts)
  const hit = cache.get(key)
  if (hit) return hit
  const { data, width, height, maxOffset } = computeOffsets(opts)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(width, height)
  const norm = maxOffset || 1
  for (let p = 0, i = 0; p < data.length; p += 2, i += 4) {
    img.data[i] = Math.round(128 + (data[p] / norm) * 127) // R = X
    img.data[i + 1] = Math.round(128 + (data[p + 1] / norm) * 127) // G = Y
    img.data[i + 2] = 128 // B reserved (specular lives in the CSS bezel layer, Task 6)
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const entry = { url: canvas.toDataURL('image/png'), maxOffset: maxOffset / (opts.width > opts.height ? opts.width / (canvas.width || 1) : opts.height / (canvas.height || 1)) * (Math.max(opts.width, opts.height) / Math.max(canvas.width, canvas.height)), }
  // ^ maxOffset is computed in map-space px; convert back to element px by the inverse downscale:
  entry.maxOffset = maxOffset * (Math.max(opts.width, opts.height) / Math.max(width, height))
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
  cache.set(key, entry)
  return entry
}
```

Note for the implementer: keep the existing `surfaceSdf` / `sdfSuperellipse` / `squircleClipPath` functions untouched above this code; delete the old `displacementAt`. The dead `entry` first assignment above is a bug if left — write it exactly as: compute `const elementScale = Math.max(opts.width, opts.height) / Math.max(width, height)` and `const entry = { url: canvas.toDataURL('image/png'), maxOffset: maxOffset * elementScale }`.

- [ ] **Step 4: Run tests, fix, run full core suite**

Run: `pnpm --filter @surdeddd/liquidglass-core test`
Expected: PASS (all core tests including old SDF tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/displacement.ts packages/core/test/displacement.test.ts
git commit -m "feat(core): normalized quarter-symmetry displacement maps from the Snell lens profile"
```

---

### Task 3: css-svg — scale-driven intensity, wide filter region, brightness, frost

**Files:**
- Modify: `packages/core/src/backends/css-svg.ts`
- Modify: `packages/core/src/material.ts` (new params + defaults)
- Modify: `packages/core/src/types.ts` (MaterialParams)
- Test: `packages/core/test/css-svg.test.ts`

**Interfaces:**
- Consumes: `generateDisplacementMap` → `{ url, maxOffset }` (Task 2).
- Produces: material params `ior: number` (default 1.5, clamp [1, 2.5]), `magnify: number` (default 0.015, clamp [0, 0.1]), `bevelWidth: number | 'auto'` (default `'auto'` → `min(cornerRadiusPx, minSide / 2)`). Filter node ids: displacement node keeps `data-lg-role="displace"`; blur node `data-lg-role="blur"`. Task 4 splits the displace node into three; Task 5 mirrors this file.

- [ ] **Step 1: Write the failing tests**

Add to `packages/core/test/css-svg.test.ts`:

```ts
it('drives intensity via scale = 2 * maxOffset * refraction * 2', async () => {
  const handle = attach(host, { backend: 'css-svg', refraction: 0.5, ior: 1.5 })
  await raf()
  const disp = svgFilter().querySelector('[data-lg-role="displace"]')!
  const scale = Number(disp.getAttribute('scale'))
  expect(scale).toBeGreaterThan(0) // 2 * maxOffset * 1.0
})

it('widens the filter region to 140%', async () => {
  attach(host, { backend: 'css-svg' })
  await raf()
  const filter = svgFilter()
  expect(filter.getAttribute('x')).toBe('-20%')
  expect(filter.getAttribute('width')).toBe('140%')
})

it('wires brightness through feComponentTransfer', async () => {
  attach(host, { backend: 'css-svg', brightness: 1.1 })
  await raf()
  const funcs = svgFilter().querySelectorAll('feComponentTransfer feFuncR, feComponentTransfer feFuncG, feComponentTransfer feFuncB')
  expect(funcs.length).toBe(3)
  expect(funcs[0].getAttribute('slope')).toBe('1.1')
})

it('adds fine turbulence micro-scatter when frost > 0', async () => {
  attach(host, { backend: 'css-svg', frost: 0.4 })
  await raf()
  expect(svgFilter().querySelector('feTurbulence')).not.toBeNull()
})

it('auto bevelWidth resolves to min(corner radius, half min side)', async () => {
  host.style.borderRadius = '18px'
  const handle = attach(host, { backend: 'css-svg' })
  await raf()
  expect(handle.debug().band).toBe(18)
})
```

(Use the file's existing `attach/raf/svgFilter` helpers; add a `debug()` accessor on the handle returning `{ band }` — small addition to the backend's returned surface for tests.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- css-svg`
Expected: FAIL on all five.

- [ ] **Step 3: Implement**

In `packages/core/src/types.ts` add to `MaterialParams`:

```ts
/** index of refraction, glass ≈ 1.5 */
ior?: number
/** whole-body magnification 0..0.1 */
magnify?: number
```

and change `bevelWidth?: number` → `bevelWidth?: number | 'auto'`.

In `packages/core/src/material.ts`: defaults `ior: 1.5`, `magnify: 0.015`, `bevelWidth: 'auto'`; clamps `ior [1, 2.5]`, `magnify [0, 0.1]`; `bevelWidth` clamps only when numeric.

In `packages/core/src/backends/css-svg.ts`:

1. Filter region: `x="-20%" y="-20%" width="140%" height="140%"` (replace the current 0/100% attrs).
2. Resolve the band:

```ts
const radiusPx = resolveRadiusPx(host) // existing radius logic; capsule = minSide / 2
const band = material.bevelWidth === 'auto'
  ? Math.min(radiusPx, Math.min(w, h) / 2)
  : material.bevelWidth
```

3. Map + scale:

```ts
const { url, maxOffset } = generateDisplacementMap({
  width: w, height: h, radius: radiusPx, shape: material.shape,
  band, ior: material.ior, thickness: material.thickness, magnify: material.magnify,
})
feImage.setAttribute('href', url)
displace.setAttribute('scale', String(2 * maxOffset * material.refraction * 2))
displace.setAttribute('data-lg-role', 'displace')
```

4. Chain order after displacement: `feTurbulence` micro-scatter (only when `frost > 0`) → `feGaussianBlur` (`data-lg-role="blur"`) → `feColorMatrix saturate` → `feComponentTransfer` brightness:

```ts
if (material.frost > 0) {
  // fine roughness: tiny second displacement by noise
  turb.setAttribute('type', 'fractalNoise')
  turb.setAttribute('baseFrequency', '0.9')
  turb.setAttribute('numOctaves', '2')
  turb.setAttribute('result', 'lgNoise')
  frostDisplace.setAttribute('in2', 'lgNoise')
  frostDisplace.setAttribute('scale', String(material.frost * 6))
}
const [fr, fg, fb] = ['feFuncR', 'feFuncG', 'feFuncB'].map((n) => doc.createElementNS(SVG_NS, n))
for (const f of [fr, fg, fb]) {
  f.setAttribute('type', 'linear')
  f.setAttribute('slope', String(material.brightness))
  componentTransfer.appendChild(f)
}
```

5. Return `debug: () => ({ band })` on the backend surface.
6. On `set()` updates that only change `refraction`, update the `scale` attribute without regenerating the map (the cache makes this free anyway, but skip `feImage` writes when url is unchanged).

- [ ] **Step 4: Run tests + full verify**

Run: `pnpm --filter @surdeddd/liquidglass-core test && pnpm build && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "feat(core): css-svg lens pipeline — auto band, scale-driven intensity, brightness and frost"
```

---

### Task 4: css-svg — edge-only chromatic aberration (3-pass channel split)

**Files:**
- Modify: `packages/core/src/backends/css-svg.ts`
- Test: `packages/core/test/css-svg.test.ts`

**Interfaces:**
- Consumes: chain from Task 3 (`data-lg-role="displace"` node, map url, `maxOffset`).
- Produces: when `dispersion > 0`, three `feDisplacementMap` nodes (`data-lg-role="displace-r|displace|displace-b"`) recombined additively; when `dispersion === 0`, single node (Task 3 chain unchanged). caShift formula: `caShift = dispersion * 0.25`.

- [ ] **Step 1: Write the failing tests**

```ts
it('splits into three displacement passes when dispersion > 0', async () => {
  attach(host, { backend: 'css-svg', dispersion: 0.3 })
  await raf()
  const f = svgFilter()
  expect(f.querySelectorAll('feDisplacementMap').length).toBe(3)
  const r = f.querySelector('[data-lg-role="displace-r"]')!
  const g = f.querySelector('[data-lg-role="displace"]')!
  const b = f.querySelector('[data-lg-role="displace-b"]')!
  expect(Number(r.getAttribute('scale'))).toBeLessThan(Number(g.getAttribute('scale')))
  expect(Number(b.getAttribute('scale'))).toBeGreaterThan(Number(g.getAttribute('scale')))
})

it('keeps a single pass when dispersion is 0', async () => {
  attach(host, { backend: 'css-svg', dispersion: 0 })
  await raf()
  expect(svgFilter().querySelectorAll('feDisplacementMap').length).toBe(1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- css-svg`
Expected: FAIL — only one feDisplacementMap.

- [ ] **Step 3: Implement**

In the filter build of `css-svg.ts`, when `material.dispersion > 0.001` build this chain (all nodes created with `doc.createElementNS(SVG_NS, ...)`):

```ts
const S = 2 * maxOffset * material.refraction * 2
const ca = material.dispersion * 0.25
// R pass: bends slightly less (sampled inward)
mkDisplace('displace-r', S * (1 - ca), 'lgDispR')
mkChannel('lgDispR', 'lgR', [1, 0, 0]) // feColorMatrix keeping R only
// G pass: reference
mkDisplace('displace', S, 'lgDispG')
mkChannel('lgDispG', 'lgG', [0, 1, 0])
// B pass: bends slightly more (sampled outward)
mkDisplace('displace-b', S * (1 + ca), 'lgDispB')
mkChannel('lgDispB', 'lgB', [0, 0, 1])
// additive recombine: (R + G) + B
mkComposite('lgR', 'lgG', 'lgRG') // feComposite operator="arithmetic" k2="1" k3="1"
mkComposite('lgRG', 'lgB', 'lgLens')
// downstream chain (frost/blur/saturate/brightness) takes in="lgLens"
```

Helpers inside the module:

```ts
function mkChannel(inResult: string, out: string, rgb: [number, number, number]): SVGFEColorMatrixElement {
  const m = doc.createElementNS(SVG_NS, 'feColorMatrix') as SVGFEColorMatrixElement
  m.setAttribute('in', inResult)
  m.setAttribute('type', 'matrix')
  const [r, g, b] = rgb
  m.setAttribute('values', `${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`)
  m.setAttribute('result', out)
  filter.appendChild(m)
  return m
}

function mkComposite(a: string, b: string, out: string): void {
  const c = doc.createElementNS(SVG_NS, 'feComposite')
  c.setAttribute('in', a)
  c.setAttribute('in2', b)
  c.setAttribute('operator', 'arithmetic')
  c.setAttribute('k1', '0'); c.setAttribute('k2', '1'); c.setAttribute('k3', '1'); c.setAttribute('k4', '0')
  c.setAttribute('result', out)
  filter.appendChild(c)
}
```

`set({ dispersion })` crossing zero rebuilds the filter (build is cheap; map is cached).

- [ ] **Step 4: Run tests + verify**

Run: `pnpm --filter @surdeddd/liquidglass-core test && pnpm build && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/backends/css-svg.ts packages/core/test/css-svg.test.ts
git commit -m "feat(core): edge-only chromatic aberration via 3-pass channel-split displacement"
```

---

### Task 5: svg-content parity (Safari/Firefox)

**Files:**
- Modify: `packages/core/src/backends/svg-content.ts`
- Test: `packages/core/test/svg-content.test.ts`

**Interfaces:**
- Consumes: `generateDisplacementMap` (Task 2), same band resolution as Task 3.
- Produces: identical single-pass chain (displace → optional frost turbulence → blur → saturate → brightness). **No CA here** — WebKit runs SVG filters in software; one pass is the honest tier. Same `debug().band` accessor.

- [ ] **Step 1: Write the failing tests**

Mirror Task 3's assertions in `packages/core/test/svg-content.test.ts` (scale > 0 from maxOffset, feComponentTransfer brightness ×3, feTurbulence when frost > 0, auto band = borderRadius, and `expect(f.querySelectorAll('feDisplacementMap').length).toBe(1)` even with `dispersion: 0.5`).

```ts
it('stays single-pass regardless of dispersion (software filter tier)', async () => {
  attach(host, { backend: 'svg-content', dispersion: 0.5 })
  await raf()
  expect(svgFilter().querySelectorAll('feDisplacementMap').length).toBe(1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- svg-content`
Expected: FAIL.

- [ ] **Step 3: Implement**

Port the Task 3 changes into `svg-content.ts` (band resolution, `{ url, maxOffset }`, `scale = 2 * maxOffset * refraction * 2`, brightness feComponentTransfer, frost feTurbulence). Extract the shared chain-builder into `packages/core/src/backends/filter-chain.ts` and call it from both backends — do not copy-paste (DRY):

```ts
// packages/core/src/backends/filter-chain.ts
export interface ChainSpec {
  doc: Document
  filter: SVGFilterElement
  mapUrl: string
  maxOffset: number
  material: ResolvedMaterial
  passes: 1 | 3 // css-svg passes 3 when dispersion > 0; svg-content always 1
}
export function buildLensChain(spec: ChainSpec): void { /* the Task 3+4 chain, parameterized by passes */ }
```

- [ ] **Step 4: Run the full suite + ssr smoke**

Run: `pnpm --filter @surdeddd/liquidglass-core test && pnpm build && pnpm ssr`
Expected: PASS (ssr-smoke guards DOM-API misuse at module scope).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src
git commit -m "feat(core): svg-content lens parity via shared filter-chain builder"
```

---

### Task 6: Two-tone dynamic specular bezel + light-angle driver

**Files:**
- Create: `packages/core/src/bezel.ts`
- Modify: `packages/core/src/backends/css-svg.ts`, `packages/core/src/backends/svg-content.ts` (replace static box-shadow specular)
- Modify: `packages/core/src/engine.ts` (light driver lifecycle)
- Modify: `packages/core/src/types.ts` (`motionLight?: boolean` attach option)
- Test: `packages/core/test/bezel.test.ts`

**Interfaces:**
- Consumes: host element, `material.specular` (0..1).
- Produces: `mountBezel(host: HTMLElement, specular: number): { update(angleDeg: number): void; destroy(): void }` — appends an aria-hidden overlay div `.lg-bezel` (absolute inset 0, `border-radius: inherit`, `pointer-events: none`) whose two-tone rim rotates via CSS var `--lg-light-angle`; `startLightDriver(opts): { destroy(): void }` in engine — pointer-driven by default, `deviceorientation` when `motionLight: true` (permission responsibility documented as the app's), inert under reduced-motion.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/bezel.test.ts
import { describe, expect, it } from 'vitest'
import { mountBezel } from '../src/bezel'

describe('mountBezel', () => {
  it('mounts an aria-hidden overlay with rotatable two-tone rim', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const bezel = mountBezel(host, 0.6)
    const el = host.querySelector('.lg-bezel') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.background).toContain('conic-gradient')
    bezel.update(135)
    expect(host.style.getPropertyValue('--lg-light-angle')).toBe('135deg')
    bezel.destroy()
    expect(host.querySelector('.lg-bezel')).toBeNull()
  })

  it('scales highlight strength with the specular param', () => {
    const host = document.createElement('div')
    const strong = mountBezel(host, 1)
    const alpha = (host.querySelector('.lg-bezel') as HTMLElement).style.background
    strong.destroy()
    const weak = mountBezel(host, 0.2)
    const alphaWeak = (host.querySelector('.lg-bezel') as HTMLElement).style.background
    weak.destroy()
    expect(alpha).not.toBe(alphaWeak)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- bezel`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// packages/core/src/bezel.ts
/** Two-tone specular rim: bright sheen toward the light, dark counter-sheen opposite.
 *  Rotation is a CSS var so light movement never rebuilds anything. */
export function mountBezel(host: HTMLElement, specular: number): { update(angleDeg: number): void; destroy(): void } {
  const el = host.ownerDocument.createElement('div')
  el.className = 'lg-bezel'
  el.setAttribute('aria-hidden', 'true')
  const hi = 0.55 * specular
  const lo = 0.3 * specular
  const dark = 0.25 * specular
  el.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;'
  el.style.background =
    `conic-gradient(from calc(var(--lg-light-angle, 135deg) - 90deg),` +
    ` rgba(255,255,255,${hi}) 0deg, rgba(255,255,255,${lo * 0.4}) 70deg, rgba(0,0,0,${dark * 0.5}) 150deg,` +
    ` rgba(0,0,0,${dark}) 180deg, rgba(0,0,0,${dark * 0.5}) 210deg, rgba(255,255,255,${lo * 0.4}) 290deg,` +
    ` rgba(255,255,255,${hi}) 360deg)`
  // show only a ~1.5px ring of that gradient
  el.style.padding = '1.5px'
  ;(el.style as CSSStyleDeclaration & { webkitMask?: string }).webkitMask =
    'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)'
  el.style.mask = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)'
  el.style.maskComposite = 'exclude'
  ;(el.style as CSSStyleDeclaration & { webkitMaskComposite?: string }).webkitMaskComposite = 'xor'
  host.appendChild(el)
  return {
    update(angleDeg: number) {
      host.style.setProperty('--lg-light-angle', `${angleDeg}deg`)
    },
    destroy() {
      el.remove()
    },
  }
}
```

In `engine.ts`: one shared driver per document — `pointermove` (rAF-throttled) computes per-instance angle `atan2(pointerY - centerY, pointerX - centerX)` and calls each instance's `bezel.update`; when `motionLight` and `DeviceOrientationEvent` exists, listen and map `gamma/beta` → angle; skip entirely under `prefersReducedMotion` (reuse the existing gate at `engine.ts:46`). Replace the old static inset box-shadow specular in both backends with `mountBezel` (keep a faint `inset 0 1px 0 rgba(255,255,255, specular*0.25)` as the resting base so screenshots aren't dead).

- [ ] **Step 4: Run tests + full verify**

Run: `pnpm --filter @surdeddd/liquidglass-core test && pnpm build && pnpm typecheck && pnpm lint && pnpm ssr`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src packages/core/test/bezel.test.ts
git commit -m "feat(core): two-tone specular bezel driven by pointer/device-motion light angle"
```

---

### Task 7: WebGL shader parity

**Files:**
- Modify: `packages/core/src/gl/renderer.ts`
- Test: `packages/core/test/renderer-shader.test.ts` (create)

**Interfaces:**
- Consumes: same material params (`ior`, `magnify`).
- Produces: uniforms `u_ior` (float), `u_magnify` (float), `u_lightDir` (vec2, unit); GLSL `lensMag(depth, band, ior, thickness)` replacing the `pow(1-t, ...)` profile; specular term uses `u_lightDir` instead of the hardcoded top light; dark counter-sheen on the opposite rim.

- [ ] **Step 1: Write the failing tests**

Shader-string assertions (no GL context needed — mirrors the repo's existing style of testing what can't run headless):

```ts
// packages/core/test/renderer-shader.test.ts
import { describe, expect, it } from 'vitest'
import { FRAGMENT_SRC } from '../src/gl/renderer'

describe('gl lens shader', () => {
  it('models Snell refraction with an ior uniform', () => {
    expect(FRAGMENT_SRC).toContain('u_ior')
    expect(FRAGMENT_SRC).toContain('asin(')
    expect(FRAGMENT_SRC).not.toContain('1.0 + u_bevelDepth * 2.0') // old ad-hoc profile gone
  })
  it('lights the rim from a movable direction with a counter-sheen', () => {
    expect(FRAGMENT_SRC).toContain('u_lightDir')
    expect(FRAGMENT_SRC).toContain('counterSheen')
  })
  it('supports interior magnification', () => {
    expect(FRAGMENT_SRC).toContain('u_magnify')
  })
})
```

(Export the fragment source string as `FRAGMENT_SRC` from `renderer.ts` — it is already a module-level template literal; add `export`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- renderer-shader`
Expected: FAIL.

- [ ] **Step 3: Implement**

In the fragment shader inside `renderer.ts`:

```glsl
uniform float u_ior;      // 1.0 .. 2.5
uniform float u_magnify;  // 0 .. 0.1
uniform vec2 u_lightDir;  // unit vector, from engine light driver (default normalize(vec2(0.6,-0.8)))

float lensMag(float depth, float band, float ior, float thickness) {
  if (depth < 0.0 || depth >= band || ior <= 1.0) return 0.0;
  float t = depth / band;
  float u = 1.0 - t;
  float slope = (thickness / band) * u * u * u * pow(max(1.0 - u * u * u * u, 1e-4), -0.75);
  float alpha = atan(slope);
  float beta = asin(clamp(sin(alpha) / ior, -1.0, 1.0));
  return min(thickness * tan(alpha - beta), band * 0.9);
}
```

Replace the old magnitude computation (`renderer.ts:132-133`) with:

```glsl
float mag = lensMag(depth, u_bevelWidth, u_ior, u_thickness) * u_refractionGain;
vec2 zoom = (v_pos - u_center) * -u_magnify;
vec2 sampleOffset = grad * mag + zoom;
```

(`u_refractionGain = refraction * 2.0`, uploaded where `u_displace` was; add `u_thickness`, `u_center` uniforms; keep dispersion's RGB split exactly as is, now around the new `sampleOffset`.)

Specular (replace `renderer.ts:154-155`):

```glsl
float rim = smoothstep(3.0, 0.0, depth);
float facing = clamp(dot(normalize(grad), u_lightDir), -1.0, 1.0);
float sheen = pow(max(facing, 0.0), 2.0);
float counterSheen = pow(max(-facing, 0.0), 2.0);
col.rgb += rim * sheen * u_specular * 0.6;
col.rgb -= rim * counterSheen * u_specular * 0.25;
```

Upload `u_lightDir` from the engine light driver (same source as Task 6; default when no pointer yet: `vec2(0.6, -0.8)` normalized). `u_bevelDepth` becomes unused — remove the uniform and its upload.

- [ ] **Step 4: Run tests + build + fps sanity**

Run: `pnpm --filter @surdeddd/liquidglass-core test && pnpm build && node scripts/fps-bench.mjs 2>/dev/null || true`
Expected: unit PASS, build PASS; bench is best-effort locally (headless SwiftShader) — CI e2e covers GL correctness.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/gl/renderer.ts packages/core/test/renderer-shader.test.ts
git commit -m "feat(core): gl shader parity — Snell lens profile, movable light, counter-sheen, interior zoom"
```

---

### Task 8: API plumbing, presets, docs

**Files:**
- Modify: `packages/element/src/index.ts` (attributes `ior`, `magnify`, `motion-light`)
- Modify: `packages/react/src/index.ts`, `packages/vue/src/index.ts`, `packages/svelte/src/index.ts` (props passthrough — each adapter already forwards the options object; add the new keys to their option-picking lists/types only where explicit)
- Modify: `packages/core/src/material.ts` (preset retune)
- Modify: `README.md` (params table + example)
- Test: `packages/element/test/element.test.ts` (attribute reflection), `packages/core/test/material.test.ts`

**Interfaces:**
- Consumes: params from Tasks 3–7.
- Produces: presets tuned to Apple parity — `clear: { blur 2, tintOpacity 0.06, frost 0, refraction 0.65, ior 1.5, magnify 0.02 }`, `frosted: { blur 10, tintOpacity 0.14, frost 0.35, refraction 0.45, saturation 1.6, brightness 1.05 }`, `tinted: { blur 8, tint '#7c5cff', tintOpacity 0.28, refraction 0.5 }`. A changeset for the minor release.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/material.test.ts — extend
it('presets carry the lens params', () => {
  const m = resolveMaterial({ preset: 'clear' })
  expect(m.ior).toBe(1.5)
  expect(m.magnify).toBeCloseTo(0.02)
})
```

```ts
// packages/element/test/element.test.ts — extend
it('reflects ior / magnify / motion-light attributes', async () => {
  const el = document.createElement('liquid-glass') as LiquidGlassElement
  el.setAttribute('ior', '1.8')
  el.setAttribute('magnify', '0.03')
  el.setAttribute('motion-light', '')
  document.body.appendChild(el)
  await customElements.whenDefined('liquid-glass')
  expect(el.glass!.material.ior).toBe(1.8)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @surdeddd/liquidglass-core test -- material && pnpm --filter @surdeddd/liquidglass-element test`
Expected: FAIL.

- [ ] **Step 3: Implement**

Element: add `'ior', 'magnify', 'motion-light'` to `observedAttributes` and the attribute→option parse map (numbers via `Number`, boolean presence for `motion-light`). Adapters: add `ior?: number; magnify?: number; motionLight?: boolean` to the exported option types (react/vue/svelte forward whole objects — types only). Presets per the Interfaces block. README: add `ior`, `magnify`, `motionLight` rows to the params section and change the Quick start to `attach(el, { preset: 'clear', ior: 1.5, dispersion: 0.3 })`. Add changeset:

```bash
pnpm changeset # minor: @surdeddd/liquidglass-core + adapters — "real lens optics: Snell squircle dome, edge CA, dynamic bezel"
```

- [ ] **Step 4: Full verify**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm size && pnpm ssr`
Expected: all PASS; size within 20 kB budget.

- [ ] **Step 5: Commit**

```bash
git add packages README.md .changeset
git commit -m "feat: expose ior/magnify/motionLight across adapters, retune presets to iOS parity"
```

---

### Task 9: Visual regression harness (locks the realism in)

**Files:**
- Create: `e2e/visual.spec.ts`
- Modify: `playwright.config.ts` (`expect.toHaveScreenshot` thresholds)
- Create: baselines via `--update-snapshots` (committed)

**Interfaces:**
- Consumes: demo harness page (`apps/demo`) served by the existing playwright webServer config.
- Produces: screenshot crops asserted per browser: rim band over the stripes backdrop (bent stripes + CA fringe), center flatness, bezel ring. CI fails on visual drift > 2%.

- [ ] **Step 1: Write the spec**

```ts
// e2e/visual.spec.ts
import { expect, test } from '@playwright/test'

test.describe('lens optics visual regression', () => {
  test('rim bends stripes, interior stays flat', async ({ page }) => {
    await page.goto('/')
    const panel = page.locator('.panel-clear') // clear-preset panel over .stripes
    await panel.waitFor()
    await page.waitForTimeout(400) // map + fonts settle
    const box = (await panel.boundingBox())!
    // left rim crop: displacement must bend the stripes
    await expect(page).toHaveScreenshot('rim-left.png', {
      clip: { x: box.x - 8, y: box.y + box.height / 2 - 24, width: 48, height: 48 },
      maxDiffPixelRatio: 0.02,
    })
    // center crop: optically flat (stripes pass through undistorted apart from blur/zoom)
    await expect(page).toHaveScreenshot('center.png', {
      clip: { x: box.x + box.width / 2 - 24, y: box.y + box.height / 2 - 24, width: 48, height: 48 },
      maxDiffPixelRatio: 0.02,
    })
  })
})
```

- [ ] **Step 2: Generate baselines**

Run: `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots`
Expected: baselines written under `e2e/visual.spec.ts-snapshots/` for chromium/webkit/firefox.

- [ ] **Step 3: Verify the harness catches regressions**

Temporarily set `refraction: 0` on the `.panel-clear` demo panel, run `pnpm exec playwright test e2e/visual.spec.ts`, expect FAIL on `rim-left.png`; revert the temporary change, run again, expect PASS.

- [ ] **Step 4: Full e2e**

Run: `pnpm e2e`
Expected: PASS (existing specs + visual).

- [ ] **Step 5: Commit**

```bash
git add e2e playwright.config.ts
git commit -m "test: visual regression crops for rim refraction, flat interior and bezel"
```

---

## Self-review notes

- Spec coverage: lens profile (T1–T2), CA on default backends (T4), dynamic specular (T6), GL parity (T7), API/presets/docs (T8), regression lock (T9) — matches the P0 scope; morphing, size-thickness, adaptive v2, scroll-edge and demo overhaul are explicitly out of P0 (separate plans).
- Type consistency: `generateDisplacementMap` returns `{ url, maxOffset }` consumed identically in T3/T5; `LensOptions` field names match GLSL uniform mapping; `debug().band` used in T3/T5 tests.
- Placeholder scan: all steps carry code or exact commands; the one intentionally-flagged pitfall (the `entry` double-assignment in T2 Step 3) includes the exact corrected line.
