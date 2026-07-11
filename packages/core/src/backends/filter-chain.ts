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
}

function el<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name)
}

function mkDisplace(role: string, scale: number, result: string): SVGFEDisplacementMapElement {
  const node = el('feDisplacementMap')
  node.setAttribute('in', 'SourceGraphic')
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

  const caShift = material.dispersion * 0.25
  let displace: SVGFEDisplacementMapElement
  let lensResult: string
  const displaceNodes: SVGFEDisplacementMapElement[] = []
  if (passes === 3) {
    const dispR = mkDisplace('displace-r', scale * (1 - caShift), 'lgDispR')
    displace = mkDisplace('displace', scale, 'lgDispG')
    const dispB = mkDisplace('displace-b', scale * (1 + caShift), 'lgDispB')
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
    displace = mkDisplace('displace', scale, 'lgLens')
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

  const blur = el('feGaussianBlur')
  blur.setAttribute('in', lensResult)
  blur.setAttribute('stdDeviation', String(material.blur))
  blur.setAttribute('result', 'lgBlur')
  blur.setAttribute('data-lg-role', 'blur')

  const saturate = el('feColorMatrix')
  saturate.setAttribute('in', 'lgBlur')
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

  filter.append(blur, saturate, brightnessNode)

  return {
    feImage,
    displace,
    blur,
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
