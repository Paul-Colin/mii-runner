import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PhysicsWorld } from '../../engine/PhysicsWorld.js'
import { Skeleton } from '../Skeleton.js'

describe('Skeleton', () => {
  let world: PhysicsWorld

  beforeEach(async () => {
    world = await PhysicsWorld.create()
  })

  afterEach(() => {
    world.destroy()
  })

  it('crée tous les segments', () => {
    const skeleton = new Skeleton(world.getRapierWorld())
    expect(skeleton.segments.size).toBe(13)
    skeleton.destroy()
  })

  it('crée tous les joints', () => {
    const skeleton = new Skeleton(world.getRapierWorld())
    expect(skeleton.joints.length).toBe(12)
    skeleton.destroy()
  })

  it('le segment hip existe et est positionné au dessus du sol', () => {
    const skeleton = new Skeleton(world.getRapierWorld())
    const hip = skeleton.getSegment('hip')
    expect(hip).toBeDefined()
    expect(hip!.getPosition().y).toBeGreaterThan(0)
    skeleton.destroy()
  })

  it('le centre de masse est au dessus du sol à la création', () => {
    const skeleton = new Skeleton(world.getRapierWorld())
    const com = skeleton.getCenterOfMass()
    expect(com.y).toBeGreaterThan(0.5)
    skeleton.destroy()
  })

  it('les segments tombent sous la gravité', async () => {
    const skeleton = new Skeleton(world.getRapierWorld())
    const initialY = skeleton.getCenterOfMass().y

    for (let i = 0; i < 60; i++) {
      world.step(1 / 60)
    }

    const finalY = skeleton.getCenterOfMass().y
    expect(finalY).toBeLessThan(initialY)
    skeleton.destroy()
  })

  it('un personnage plus grand spawn plus haut', () => {
    const small = new Skeleton(world.getRapierWorld(), { height: 1.50, position: { x: -3, y: 0, z: 0 } })
    const tall  = new Skeleton(world.getRapierWorld(), { height: 2.00, position: { x:  3, y: 0, z: 0 } })

    const smallCom = small.getCenterOfMass().y
    const tallCom  = tall.getCenterOfMass().y
    expect(tallCom).toBeGreaterThan(smallCom)

    small.destroy()
    tall.destroy()
  })
})
