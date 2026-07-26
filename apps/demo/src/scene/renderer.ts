import { OrthographicCamera, Scene, WebGLRenderer } from 'three'
import { createFlow } from './flow'
import type { FlowHandle } from './flow'
import { buildGlyphField } from './type'

export interface SceneOptions {
  density: number
  pointSize: number
  animated: boolean
}

export interface SceneHandle {
  canvas: HTMLCanvasElement
  settle(value: number): void
  destroy(): void
}

const MAX_DPR = 1.5

export function mountScene(host: HTMLElement, options: SceneOptions): SceneHandle | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: true
    })
  } catch {
    return null
  }

  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
  renderer.setPixelRatio(dpr)

  const canvas = renderer.domElement
  canvas.className = 'scene-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  host.appendChild(canvas)

  const scene = new Scene()
  const camera = new OrthographicCamera(0, 1, 1, 0, -10, 10)

  let flow: FlowHandle | null = null
  let width = 0
  let height = 0

  const rebuild = (): void => {
    const rect = host.getBoundingClientRect()
    width = Math.max(2, Math.round(rect.width))
    height = Math.max(2, Math.round(rect.height))
    renderer.setSize(width, height, false)
    camera.left = 0
    camera.right = width
    camera.top = height
    camera.bottom = 0
    camera.updateProjectionMatrix()
    if (flow) {
      scene.remove(flow.points)
      flow.dispose()
    }
    const field = buildGlyphField(width, height, options.density)
    flow = createFlow(field, options.pointSize * dpr)
    scene.add(flow.points)
  }

  rebuild()

  let frame = 0
  let running = false
  let start = 0

  const draw = (time: number): void => {
    frame = 0
    if (!start) start = time
    flow?.setTime((time - start) / 1000)
    renderer.render(scene, camera)
    if (running && !document.hidden) frame = requestAnimationFrame(draw)
  }

  const play = (): void => {
    if (running || !options.animated) return
    running = true
    frame = requestAnimationFrame(draw)
  }

  const pause = (): void => {
    running = false
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  const onVisibility = (): void => {
    if (document.hidden) pause()
    else play()
  }

  let resizeFrame = 0
  const onResize = (): void => {
    if (resizeFrame) return
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0
      rebuild()
      renderer.render(scene, camera)
    })
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('resize', onResize)

  if (options.animated) play()
  else renderer.render(scene, camera)

  return {
    canvas,
    settle(value) {
      flow?.setSettle(value)
      if (!options.animated) renderer.render(scene, camera)
    },
    destroy() {
      pause()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      if (flow) {
        scene.remove(flow.points)
        flow.dispose()
      }
      renderer.dispose()
      canvas.remove()
    }
  }
}
