import { attach, getInstance } from './engine'
import type { LiquidGlassOptions } from './types'

const AUTO_ATTR = 'data-liquid-glass-auto'

function parseOptions(value: string | null): LiquidGlassOptions {
  if (!value) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as LiquidGlassOptions
    }
    return {}
  } catch {
    return {}
  }
}

function collect(root: ParentNode): Element[] {
  const found: Element[] = []
  if (root instanceof Element && root.hasAttribute(AUTO_ATTR)) found.push(root)
  found.push(...root.querySelectorAll(`[${AUTO_ATTR}]`))
  return found
}

export function autoAttach(root: ParentNode = document): () => void {
  if (typeof document === 'undefined') return () => {}
  const attached = new Set<Element>()

  const mount = (el: Element): void => {
    if (attached.has(el)) return
    attach(el, parseOptions(el.getAttribute(AUTO_ATTR)))
    attached.add(el)
  }

  const unmount = (el: Element): void => {
    if (!attached.has(el)) return
    getInstance(el)?.destroy()
    attached.delete(el)
  }

  for (const el of collect(root)) mount(el)

  let observer: MutationObserver | null = null
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) {
            for (const el of collect(node)) mount(el)
          }
        }
        for (const node of record.removedNodes) {
          if (node instanceof Element) {
            if (attached.has(node)) unmount(node)
            for (const el of [...attached]) {
              if (node.contains(el)) unmount(el)
            }
          }
        }
      }
    })
    observer.observe(root instanceof Document ? root.documentElement : (root as Node), {
      childList: true,
      subtree: true
    })
  }

  return () => {
    observer?.disconnect()
    observer = null
    for (const el of [...attached]) unmount(el)
  }
}
