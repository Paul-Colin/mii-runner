import { Muscle } from './Muscle.js'
import { EnergySystem } from './EnergySystem.js'
import type { Skeleton } from './Skeleton.js'

export interface MuscleSystemOptions {
  weight: number
  muscle: number
  fMaxBase: number
  contractionSpeedBase: number
}

const DEFAULT_OPTIONS = {
  fMaxBase: 800,
  contractionSpeedBase: 1200,
}

const MUSCLE_DEFS = [
  { name: 'hip_l_flex',     joint: 'hip_l',      direction: 'flexion'   as const },
  { name: 'hip_l_ext',      joint: 'hip_l',      direction: 'extension' as const },
  { name: 'hip_r_flex',     joint: 'hip_r',      direction: 'flexion'   as const },
  { name: 'hip_r_ext',      joint: 'hip_r',      direction: 'extension' as const },
  { name: 'knee_l_flex',    joint: 'knee_l',     direction: 'flexion'   as const },
  { name: 'knee_l_ext',     joint: 'knee_l',     direction: 'extension' as const },
  { name: 'knee_r_flex',    joint: 'knee_r',     direction: 'flexion'   as const },
  { name: 'knee_r_ext',     joint: 'knee_r',     direction: 'extension' as const },
  { name: 'ankle_l_flex',   joint: 'ankle_l',    direction: 'flexion'   as const },
  { name: 'ankle_r_flex',   joint: 'ankle_r',    direction: 'flexion'   as const },
  { name: 'shoulder_l_flex',joint: 'shoulder_l', direction: 'flexion'   as const },
  { name: 'shoulder_r_flex',joint: 'shoulder_r', direction: 'flexion'   as const },
  { name: 'elbow_l_flex',   joint: 'elbow_l',    direction: 'flexion'   as const },
  { name: 'elbow_l_ext',    joint: 'elbow_l',    direction: 'extension' as const },
  { name: 'elbow_r_flex',   joint: 'elbow_r',    direction: 'flexion'   as const },
  { name: 'elbow_r_ext',    joint: 'elbow_r',    direction: 'extension' as const },
]

export class MuscleSystem {
  readonly muscles: Map<string, Muscle> = new Map()
  readonly energy: EnergySystem
  private muscleCoef: number

  constructor(skeleton: Skeleton, options: MuscleSystemOptions & Partial<typeof DEFAULT_OPTIONS>) {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    this.muscleCoef = options.muscle
    this.energy = new EnergySystem({
      weight: options.weight,
      muscle: options.muscle,
    })

    const fMax = opts.fMaxBase * options.muscle
    const vc   = opts.contractionSpeedBase * Math.sqrt(options.muscle)

    for (const def of MUSCLE_DEFS) {
      const joint = skeleton.getJointByName(def.joint)
      if (!joint) continue

      const muscle = new Muscle({
        name: def.name,
        joint,
        direction: def.direction,
        fMax,
        contractionSpeed: vc,
      })
      this.muscles.set(def.name, muscle)
    }
  }

  setActivations(signals: Record<string, number>): void {
    for (const [name, signal] of Object.entries(signals)) {
      this.muscles.get(name)?.setActivation(signal)
    }
  }

  setActivation(muscleName: string, signal: number): void {
    this.muscles.get(muscleName)?.setActivation(signal)
  }

  update(dt: number): void {
    const totalActivation = Array.from(this.muscles.values())
      .reduce((sum, m) => sum + m.getActivation(), 0)

    this.energy.update(dt, totalActivation, this.muscleCoef)
    const strengthMult = this.energy.getStrengthMultiplier()

    for (const muscle of this.muscles.values()) {
      muscle.update(dt, strengthMult)
    }
  }

  getMuscleNames(): string[] {
    return Array.from(this.muscles.keys())
  }

  getEnergyRatio(): number {
    return this.energy.getEnergyRatio()
  }

  isExhausted(): boolean {
    return this.energy.isExhausted()
  }

  reset(): void {
    for (const muscle of this.muscles.values()) muscle.reset()
    this.energy.reset()
  }
}
