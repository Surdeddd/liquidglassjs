import { renderLensPixels, type MapOptions } from '../displacement'
import { configure } from '../quality/profile'

interface LensRequest {
  id: number
  opts: MapOptions
  mapSide: number
}

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<LensRequest>) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

scope.onmessage = event => {
  const { id, opts, mapSide } = event.data
  configure({ mapSide })
  const rendered = renderLensPixels(opts)
  scope.postMessage(
    {
      id,
      pixels: rendered.pixels,
      width: rendered.width,
      height: rendered.height,
      maxOffset: rendered.maxOffset
    },
    [rendered.pixels.buffer]
  )
}
