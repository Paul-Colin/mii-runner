import RAPIER from '@dimforge/rapier3d-compat'

export interface PhysicsWorldOptions {
  gravity: { x: number; y: number; z: number }
  solverIterations: number
}

const DEFAULT_OPTIONS: PhysicsWorldOptions = {
  gravity: { x: 0, y: -9.81, z: 0 },
  solverIterations: 4,
}

export interface RigidBodyDesc {
  type: 'dynamic' | 'fixed' | 'kinematic'
  position: { x: number; y: number; z: number }
  mass?: number
}

export interface ColliderDesc {
  shape: 'box' | 'ball' | 'capsule'
  size: { hx?: number; hy?: number; hz?: number; radius?: number; halfHeight?: number }
  restitution?: number
  friction?: number
}

export class PhysicsWorld {
  private world!: RAPIER.World
  private initialized = false

  static async create(options: Partial<PhysicsWorldOptions> = {}): Promise<PhysicsWorld> {
    const instance = new PhysicsWorld()
    await instance.init(options)
    return instance
  }

  private async init(options: Partial<PhysicsWorldOptions>): Promise<void> {
    await RAPIER.init()
    const opts = { ...DEFAULT_OPTIONS, ...options }
    this.world = new RAPIER.World(opts.gravity)
    this.world.numSolverIterations = opts.solverIterations
    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  step(dt: number): void {
    this.assertInitialized()
    this.world.timestep = dt
    this.world.step()
  }

  createGround(halfWidth = 200, halfDepth = 200): RAPIER.RigidBody {
    this.assertInitialized()
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
    const body = this.world.createRigidBody(bodyDesc)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfWidth, 0.1, halfDepth)
      .setRestitution(0.0)
      .setFriction(0.8)
    this.world.createCollider(colliderDesc, body)
    return body
  }

  createDynamicBall(
    position: { x: number; y: number; z: number },
    radius: number,
    mass: number
  ): RAPIER.RigidBody {
    this.assertInitialized()
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setAdditionalMass(mass)
    const body = this.world.createRigidBody(bodyDesc)
    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setRestitution(0.3)
      .setFriction(0.5)
    this.world.createCollider(colliderDesc, body)
    return body
  }

  getGravity(): { x: number; y: number; z: number } {
    this.assertInitialized()
    const g = this.world.gravity
    return { x: g.x, y: g.y, z: g.z }
  }

  getRapierWorld(): RAPIER.World {
    this.assertInitialized()
    return this.world
  }

  destroy(): void {
    if (this.initialized) {
      this.world.free()
      this.initialized = false
    }
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error('PhysicsWorld non initialisé — utilise PhysicsWorld.create()')
    }
  }
}
