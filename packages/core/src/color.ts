const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function colorWithOpacity(color: string, opacity: number): string {
  const normalized = color.trim()
  if (HEX_PATTERN.test(normalized)) {
    const hex = normalized.slice(1)
    const size = hex.length === 3 ? 1 : 2
    const channel = (index: number): number => {
      const part = hex.slice(index * size, index * size + size)
      return parseInt(size === 1 ? part + part : part, 16)
    }
    return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${opacity})`
  }
  return `color-mix(in srgb, ${normalized} ${Math.round(opacity * 100)}%, transparent)`
}
