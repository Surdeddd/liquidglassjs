import type { Backend } from './types'

/** Renders nothing and touches nothing, so `effects: false` leaves the host as authored. */
export const inertBackend: Backend = {
  id: 'inert',
  priority: -1,
  autoSelect: false,
  isSupported() {
    return true
  },
  mount() {
    return {
      update() {},
      sync() {},
      destroy() {}
    }
  }
}
