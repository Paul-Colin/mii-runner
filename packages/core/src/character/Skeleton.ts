import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { Segment } from './Segment.js'
import { buildSkeletonDef } from './SkeletonConfig.js'
import type { SkeletonDef } from './SkeletonConfig.js'

export interface SkeletonOptions {
  height?: number
  weight?: number
  muscle?: number
  position?: { x: number; y: number; z: number }
}

export class Skeleton {
  readonly segments: Map<string, Segment> = new Map()
  readonly joints: RAPIER.ImpulseJoint[] = []
  private def: SkeletonDef
  private world: RAPIER.World

  constructor(world: RAPIER.World, options: SkeletonOptions = {}) {
    this.world = world
    this.def = buildSkeletonDef(
      options.height ?? 1.75,
      options.weight ?? 70,
      options.muscle ?? 1.0
    )

    const basePos = options.position ?? this.def.spawnPosition
    this.buildSegments(basePos)
    this.buildJoints()
  }

  private buildSegments(basePos: { x: number; y: number; z: number }): void {
    const segDefs = this.def.segments
    const rootDef = segDefs[this.def.rootSegment]!

    const offsets = this.computeSegmentOffsets()

    for (const [name, def] of Object.entries(segDefs)) {
      const offset = offsets[name] ?? { x: 0, y: 0, z: 0 }
      const pos = {
        x: basePos.x + offset.x,
        y: basePos.y + offset.y,
        z: basePos.z + offset.z,
      }
      const segment = new Segment(def, this.world, pos)
      this.segments.set(name, segment)
    }

    void rootDef
  }

  private computeSegmentOffsets(): Record<string, { x: number; y: number; z: number }> {
    const offsets: Record<string, { x: number; y: number; z: number }> = {}
    const segs = this.def.segments

    offsets['hip'] = { x: 0, y: 0, z: 0 }

    const hipH    = segs['hip']!.length
    const torsoH  = segs['torso']!.length
    const thighH  = segs['thigh_l']!.length
    const shinH   = segs['shin_l']!.length
    const footH   = segs['foot_l']!.length
    const uArmH   = segs['upper_arm_l']!.length
    const fArmH   = segs['fore_arm_l']!.length
    const headR   = segs['head']!.radius
    const r       = segs['torso']!.radius

    offsets['torso']       = { x: 0,        y: hipH / 2 + torsoH / 2,  z: 0 }
    offsets['head']        = { x: 0,        y: hipH / 2 + torsoH + headR, z: 0 }

    offsets['thigh_l']     = { x: -r,       y: -hipH / 2 - thighH / 2, z: 0 }
    offsets['thigh_r']     = { x:  r,       y: -hipH / 2 - thighH / 2, z: 0 }
    offsets['shin_l']      = { x: -r,       y: -hipH / 2 - thighH - shinH / 2, z: 0 }
    offsets['shin_r']      = { x:  r,       y: -hipH / 2 - thighH - shinH / 2, z: 0 }
    offsets['foot_l']      = { x: -r,       y: -hipH / 2 - thighH - shinH - footH / 2, z: 0 }
    offsets['foot_r']      = { x:  r,       y: -hipH / 2 - thighH - shinH - footH / 2, z: 0 }

    offsets['upper_arm_l'] = { x: -r * 2.5, y: hipH / 2 + torsoH * 0.8, z: 0 }
    offsets['upper_arm_r'] = { x:  r * 2.5, y: hipH / 2 + torsoH * 0.8, z: 0 }
    offsets['fore_arm_l']  = { x: -r * 2.5, y: hipH / 2 + torsoH * 0.8 - uArmH - fArmH / 2, z: 0 }
    offsets['fore_arm_r']  = { x:  r * 2.5, y: hipH / 2 + torsoH * 0.8 - uArmH - fArmH / 2, z: 0 }

    return offsets
  }

  private buildJoints(): void {
    for (const jointDef of this.def.joints) {
      const parentSeg = this.segments.get(jointDef.parentSegment)
      const childSeg  = this.segments.get(jointDef.childSegment)
      if (!parentSeg || !childSeg) continue

      const pa = jointDef.parentAnchor
      const ca = jointDef.childAnchor

      let joint: RAPIER.ImpulseJoint | null = null

      if (jointDef.type === 'fixed') {
        const params = RAPIER.JointData.fixed(
          { x: pa.x, y: pa.y, z: pa.z }, { w: 1, x: 0, y: 0, z: 0 },
          { x: ca.x, y: ca.y, z: ca.z }, { w: 1, x: 0, y: 0, z: 0 }
        )
        joint = this.world.createImpulseJoint(params, parentSeg.body, childSeg.body, true)

      } else if (jointDef.type === 'revolute') {
        const params = RAPIER.JointData.revolute(
          { x: pa.x, y: pa.y, z: pa.z },
          { x: ca.x, y: ca.y, z: ca.z },
          { x: 1, y: 0, z: 0 }
        )
        joint = this.world.createImpulseJoint(params, parentSeg.body, childSeg.body, true)
        if (joint && jointDef.limits) {
          const rev = joint as RAPIER.RevoluteImpulseJoint
          if (jointDef.limits.minX !== undefined && jointDef.limits.maxX !== undefined) {
            rev.configureMotorPosition(0, 10, 1)
            rev.setLimits(jointDef.limits.minX, jointDef.limits.maxX)
          }
        }

      } else if (jointDef.type === 'spherical') {
        const params = RAPIER.JointData.spherical(
          { x: pa.x, y: pa.y, z: pa.z },
          { x: ca.x, y: ca.y, z: ca.z }
        )
        joint = this.world.createImpulseJoint(params, parentSeg.body, childSeg.body, true)
      }

      if (joint) this.joints.push(joint)
    }
  }

  syncMeshes(): void {
    for (const segment of this.segments.values()) {
      segment.syncMesh()
    }
  }

  addToScene(scene: THREE.Scene): void {
    for (const segment of this.segments.values()) {
      scene.add(segment.mesh)
    }
  }

  removeFromScene(scene: THREE.Scene): void {
    for (const segment of this.segments.values()) {
      scene.remove(segment.mesh)
    }
  }

  getSegment(name: string): Segment | undefined {
    return this.segments.get(name)
  }

  getCenterOfMass(): { x: number; y: number; z: number } {
    let x = 0, y = 0, z = 0
    let totalMass = 0
    for (const seg of this.segments.values()) {
      const pos = seg.getPosition()
      const mass = seg.body.mass()
      x += pos.x * mass
      y += pos.y * mass
      z += pos.z * mass
      totalMass += mass
    }
    return { x: x / totalMass, y: y / totalMass, z: z / totalMass }
  }

  isUpright(minHeight: number): boolean {
    const com = this.getCenterOfMass()
    return com.y >= minHeight
  }

  destroy(): void {
    for (const joint of this.joints) {
      this.world.removeImpulseJoint(joint, true)
    }
    for (const segment of this.segments.values()) {
      segment.destroy()
    }
    this.segments.clear()
    this.joints.length = 0
  }

  getJointByName(name: string): import('@dimforge/rapier3d-compat').ImpulseJoint | undefined {
    const idx = this.def.joints.findIndex(j => j.name === name)
    if (idx === -1) return undefined
    return this.joints[idx]
  }
}
