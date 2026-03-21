import { describe, it, expect, afterEach } from 'vitest'
import { PhysicsWorld } from '../PhysicsWorld.js'

describe('PhysicsWorld', () => {
  let world: PhysicsWorld

  afterEach(() => {
    world?.destroy()
  })

  it('s\'initialise correctement', async () => {
    world = await PhysicsWorld.create()
    expect(world.isInitialized()).toBe(true)
  })

  it('a la bonne gravité par défaut', async () => {
    world = await PhysicsWorld.create()
    const g = world.getGravity()
    expect(g.x).toBe(0)
    expect(g.y).toBeCloseTo(-9.81)
    expect(g.z).toBe(0)
  })

  it('accepte une gravité personnalisée', async () => {
    world = await PhysicsWorld.create({ gravity: { x: 0, y: -1.62, z: 0 } })
    const g = world.getGravity()
    expect(g.y).toBeCloseTo(-1.62)
  })

  it('une balle tombe sous la gravité', async () => {
    world = await PhysicsWorld.create()
    const ball = world.createDynamicBall({ x: 0, y: 10, z: 0 }, 0.5, 1)
    const initialY = ball.translation().y

    for (let i = 0; i < 60; i++) {
      world.step(1 / 60)
    }

    const finalY = ball.translation().y
    expect(finalY).toBeLessThan(initialY)
  })

  it('une balle s\'arrête sur le sol', async () => {
    world = await PhysicsWorld.create()
    world.createGround()
    const ball = world.createDynamicBall({ x: 0, y: 5, z: 0 }, 0.5, 1)

    for (let i = 0; i < 300; i++) {
      world.step(1 / 60)
    }

    const finalY = ball.translation().y
    expect(finalY).toBeGreaterThan(0)
    expect(finalY).toBeLessThan(2)
  })

  it('lance une erreur si utilisé avant init', () => {
    const uninitWorld = new (PhysicsWorld as any)()
    expect(() => uninitWorld.step(1 / 60)).toThrow('non initialisé')
  })
})
