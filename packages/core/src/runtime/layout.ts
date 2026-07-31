export function collectAncestors(elements: Iterable<Element>, stop: Element | null): HTMLElement[] {
  const seen = new Set<HTMLElement>()
  const chain: HTMLElement[] = []
  for (const element of elements) {
    let node = element.parentElement
    while (node && node !== stop && node.parentElement) {
      if (!seen.has(node)) {
        seen.add(node)
        chain.push(node)
      }
      node = node.parentElement
    }
  }
  return chain
}

const FLOW_CONTAINERS = new Set(['block', 'flow-root'])
const BLOCK_LEVEL = new Set(['block', 'flow-root', 'table', 'list-item'])

export function usedMarginLeft(node: HTMLElement): number | null {
  const parent = node.parentElement
  if (!parent || typeof getComputedStyle !== 'function') return null
  const computed = getComputedStyle(node)
  if (computed.marginLeft !== '0px') return null
  if (computed.position === 'absolute' || computed.position === 'fixed') return null
  if (computed.float !== 'none' && computed.float !== '') return null
  if (!BLOCK_LEVEL.has(computed.display)) return null
  const parentStyle = getComputedStyle(parent)
  if (!FLOW_CONTAINERS.has(parentStyle.display)) return null
  if (parentStyle.direction === 'rtl') return null
  const contentLeft =
    parent.getBoundingClientRect().left +
    (parseFloat(parentStyle.borderLeftWidth || '0') || 0) +
    (parseFloat(parentStyle.paddingLeft || '0') || 0)
  const used = node.getBoundingClientRect().left - contentLeft
  return used > 0.5 ? used : null
}

export function pinUsedMargins(elements: Iterable<Element>, stop: Element | null): Array<() => void> {
  const pending: Array<{ node: HTMLElement; left: number; previous: string }> = []
  for (const node of collectAncestors(elements, stop)) {
    const used = usedMarginLeft(node)
    if (used !== null) pending.push({ node, left: used, previous: node.style.marginLeft })
  }
  return pending.map(({ node, left, previous }) => {
    node.style.marginLeft = `${left}px`
    return () => {
      node.style.marginLeft = previous
    }
  })
}
