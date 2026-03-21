export interface ClockOptions {
  fixedStep: number
  maxStepsPerFrame: number
}

const DEFAULT_OPTIONS: ClockOptions = {
  fixedStep: 1 / 60,
  maxStepsPerFrame: 10,
}

export class Clock {
  private fixedStep: number
  private maxStepsPerFrame: number
  private accumulator = 0
  private lastTime: number | null = null
  private running = false
  private stepCount = 0

  constructor(options: Partial<ClockOptions> = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    this.fixedStep = opts.fixedStep
    this.maxStepsPerFrame = opts.maxStepsPerFrame
  }

  start(): void {
    this.running = true
    this.lastTime = null
    this.accumulator = 0
  }

  stop(): void {
    this.running = false
  }

  reset(): void {
    this.running = false
    this.lastTime = null
    this.accumulator = 0
    this.stepCount = 0
  }

  isRunning(): boolean {
    return this.running
  }

  getStepCount(): number {
    return this.stepCount
  }

  getFixedStep(): number {
    return this.fixedStep
  }

  tick(nowMs: number, onStep: (dt: number) => void): void {
    if (!this.running) return

    const nowSec = nowMs / 1000

    if (this.lastTime === null) {
      this.lastTime = nowSec
      return
    }

    const delta = Math.min(nowSec - this.lastTime, this.fixedStep * this.maxStepsPerFrame)
    this.lastTime = nowSec
    this.accumulator += delta

    while (this.accumulator >= this.fixedStep) {
      onStep(this.fixedStep)
      this.accumulator -= this.fixedStep
      this.stepCount++
    }
  }
}
