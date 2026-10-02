import { attach, type BackendId, type LiquidGlassHandle, type LiquidGlassOptions } from '@surdeddd/liquidglass-core'
import catalog from '../../../tools/glass-match/scenes.json'

interface SceneShape {
  id: string
  x: number
  y: number
  width: number
  height: number
  radius: number
}

interface Scene {
  id: string
  family: string
  background: string
  backgroundOffset: number
  material: string
  container: string
  shapes: SceneShape[]
  tint?: string
  spacing?: number
}

interface GlassState {
  ready: boolean
  scene: string | null
  requested: BackendId
  actual: string[]
}

declare global {
  interface Window {
    __glass: () => GlassState
    __glassApply: (options: LiquidGlassOptions) => Promise<void>
  }
}

const overrides = JSON.parse(new URLSearchParams(location.search).get('params') ?? '{}') as LiquidGlassOptions

const params = new URLSearchParams(location.search)
const scene = (catalog.scenes as Scene[]).find(candidate => candidate.id === params.get('scene')) ?? null
const dark = params.get('appearance') === 'dark'
const merged = scene?.container === 'merge' || scene?.container === 'tabview'
const requested = (params.get('backend') ?? (merged ? 'webgl-overlay' : 'webgl-scene')) as BackendId

document.documentElement.style.colorScheme = dark ? 'dark' : 'light'

const stage = document.getElementById('stage') as HTMLDivElement
const backdrop = document.getElementById('backdrop') as HTMLImageElement
const fill = document.getElementById('fill') as HTMLDivElement
const handles: LiquidGlassHandle[] = []
const hosts: HTMLDivElement[] = []

function presetOptions(target: Scene): LiquidGlassOptions {
  if (target.material === 'regular') return { preset: 'frosted' }
  if (target.material === 'tinted') return { preset: 'tinted', tint: target.tint ?? '#7c5cff' }
  return { preset: 'clear' }
}

function mount(target: Scene, imageUrl: string): void {
  fill.style.background = target.backgroundOffset > 0 ? '#000' : '#fff'
  backdrop.style.left = `${target.backgroundOffset}px`
  if (target.material === 'none') return
  for (const shape of target.shapes) {
    const host = document.createElement('div')
    host.className = 'glass'
    host.dataset.shapeId = shape.id
    Object.assign(host.style, {
      left: `${shape.x}px`,
      top: `${shape.y}px`,
      width: `${shape.width}px`,
      height: `${shape.height}px`,
      borderRadius: `${shape.radius}px`
    })
    stage.append(host)
    hosts.push(host)
    const options: LiquidGlassOptions = {
      ...presetOptions(target),
      backend: requested,
      radius: shape.radius,
      backdrop,
      sceneImage: imageUrl,
      physics: false,
      quality: { maxDpr: 3 },
      ...overrides
    }
    if (merged) {
      options.merge = target.family
      options.mergeStrength = target.spacing ?? 30
    }
    handles.push(attach(host, options))
  }
}

function painted(): boolean {
  if (!backdrop.complete || backdrop.naturalWidth === 0) return false
  if (!scene || scene.material === 'none') return true
  if (hosts.some(host => host.dataset.liquidGlassBackend !== requested)) return false
  if (requested === 'webgl-scene') {
    return hosts.every(host => {
      const canvas = host.querySelector<HTMLCanvasElement>('canvas[data-liquid-glass-layer="scene"]')
      return Boolean(canvas && canvas.width > 0)
    })
  }
  if (requested === 'webgl-overlay') {
    const overlay = document.querySelector<HTMLCanvasElement>('canvas[data-liquid-glass-overlay]')
    return Boolean(overlay && overlay.width > 0)
  }
  return true
}

window.__glass = () => ({
  ready: painted(),
  scene: scene?.id ?? null,
  requested,
  actual: hosts.map(host => host.dataset.liquidGlassBackend ?? 'none')
})

const frame = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()))

window.__glassApply = async options => {
  for (const handle of handles) handle.set(options)
  await frame()
  await frame()
  await frame()
}

if (scene) {
  const imageUrl = `/backgrounds/${scene.background}`
  backdrop.addEventListener('load', () => mount(scene, imageUrl), { once: true })
  backdrop.src = imageUrl
}
