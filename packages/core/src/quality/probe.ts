export interface Capabilities {
  backdropFilter: boolean
  backdropFilterUrl: boolean
  svgFilterOnContent: boolean
  webgl2: boolean
  webgpu: boolean
  htmlInCanvas: boolean
  reducedMotion: boolean
  reducedTransparency: boolean
}

export const NO_CAPABILITIES: Capabilities = {
  backdropFilter: false,
  backdropFilterUrl: false,
  svgFilterOnContent: false,
  webgl2: false,
  webgpu: false,
  htmlInCanvas: false,
  reducedMotion: false,
  reducedTransparency: false
}

let cached: Capabilities | null = null

function supports(property: string, value: string): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(property, value)
}

function media(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches
}

function detectWebgl2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
}

export function probeCapabilities(force = false): Capabilities {
  if (cached && !force) return cached
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return NO_CAPABILITIES
  }
  const backdropFilter =
    supports('backdrop-filter', 'blur(1px)') || supports('-webkit-backdrop-filter', 'blur(1px)')
  const isBlink =
    typeof navigator !== 'undefined' &&
    ('userAgentData' in navigator || /chrom(e|ium)/i.test(navigator.userAgent))
  cached = {
    backdropFilter,
    backdropFilterUrl: backdropFilter && isBlink && supports('backdrop-filter', 'url(#lg)'),
    svgFilterOnContent: supports('filter', 'url(#lg)'),
    webgl2: detectWebgl2(),
    webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
    htmlInCanvas: false,
    reducedMotion: media('(prefers-reduced-motion: reduce)'),
    reducedTransparency: media('(prefers-reduced-transparency: reduce)')
  }
  return cached
}

export function resetCapabilitiesCache(): void {
  cached = null
}
