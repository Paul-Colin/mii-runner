import { describe, it, expect } from 'vitest'
import { EnergySystem } from '../EnergySystem.js'

describe('EnergySystem', () => {
  it('calcule E_max correctement', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0 })
    expect(es.eMax).toBe(70 * 8 + 1.0 * 15)
  })

  it('démarre à E_max', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0 })
    expect(es.getEnergyRatio()).toBeCloseTo(1.0)
  })

  it('se vide quand activation > récupération', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0, recoveryRate: 0.0 })
    es.update(1.0, 1.0, 1.0)
    expect(es.getEnergyRatio()).toBeLessThan(1.0)
  })

  it('se recharge quand activation = 0', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0, recoveryRate: 0.0 })
    for (let i = 0; i < 50; i++) es.update(0.1, 1.0, 2.0)
    const afterWork = es.getEnergy()
    es.update(1.0, 0.0, 1.0)
    expect(afterWork).toBeLessThan(es.eMax)
  })

  it('ne dépasse pas E_max', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0 })
    es.update(10.0, 0.0, 0.0)
    expect(es.getEnergyRatio()).toBeCloseTo(1.0)
  })

  it('passe en épuisement quand énergie = 0', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0, recoveryRate: 0.0 })
    for (let i = 0; i < 1000; i++) {
      es.update(0.1, 1.0, 2.0)
    }
    expect(es.isExhausted()).toBe(true)
    expect(es.getStrengthMultiplier()).toBeLessThan(1.0)
  })

  it('un Mii lourd et musclé a plus d\'énergie', () => {
    const light = new EnergySystem({ weight: 50, muscle: 0.5 })
    const heavy = new EnergySystem({ weight: 100, muscle: 2.0 })
    expect(heavy.eMax).toBeGreaterThan(light.eMax)
  })

  it('reset restaure l\'énergie complète', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0, recoveryRate: 0.0 })
    for (let i = 0; i < 100; i++) es.update(0.1, 1.0, 2.0)
    es.reset()
    expect(es.getEnergyRatio()).toBeCloseTo(1.0)
    expect(es.isExhausted()).toBe(false)
  })

  it('la récupération ramène l\'énergie après effort', () => {
    const es = new EnergySystem({ weight: 70, muscle: 1.0, recoveryRate: 0.0 })
    for (let i = 0; i < 50; i++) es.update(0.1, 1.0, 2.0)
    const afterWork = es.getEnergy()
    const es2 = new EnergySystem({ weight: 70, muscle: 1.0, recoveryRate: 0.5 })
    for (let i = 0; i < 50; i++) es2.update(0.1, 1.0, 2.0)
    es2.update(2.0, 0.0, 0.0)
    expect(es2.getEnergy()).toBeGreaterThan(afterWork)
  })
})
