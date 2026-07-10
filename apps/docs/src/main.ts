import {
  attach,
  define,
  resolveMaterial,
  Spring,
  type LiquidGlassOptions,
  type LiquidGlassPreset,
  type MaterialParams
} from '@surdeddd/liquidglass-element'
import './style.css'

define()

const revealObserver =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('in')
              revealObserver?.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.15 }
      )
    : null

for (const el of document.querySelectorAll('.reveal')) {
  if (revealObserver) revealObserver.observe(el)
  else el.classList.add('in')
}

const probeLens = document.querySelector('liquid-glass[data-probe]')
const backendChip = document.querySelector('[data-backend-chip]')
if (probeLens && backendChip) {
  requestAnimationFrame(() => {
    const backend = probeLens.getAttribute('data-liquid-glass-backend') ?? 'unknown'
    backendChip.textContent = backend
    document.querySelector(`.tiers li[data-tier="${backend}"]`)?.classList.add('active')
  })
}

function wireCopy(button: Element | null, text: () => string): void {
  button?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(text()).then(() => {
      button.classList.add('done')
      button.textContent = 'copied'
      setTimeout(() => {
        button.classList.remove('done')
        button.textContent = button.hasAttribute('data-copy-install') ? 'copy' : 'copy config'
      }, 1600)
    })
  })
}

wireCopy(
  document.querySelector('[data-copy-install]'),
  () => document.querySelector('[data-install]')?.textContent ?? ''
)

const pgLens = document.querySelector<HTMLElement>('[data-pg-lens]')
const snippetNode = document.querySelector('[data-snippet]')
const presetButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-preset]')]
const paramInputs = [...document.querySelectorAll<HTMLInputElement>('[data-param]')]

const pgState: LiquidGlassOptions = { preset: 'clear', adaptive: false, physics: false }

function renderSnippet(): void {
  if (!snippetNode) return
  const entries = Object.entries(pgState).filter(([key]) => key !== 'adaptive' && key !== 'physics')
  const lines = entries.map(
    ([key, value]) => `  ${key}: ${typeof value === 'string' ? `'${value}'` : String(value)}`
  )
  snippetNode.textContent = `import { attach } from '@surdeddd/liquidglass-core'\n\nattach(element, {\n${lines.join(',\n')}\n})`
}

function syncInputs(material: MaterialParams): void {
  for (const input of paramInputs) {
    const key = input.dataset['param'] as keyof MaterialParams | undefined
    if (!key) continue
    const value = material[key]
    if (typeof value === 'number') {
      input.value = String(value)
      const output = input.closest('label')?.querySelector('output')
      if (output) output.textContent = String(value)
    } else if (key === 'tint' && typeof value === 'string' && value.startsWith('#')) {
      input.value = value.length === 4 ? `#${[...value.slice(1)].map(c => c + c).join('')}` : value
    }
  }
}

if (pgLens) {
  let handle = attach(pgLens, pgState)

  for (const input of paramInputs) {
    input.addEventListener('input', () => {
      const key = input.dataset['param'] as keyof LiquidGlassOptions | undefined
      if (!key) return
      const value = input.type === 'range' ? parseFloat(input.value) : input.value
      Object.assign(pgState, { [key]: value })
      handle.set({ [key]: value })
      const output = input.closest('label')?.querySelector('output')
      if (output) output.textContent = String(value)
      renderSnippet()
    })
  }

  for (const button of presetButtons) {
    button.addEventListener('click', () => {
      const preset = (button.dataset['preset'] ?? 'clear') as LiquidGlassPreset
      for (const key of Object.keys(pgState)) {
        if (key !== 'preset' && key !== 'adaptive' && key !== 'physics') {
          delete pgState[key as keyof LiquidGlassOptions]
        }
      }
      pgState.preset = preset
      handle.destroy()
      handle = attach(pgLens, pgState)
      presetButtons.forEach(b => b.classList.toggle('active', b === button))
      syncInputs(resolveMaterial(pgState))
      renderSnippet()
    })
  }

  syncInputs(resolveMaterial(pgState))
  renderSnippet()
}

const dockPill = document.querySelector<HTMLElement>('.dock-pill')
const dockButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-dock]')]
if (dockPill && dockButtons.length > 0) {
  const spring = new Spring(0, { stiffness: 240, damping: 17, mass: 1 })
  let frame = 0
  let last = 0
  const step = (time: number): void => {
    frame = 0
    const dt = last ? Math.min((time - last) / 1000, 1 / 20) : 1 / 60
    last = time
    const moving = spring.step(dt)
    dockPill.style.left = `${spring.value}%`
    if (moving) frame = requestAnimationFrame(step)
    else last = 0
  }
  for (const button of dockButtons) {
    button.addEventListener('click', () => {
      spring.target = Number(button.dataset['dock'] ?? 0) * 25
      dockButtons.forEach(other => other.classList.toggle('active', other === button))
      if (!frame) frame = requestAnimationFrame(step)
    })
  }
}

const FRAMEWORK_SNIPPETS: Record<string, string> = {
  vanilla: `import { attach } from '@surdeddd/liquidglass-core'

const glass = attach(document.querySelector('.panel'), {
  preset: 'frosted',
  physics: { wobble: 0.8 }
})

glass.set({ preset: 'clear' })`,
  element: `import { define } from '@surdeddd/liquidglass-element'

define()

<liquid-glass preset="frosted" merge="dock">
  Hello
</liquid-glass>`,
  react: `import { LiquidGlass, useLiquidGlass } from '@surdeddd/liquidglass-react'

<LiquidGlass as="nav" preset="clear" dispersion={0.3}>
  …
</LiquidGlass>`,
  vue: `<script setup>
import { LiquidGlass, vLiquidGlass } from '@surdeddd/liquidglass-vue'
</script>

<LiquidGlass preset="frosted" :options="{ dispersion: 0.3 }">…</LiquidGlass>
<div v-liquid-glass="{ preset: 'clear' }">…</div>`,
  svelte: `<script>
  import { liquidGlass } from '@surdeddd/liquidglass-svelte'
</script>

<div use:liquidGlass={{ preset: 'frosted', wobble: 0.8 }}>…</div>`
}

const fwCode = document.querySelector('[data-fw-code]')
const fwTabs = [...document.querySelectorAll<HTMLButtonElement>('[data-tab]')]
function showTab(name: string): void {
  if (fwCode) fwCode.textContent = FRAMEWORK_SNIPPETS[name] ?? ''
  fwTabs.forEach(tab => tab.classList.toggle('active', tab.dataset['tab'] === name))
}
for (const tab of fwTabs) {
  tab.addEventListener('click', () => showTab(tab.dataset['tab'] ?? 'vanilla'))
}
showTab('vanilla')

wireCopy(document.querySelector('[data-copy-snippet]'), () => snippetNode?.textContent ?? '')
