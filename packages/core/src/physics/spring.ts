export interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

export class Spring {
  value: number
  velocity = 0
  target: number
  stiffness: number
  damping: number
  mass: number

  constructor(value: number, config: SpringConfig) {
    this.value = value
    this.target = value
    this.stiffness = config.stiffness
    this.damping = config.damping
    this.mass = config.mass
  }

  configure(config: Partial<SpringConfig>): void {
    if (config.stiffness !== undefined) this.stiffness = config.stiffness
    if (config.damping !== undefined) this.damping = config.damping
    if (config.mass !== undefined) this.mass = config.mass
  }

  get settled(): boolean {
    return Math.abs(this.value - this.target) < 0.0005 && Math.abs(this.velocity) < 0.005
  }

  step(dt: number): boolean {
    const displacement = this.value - this.target
    const force = -this.stiffness * displacement - this.damping * this.velocity
    this.velocity += (force / this.mass) * dt
    this.value += this.velocity * dt
    if (this.settled) {
      this.value = this.target
      this.velocity = 0
      return false
    }
    return true
  }
}
