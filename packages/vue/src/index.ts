import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ObjectDirective, PropType } from 'vue'
import {
  attach,
  detach,
  getInstance,
  type LiquidGlassHandle,
  type LiquidGlassOptions,
  type LiquidGlassPreset
} from '@liquidglass/core'

export const LiquidGlass = defineComponent({
  name: 'LiquidGlass',
  props: {
    preset: { type: String as PropType<LiquidGlassPreset>, default: 'clear' },
    as: { type: String, default: 'div' }
  },
  setup(props, { slots }) {
    const el = ref<HTMLElement | null>(null)
    let handle: LiquidGlassHandle | null = null
    onMounted(() => {
      if (el.value) handle = attach(el.value, { preset: props.preset })
    })
    onBeforeUnmount(() => {
      handle?.destroy()
      handle = null
    })
    watch(
      () => props.preset,
      preset => handle?.set({ preset })
    )
    return () => h(props.as, { ref: el }, slots['default']?.())
  }
})

export const vLiquidGlass: ObjectDirective<Element, LiquidGlassOptions | undefined> = {
  mounted(el, binding) {
    attach(el, binding.value ?? {})
  },
  updated(el, binding) {
    getInstance(el)?.set(binding.value ?? {})
  },
  unmounted(el) {
    detach(el)
  }
}

export * from '@liquidglass/core'
