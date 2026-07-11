export function captureInlineStyles(element: Element, props: readonly string[]): () => void {
  if (typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) return () => {}
  const style = element.style
  const saved = props.map(
    prop => [prop, style.getPropertyValue(prop), style.getPropertyPriority(prop)] as const
  )
  return () => {
    for (const [prop, value, priority] of saved) {
      if (value) style.setProperty(prop, value, priority)
      else style.removeProperty(prop)
    }
  }
}
