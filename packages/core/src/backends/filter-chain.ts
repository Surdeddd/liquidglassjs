import type { MaterialParams } from '../types'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface LensChainSpec {
  filter: SVGFilterElement
  material: MaterialParams
  scale: number
  passes: 1 | 3
}

export interface LensChainNodes {
  feImage: SVGFEImageElement
  displace: SVGFEDisplacementMapElement
  blur: SVGFEGaussianBlurElement
  setScale(scale: number): void
  /** Points the highlight at a compass bearing, or does nothing when unlit. */
  setLightAngle(deg: number): void
}

interface LensLightNodes {
  distant: SVGFEDistantLightElement
}

const DEFAULT_AZIMUTH = 225

/**
 * `feDistantLight` measures anticlockwise from the +x axis; the engine's light angle
 * is a compass bearing with 0 above the element.
 */
function azimuthFromBearing(deg: number): number {
  return (((90 - deg) % 360) + 360) % 360
}

function resolveSurfaceScale(material: MaterialParams): number {
  const thickness = typeof material.thickness === 'number' ? material.thickness : 12
  return Math.max(2, Math.min(thickness, 40))
}

function el<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name)
}

function mkDisplace(
  role: string,
  scale: number,
  result: string,
  source: string
): SVGFEDisplacementMapElement {
  const node = el('feDisplacementMap')
  node.setAttribute('in', source)
  node.setAttribute('in2', 'lgMap')
  node.setAttribute('xChannelSelector', 'R')
  node.setAttribute('yChannelSelector', 'G')
  node.setAttribute('scale', String(scale))
  node.setAttribute('result', result)
  node.setAttribute('data-lg-role', role)
  return node
}

function mkChannel(input: string, out: string, rgb: [number, number, number]): SVGFEColorMatrixElement {
  const m = el('feColorMatrix')
  m.setAttribute('in', input)
  m.setAttribute('type', 'matrix')
  const [r, g, b] = rgb
  m.setAttribute('values', `${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`)
  m.setAttribute('result', out)
  return m
}

function mkComposite(a: string, b: string, out: string): SVGFECompositeElement {
  const c = el('feComposite')
  c.setAttribute('in', a)
  c.setAttribute('in2', b)
  c.setAttribute('operator', 'arithmetic')
  c.setAttribute('k1', '0')
  c.setAttribute('k2', '1')
  c.setAttribute('k3', '1')
  c.setAttribute('k4', '0')
  c.setAttribute('result', out)
  return c
}

export function buildLensChain(spec: LensChainSpec): LensChainNodes {
  const { filter, material, scale, passes } = spec
  filter.replaceChildren()

  const feImage = el('feImage')
  feImage.setAttribute('result', 'lgMap')
  feImage.setAttribute('preserveAspectRatio', 'none')
  feImage.setAttribute('x', '-20%')
  feImage.setAttribute('y', '-20%')
  feImage.setAttribute('width', '140%')
  feImage.setAttribute('height', '140%')
  filter.appendChild(feImage)

  // Apple's material softens the backdrop and *then* bends it, so the rim shows a
  // compressed but high-contrast sliver of the surroundings. Blurring after the bend
  // averages that sliver away and leaves a grey band where the lens should be.
  const blur = el('feGaussianBlur')
  blur.setAttribute('in', 'SourceGraphic')
  blur.setAttribute('stdDeviation', String(material.blur))
  blur.setAttribute('result', 'lgSoft')
  blur.setAttribute('data-lg-role', 'blur')
  filter.appendChild(blur)

  const caShift = material.dispersion * 0.25
  let displace: SVGFEDisplacementMapElement
  let lensResult: string
  const displaceNodes: SVGFEDisplacementMapElement[] = []
  if (passes === 3) {
    const dispR = mkDisplace('displace-r', scale * (1 - caShift), 'lgDispR', 'lgSoft')
    displace = mkDisplace('displace', scale, 'lgDispG', 'lgSoft')
    const dispB = mkDisplace('displace-b', scale * (1 + caShift), 'lgDispB', 'lgSoft')
    displaceNodes.push(dispR, displace, dispB)
    filter.append(
      dispR,
      mkChannel('lgDispR', 'lgR', [1, 0, 0]),
      displace,
      mkChannel('lgDispG', 'lgG', [0, 1, 0]),
      dispB,
      mkChannel('lgDispB', 'lgB', [0, 0, 1]),
      mkComposite('lgR', 'lgG', 'lgRG'),
      mkComposite('lgRG', 'lgB', 'lgLens')
    )
    lensResult = 'lgLens'
  } else {
    displace = mkDisplace('displace', scale, 'lgLens', 'lgSoft')
    displaceNodes.push(displace)
    filter.appendChild(displace)
    lensResult = 'lgLens'
  }

  if (material.frost > 0) {
    const turb = el('feTurbulence')
    turb.setAttribute('type', 'fractalNoise')
    turb.setAttribute('baseFrequency', '0.9')
    turb.setAttribute('numOctaves', '2')
    turb.setAttribute('result', 'lgNoise')
    const frostDisplace = el('feDisplacementMap')
    frostDisplace.setAttribute('in', lensResult)
    frostDisplace.setAttribute('in2', 'lgNoise')
    frostDisplace.setAttribute('xChannelSelector', 'R')
    frostDisplace.setAttribute('yChannelSelector', 'G')
    frostDisplace.setAttribute('scale', String(material.frost * 6))
    frostDisplace.setAttribute('result', 'lgFrost')
    frostDisplace.setAttribute('data-lg-role', 'frost')
    filter.append(turb, frostDisplace)
    lensResult = 'lgFrost'
  }

  // The map's blue channel carries the dome height, so the same texture that bends
  // the backdrop can light it. Without this the default backends have no specular at
  // all and the whole light response falls to one gradient ring in the DOM.
  let lightNodes: LensLightNodes | null = null
  if (material.lighting && material.specular > 0.001) {
    const height = el('feColorMatrix')
    height.setAttribute('in', 'lgMap')
    height.setAttribute('type', 'matrix')
    height.setAttribute('values', '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0')
    height.setAttribute('result', 'lgHeight')

    const distant = el('feDistantLight')
    distant.setAttribute('azimuth', String(DEFAULT_AZIMUTH))
    distant.setAttribute('elevation', '58')

    const specular = el('feSpecularLighting')
    specular.setAttribute('in', 'lgHeight')
    specular.setAttribute('surfaceScale', String(resolveSurfaceScale(material)))
    specular.setAttribute('specularConstant', (material.specular * 1.1).toFixed(3))
    specular.setAttribute('specularExponent', '22')
    specular.setAttribute('lighting-color', '#ffffff')
    specular.setAttribute('result', 'lgSpec')
    specular.setAttribute('data-lg-role', 'specular')
    specular.appendChild(distant)

    // A flat interior under a distant light returns a constant highlight across the
    // whole surface, which is a wash rather than a lens. Confine it to the bevel:
    // step the height to "inside", subtract the dome, and what is left is the band.
    const inside = el('feComponentTransfer')
    inside.setAttribute('in', 'lgHeight')
    inside.setAttribute('result', 'lgInside')
    const insideFn = el('feFuncA')
    insideFn.setAttribute('type', 'linear')
    insideFn.setAttribute('slope', '255')
    insideFn.setAttribute('intercept', '0')
    inside.appendChild(insideFn)

    const rim = el('feComposite')
    rim.setAttribute('in', 'lgInside')
    rim.setAttribute('in2', 'lgHeight')
    rim.setAttribute('operator', 'arithmetic')
    rim.setAttribute('k1', '0')
    rim.setAttribute('k2', '1')
    rim.setAttribute('k3', '-1')
    rim.setAttribute('k4', '0')
    rim.setAttribute('result', 'lgRim')

    const clip = el('feComposite')
    clip.setAttribute('in', 'lgSpec')
    clip.setAttribute('in2', 'lgRim')
    clip.setAttribute('operator', 'in')
    clip.setAttribute('result', 'lgSpecClipped')

    const add = el('feComposite')
    add.setAttribute('in', lensResult)
    add.setAttribute('in2', 'lgSpecClipped')
    add.setAttribute('operator', 'arithmetic')
    add.setAttribute('k1', '0')
    add.setAttribute('k2', '1')
    add.setAttribute('k3', '1')
    add.setAttribute('k4', '0')
    add.setAttribute('result', 'lgLit')

    filter.append(height, inside, rim, specular, clip, add)
    lensResult = 'lgLit'
    lightNodes = { distant }
  }

  const saturate = el('feColorMatrix')
  saturate.setAttribute('in', lensResult)
  saturate.setAttribute('type', 'saturate')
  saturate.setAttribute('values', String(material.saturation))
  saturate.setAttribute('result', 'lgSat')

  const brightnessNode = el('feComponentTransfer')
  brightnessNode.setAttribute('in', 'lgSat')
  for (const name of ['feFuncR', 'feFuncG', 'feFuncB'] as const) {
    const fn = el(name)
    fn.setAttribute('type', 'linear')
    fn.setAttribute('slope', String(material.brightness))
    brightnessNode.appendChild(fn)
  }

  filter.append(saturate, brightnessNode)

  return {
    feImage,
    displace,
    blur,
    setLightAngle(deg: number) {
      if (!lightNodes) return
      lightNodes.distant.setAttribute('azimuth', azimuthFromBearing(deg).toFixed(0))
    },
    setScale(next: number) {
      const shift = material.dispersion * 0.25
      for (const node of displaceNodes) {
        const role = node.getAttribute('data-lg-role')
        const factor = role === 'displace-r' ? 1 - shift : role === 'displace-b' ? 1 + shift : 1
        node.setAttribute('scale', String(next * factor))
      }
    }
  }
}
