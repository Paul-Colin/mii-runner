import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PhysicsWorld } from '../../engine/PhysicsWorld.js'
import { Skeleton } from '../Skeleton.js'
import { MuscleSystem } from '../MuscleSystem.js'

describe('MuscleSystem', () => {
  let world: PhysicsWorld
  let skeleton: Skeleton
  let muscles: MuscleSystem

  beforeEach(async () => {
    world    = await PhysicsWorld.create()
    skeleton = new Skeleton(world.getRapierWorld())
    muscles  = new MuscleSystem(skeleton, { weight: 70, muscle: 1.0 })
  })

  afterEach(() => {
    skeleton.destroy()
    world.destroy()
  })

  it('crée 16 actionneurs', () => {
    expect(muscles.muscles.size).toBe(16)
  })

  it('démarre avec énergie pleine', () => {
    expect(muscles.getEnergyRatio()).toBeCloseTo(1.0)
  })

  it('setActivation sur un muscle connu fonctionne', () => {
    muscles.setActivation('hip_l_flex', 0.8)
    expect(muscles.muscles.get('hip_l_flex')!.getActivation()).toBeCloseTo(0.8)
  })

  it('setActivation clamp entre 0 et 1', () => {
    muscles.setActivation('knee_r_flex', 2.5)
    expect(muscles.muscles.get('knee_r_flex')!.getActivation()).toBeCloseTo(1.0)
    muscles.setActivation('knee_r_flex', -1.0)
    expect(muscles.muscles.get('knee_r_flex')!.getActivation()).toBeCloseTo(0.0)
  })

  it('l\'énergie diminue sous activation maximale', () => {
    for (const name of muscles.getMuscleNames()) {
      muscles.setActivation(name, 1.0)
    }
    for (let i = 0; i < 60; i++) {
      muscles.update(1 / 60)
      world.step(1 / 60)
    }
    expect(muscles.getEnergyRatio()).toBeLessThan(1.0)
  })

  it('reset remet activation et énergie à zéro', () => {
    muscles.setActivation('hip_l_flex', 1.0)
    for (let i = 0; i < 60; i++) muscles.update(1 / 60)
    muscles.reset()
    expect(muscles.getEnergyRatio()).toBeCloseTo(1.0)
    expect(muscles.muscles.get('hip_l_flex')!.getActivation()).toBe(0)
  })

  it('un muscle coefficient plus élevé a une force max plus grande', () => {
    const m1 = new MuscleSystem(skeleton, { weight: 70, muscle: 0.5 })
    const m2 = new MuscleSystem(skeleton, { weight: 70, muscle: 2.0 })
    const f1 = m1.muscles.get('hip_l_flex')!.getCurrentForce()
    m2.setActivation('hip_l_flex', 1.0)
    m2.update(0.5)
    expect(m2.muscles.get('hip_l_flex')!.getCurrentForce()).toBeGreaterThan(f1)
    m1.reset()
    m2.reset()
  })
})
