import RAPIER from '@dimforge/rapier3d-compat'

export type MuscleDirection = 'flexion' | 'extension'

export interface MuscleOptions {
  name: string
  joint: RAPIER.ImpulseJoint
  direction: MuscleDirection
  fMax: number
  contractionSpeed: number
}

export class Muscle {
  readonly name: string
  private joint: RAPIER.ImpulseJoint
  private direction: MuscleDirection
  private fMax: number
  private contractionSpeed: number
  private activation = 0
  private currentForce = 0

  constructor(options: MuscleOptions) {
    this.name        = options.name
    this.joint       = options.joint
    this.direction   = options.direction
    this.fMax        = options.fMax
    this.contractionSpeed = options.contractionSpeed
  }

  setActivation(signal: number): void {
    this.activation = Math.max(0, Math.min(1, signal))
  }

  getActivation(): number {
    return this.activation
  }

  update(dt: number, strengthMultiplier: number): void {
    const targetForce = this.activation * this.fMax * strengthMultiplier
    const maxDelta    = this.contractionSpeed * dt
    const delta       = targetForce - this.currentForce

    if (Math.abs(delta) <= maxDelta) {
      this.currentForce = targetForce
    } else {
      this.currentForce += Math.sign(delta) * maxDelta
    }

    this.applyForce()
  }

  private applyForce(): void {
    if (this.currentForce < 0.001) return

    const sign = this.direction === 'flexion' ? 1 : -1
    const torque = sign * this.currentForce

    try {
      const rev = this.joint as RAPIER.RevoluteImpulseJoint
      rev.configureMotorVelocity(torque * 0.1, this.currentForce)
    } catch {
    }
  }

  getCurrentForce(): number {
    return this.currentForce
  }

  reset(): void {
    this.activation   = 0
    this.currentForce = 0
  }
}
