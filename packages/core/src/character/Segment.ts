import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import type { SegmentDef } from './SkeletonConfig.js'

export const COLLISION_GROUP_GROUND   = 0x00010001
export const COLLISION_GROUP_SKELETON = 0x00020004

export class Segment {
  readonly name: string
  readonly body: RAPIER.RigidBody
  readonly mesh: THREE.Mesh
  private world: RAPIER.World

  constructor(
    def: SegmentDef,
    world: RAPIER.World,
    spawnPosition: { x: number; y: number; z: number }
  ) {
    this.name = def.name
    this.world = world

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnPosition.x, spawnPosition.y, spawnPosition.z)
      .setAdditionalMass(def.mass)
      .setLinearDamping(4.0)
      .setAngularDamping(8.0)
      .setSoftCcdPrediction(0.5)

    this.body = world.createRigidBody(bodyDesc)

    const colliderDesc = RAPIER.ColliderDesc
      .capsule(def.length / 2, def.radius)
      .setFriction(1.0)
      .setRestitution(0.0)
      .setCollisionGroups(COLLISION_GROUP_SKELETON)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)

    world.createCollider(colliderDesc, this.body)

    const geo = new THREE.CapsuleGeometry(def.radius, def.length, 8, 16)
    const mat = new THREE.MeshLambertMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.85,
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
  }

  syncMesh(): void {
    const pos = this.body.translation()
    const rot = this.body.rotation()
    this.mesh.position.set(pos.x, pos.y, pos.z)
    this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
  }

  getPosition(): { x: number; y: number; z: number } {
    const t = this.body.translation()
    return { x: t.x, y: t.y, z: t.z }
  }

  destroy(): void {
    this.world.removeRigidBody(this.body)
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}
