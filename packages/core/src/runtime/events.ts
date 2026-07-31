import type { LiquidGlassEventMap, LiquidGlassEventName } from '../types'

export type LiquidGlassEventCb<E extends LiquidGlassEventName = LiquidGlassEventName> = (
  detail: LiquidGlassEventMap[E]
) => void

export interface Emitter {
  on<E extends LiquidGlassEventName>(event: E, cb: LiquidGlassEventCb<E>): () => void
  emit<E extends LiquidGlassEventName>(event: E, detail: LiquidGlassEventMap[E]): void
  clear(): void
}

type AnyCb = (detail: never) => void

export function createEmitter(): Emitter {
  const listeners = new Map<LiquidGlassEventName, Set<AnyCb>>()
  return {
    on(event, cb) {
      const bucket = listeners.get(event) ?? new Set<AnyCb>()
      listeners.set(event, bucket)
      bucket.add(cb as AnyCb)
      return () => {
        bucket.delete(cb as AnyCb)
      }
    },
    emit(event, detail) {
      const bucket = listeners.get(event)
      if (!bucket) return
      for (const cb of [...bucket]) {
        try {
          ;(cb as (value: unknown) => void)(detail)
        } catch {
          continue
        }
      }
    },
    clear() {
      listeners.clear()
    }
  }
}
