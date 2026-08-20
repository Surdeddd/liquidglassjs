export type Theme = 'dark' | 'light'

const KEY = 'lgjs-theme'

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

function writeStored(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    return
  }
}

function systemTheme(): Theme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function currentTheme(): Theme {
  const set = document.documentElement.dataset['theme']
  if (set === 'light' || set === 'dark') return set
  return systemTheme()
}

function apply(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.media = meta.dataset['theme'] === theme ? 'all' : 'not all'
  }
}

export function mountTheme(onChange: (theme: Theme) => void): void {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')
  const label = (theme: Theme): void => {
    button?.setAttribute(
      'aria-label',
      theme === 'dark' ? 'switch to the light theme' : 'switch to the dark theme'
    )
  }

  apply(currentTheme())
  label(currentTheme())

  button?.addEventListener('click', () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    writeStored(next)
    apply(next)
    label(next)
    onChange(next)
  })

  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (readStored()) return
      const next = systemTheme()
      apply(next)
      label(next)
      onChange(next)
    })
  }
}
