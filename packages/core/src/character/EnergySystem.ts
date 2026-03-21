export interface EnergySystemOptions {
  weight: number
  muscle: number
  kPoids: number
  kMuscle: number
  recoveryRate: number
  exhaustionPenalty: number
}

const DEFAULT_OPTIONS = {
  kPoids: 8,
  kMuscle: 15,
  recoveryRate: 0.15,
  exhaustionPenalty: 3.0,
}

export class EnergySystem {
  readonly eMax: number
  private energy: number
  private readonly recoveryRate: number
  private readonly exhaustionPenalty: number
  private exhausted = false

  constructor(options: Pick<EnergySystemOptions, 'weight' | 'muscle'> & Partial<EnergySystemOptions>) {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    this.eMax = opts.weight * opts.kPoids + opts.muscle * opts.kMuscle
    this.energy = this.eMax
    this.recoveryRate = opts.recoveryRate
    this.exhaustionPenalty = opts.exhaustionPenalty
  }

  update(dt: number, totalActivation: number, muscleCoef: number): void {
    const depense = totalActivation * muscleCoef * dt * 10
    const recup   = this.eMax * this.recoveryRate * dt

    this.energy = Math.min(this.eMax, this.energy - depense + recup)

    if (this.energy <= 0) {
      this.energy = 0
      this.exhausted = true
    } else if (this.energy > this.eMax * 0.2) {
      this.exhausted = false
    }
  }

  getStrengthMultiplier(): number {
    if (this.exhausted) return 1 / this.exhaustionPenalty
    return 1.0
  }

  getEnergy(): number {
    return this.energy
  }

  getEnergyRatio(): number {
    return this.energy / this.eMax
  }

  isExhausted(): boolean {
    return this.exhausted
  }

  reset(): void {
    this.energy = this.eMax
    this.exhausted = false
  }
}
