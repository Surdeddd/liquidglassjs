import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ObjectDirective, PropType } from 'vue'
import {
  attach,
  detach,
  getInstance,
  resetMissingOptions,
  type LiquidGlassHandle,
  type LiquidGlassOptions,
  type LiquidGlassPreset
} from '@surdeddd/liquidglass-core'

export const LiquidGlass = defineComponent({
  name: 'LiquidGlass',
  props: {
    preset: { type: String as PropType<LiquidGlassPreset>, default: 'clear' },
    as: { type: String, default: 'div' },
    options: { type: Object as PropType<LiquidGlassOptions>, default: () => ({}) }
  },
  setup(props, { slots, expose }) {
    const el = ref<HTMLElement | null>(null)
    let handle: LiquidGlassHandle | null = null
    const merged = (): LiquidGlassOptions => ({ preset: props.preset, ...props.options })
    onMounted(() => {
      if (el.value) handle = attach(el.value, merged())
    })
    onBeforeUnmount(() => {
      handle?.destroy()
      handle = null
    })
    watch(
      merged,
      (next, prev) => handle?.set(resetMissingOptions(prev, next)),
      { deep: true }
    )
    expose({ glass: () => handle })
    return () => h(props.as, { ref: el }, slots['default']?.())
  }
})

export const vLiquidGlass: ObjectDirective<Element, LiquidGlassOptions | undefined> = {
  mounted(el, binding) {
    attach(el, binding.value ?? {})
  },
  updated(el, binding) {
    getInstance(el)?.set(resetMissingOptions(binding.oldValue ?? undefined, binding.value ?? {}))
  },
  unmounted(el) {
    detach(el)
  }
}

export * from '@surdeddd/liquidglass-core'
