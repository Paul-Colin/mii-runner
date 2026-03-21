import { describe, it, expect } from 'vitest'
import { Clock } from '../Clock.js'

describe('Clock', () => {
  it('ne tick pas si non démarré', () => {
    const clock = new Clock()
    const steps: number[] = []
    clock.tick(0, (dt) => steps.push(dt))
    clock.tick(100, (dt) => steps.push(dt))
    expect(steps).toHaveLength(0)
  })

  it('produit environ 60 steps pour 1 seconde à 60fps', () => {
    const clock = new Clock({ fixedStep: 1 / 60, maxStepsPerFrame: 60 })
    clock.start()
    const steps: number[] = []
    clock.tick(0, (dt) => steps.push(dt))
    clock.tick(1000, (dt) => steps.push(dt))
    expect(steps.length).toBeGreaterThanOrEqual(59)
    expect(steps.length).toBeLessThanOrEqual(60)
  })

  it('chaque step a le bon dt', () => {
    const clock = new Clock({ fixedStep: 1 / 60, maxStepsPerFrame: 60 })
    clock.start()
    const steps: number[] = []
    clock.tick(0, (dt) => steps.push(dt))
    clock.tick(1000, (dt) => steps.push(dt))
    steps.forEach(dt => {
      expect(dt).toBeCloseTo(1 / 60, 5)
    })
  })

  it('respecte maxStepsPerFrame pour éviter le spiral of death', () => {
    const clock = new Clock({ fixedStep: 1 / 60, maxStepsPerFrame: 5 })
    clock.start()
    const steps: number[] = []
    clock.tick(0, (dt) => steps.push(dt))
    clock.tick(10000, (dt) => steps.push(dt))
    expect(steps.length).toBeLessThanOrEqual(5)
  })

  it('reset remet tout à zéro', () => {
    const clock = new Clock()
    clock.start()
    clock.tick(0, () => {})
    clock.tick(1000, () => {})
    clock.reset()
    expect(clock.isRunning()).toBe(false)
    expect(clock.getStepCount()).toBe(0)
  })
})
