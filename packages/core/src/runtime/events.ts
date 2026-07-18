export type LiquidGlassEvent = 'backendchange' | 'tonechange' | 'press' | 'release' | 'degrade'

export type LiquidGlassEventCb = (detail: string) => void

export interface Emitter {
  on(event: LiquidGlassEvent, cb: LiquidGlassEventCb): () => void
  emit(event: LiquidGlassEvent, detail: string): void
  clear(): void
}

export function createEmitter(): Emitter {
  const listeners = new Map<LiquidGlassEvent, Set<LiquidGlassEventCb>>()
  return {
    on(event, cb) {
      const bucket = listeners.get(event) ?? new Set()
      listeners.set(event, bucket)
      bucket.add(cb)
      return () => {
        bucket.delete(cb)
      }
    },
    emit(event, detail) {
      const bucket = listeners.get(event)
      if (!bucket) return
      for (const cb of [...bucket]) {
        try {
          cb(detail)
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
