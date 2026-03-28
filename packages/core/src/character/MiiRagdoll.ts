/**
 * MiiRagdoll — synchronise les bones GLB du Mii sur le squelette physique RAPIER.
 *
 * Architecture :
 *   1. Root suit le segment "torso" (position + rotation) → tronc rigide.
 *   2. Chaque bone de membre (bras, jambes) est piloté par son segment RAPIER :
 *        - delta = segCurrentQ × segRestQ⁻¹
 *        - targetWorldQ = delta × boneRestWorldQ
 *        - bone.quaternion = parentCurrentWorldQ⁻¹ × targetWorldQ
 *      Les bones sont traités en ordre parent→enfant avec updateMatrixWorld()
 *      entre chaque, pour que le parent Q soit toujours à jour.
 *   3. La tête FFL suit le segment "head" (position + rotation).
 *
 * Usage :
 *   const ragdoll = new MiiRagdoll(skeleton, miiInstance)
 *   ragdoll.hidePhysicsMeshes(scene)
 *   // chaque frame :
 *   ragdoll.syncVisual()
 */

import * as THREE from 'three'
import type { MiiSkeleton } from './MiiSkeleton.js'
import type { MiiInstance }  from './MiiLoader.js'

// ─── Mapping bone GLB → segment RAPIER (ordre parent→enfant) ─────────────────
// Les membres uniquement. Le tronc est géré via root.quaternion.

const LIMB_BONE_TO_SEG: Array<[string, string]> = [
  // Bras gauche (parent avant enfant)
  ['arm_l1', 'upper_arm_l'],
  ['arm_l2', 'fore_arm_l'],
  // Bras droit
  ['arm_r1', 'upper_arm_r'],
  ['arm_r2', 'fore_arm_r'],
  // Jambe gauche
  ['foot_l1', 'thigh_l'],
  ['foot_l2', 'shin_l'],
  ['ankle_l',  'foot_l'],
  // Jambe droite
  ['foot_r1', 'thigh_r'],
  ['foot_r2', 'shin_r'],
  ['ankle_r',  'foot_r'],
]

// ─────────────────────────────────────────────────────────────────────────────

export class MiiRagdoll {
  private skeleton: MiiSkeleton
  private mii:      MiiInstance

  /** Bones GLB (membres + tronc) indexés par nom */
  private bones = new Map<string, THREE.Bone>()

  // ── État repos capturé à la construction ───────────────────────────────────

  /** Quaternion de repos du segment "torso" (physique) */
  private physRestTorsoQ  = new THREE.Quaternion()

  /** Quaternion de repos du segment "head" (physique) */
  private physRestHeadQ   = new THREE.Quaternion()

  /** Quaternion world de repos du headGroup FFL */
  private headRestWorldQ  = new THREE.Quaternion()

  /** Offset world root → centre du torso physique (calculé au repos) */
  private restOffsetRootToTorso = new THREE.Vector3()

  /** Quaternions world de repos des bones de membres */
  private boneRestWorldQuats = new Map<string, THREE.Quaternion>()

  /** Quaternions de repos des segments physiques de membres */
  private physRestLimbQuats  = new Map<string, THREE.Quaternion>()

  constructor(skeleton: MiiSkeleton, mii: MiiInstance) {
    this.skeleton = skeleton
    this.mii      = mii
    this._collectBones()
    this._captureRestPoses()
  }

  // ── Collecte des bones ─────────────────────────────────────────────────────

  private _collectBones(): void {
    const needed = new Set(LIMB_BONE_TO_SEG.map(([b]) => b))
    this.mii.root.traverse((obj) => {
      if ((obj as THREE.Bone).isBone && needed.has(obj.name)) {
        this.bones.set(obj.name, obj as THREE.Bone)
      }
    })
  }

  // ── Capture des états au repos ──────────────────────────────────────────────

  private _captureRestPoses(): void {
    this.mii.root.updateWorldMatrix(true, true)

    // Torso (pour root position + rotation)
    const torsoSeg = this.skeleton.getSegment('torso')
    if (torsoSeg) {
      const r = torsoSeg.body.rotation()
      this.physRestTorsoQ.set(r.x, r.y, r.z, r.w)
      const t = torsoSeg.body.translation()
      this.restOffsetRootToTorso
        .set(t.x, t.y, t.z)
        .sub(this.mii.root.position)
    }

    // Head
    const headSeg = this.skeleton.getSegment('head')
    if (headSeg) {
      const r = headSeg.body.rotation()
      this.physRestHeadQ.set(r.x, r.y, r.z, r.w)
    }
    this.mii.headGroup.getWorldQuaternion(this.headRestWorldQ)

    // Membres : repos des bones et des segments
    for (const [boneName, segName] of LIMB_BONE_TO_SEG) {
      const bone = this.bones.get(boneName)
      if (bone) {
        const q = new THREE.Quaternion()
        bone.getWorldQuaternion(q)
        this.boneRestWorldQuats.set(boneName, q)
      }

      const seg = this.skeleton.getSegment(segName)
      if (seg) {
        const r = seg.body.rotation()
        this.physRestLimbQuats.set(segName, new THREE.Quaternion(r.x, r.y, r.z, r.w))
      }
    }
  }

  // ── Synchronisation visuelle (à appeler chaque frame) ──────────────────────

  syncVisual(): void {
    const torsoSeg = this.skeleton.getSegment('torso')
    const headSeg  = this.skeleton.getSegment('head')
    if (!torsoSeg) return

    // ── 1. Torse : position + rotation du root ───────────────────────────────
    const tp = torsoSeg.body.translation()
    const tr = torsoSeg.body.rotation()
    const physTorsoCenter = new THREE.Vector3(tp.x, tp.y, tp.z)
    const physTorsoQ      = new THREE.Quaternion(tr.x, tr.y, tr.z, tr.w)

    const trunkDelta      = physTorsoQ.clone().multiply(this.physRestTorsoQ.clone().invert())
    const rotatedOffset   = this.restOffsetRootToTorso.clone().applyQuaternion(trunkDelta)

    this.mii.root.position.copy(physTorsoCenter).sub(rotatedOffset)
    this.mii.root.quaternion.copy(trunkDelta)
    this.mii.root.updateWorldMatrix(true, true)

    // ── 2. Membres : rotation par bone en ordre parent→enfant ────────────────
    const _targetWorldQ  = new THREE.Quaternion()
    const _parentWorldQ  = new THREE.Quaternion()
    const _segDelta      = new THREE.Quaternion()

    for (const [boneName, segName] of LIMB_BONE_TO_SEG) {
      const bone        = this.bones.get(boneName)
      const seg         = this.skeleton.getSegment(segName)
      const boneRestQ   = this.boneRestWorldQuats.get(boneName)
      const segRestQ    = this.physRestLimbQuats.get(segName)
      if (!bone || !seg || !boneRestQ || !segRestQ) continue

      const sr = seg.body.rotation()
      const segCurrentQ = new THREE.Quaternion(sr.x, sr.y, sr.z, sr.w)

      // delta de rotation du segment depuis son repos
      _segDelta.copy(segCurrentQ).multiply(segRestQ.clone().invert())

      // orientation world cible du bone = delta × repos world du bone
      _targetWorldQ.copy(_segDelta).multiply(boneRestQ)

      // Convertir en local du PARENT ACTUEL (après les rotations précédentes)
      bone.parent!.getWorldQuaternion(_parentWorldQ)
      bone.quaternion.copy(_parentWorldQ.clone().invert().multiply(_targetWorldQ))

      // Mettre à jour la matrice world de ce bone pour que ses enfants
      // puissent lire un parent Q correct à l'itération suivante
      bone.updateMatrixWorld(true)
    }

    // ── 3. Tête FFL : position + rotation depuis le segment "head" ────────────
    if (headSeg) {
      const hp = headSeg.body.translation()
      const hr = headSeg.body.rotation()
      const physHeadQ      = new THREE.Quaternion(hr.x, hr.y, hr.z, hr.w)
      const physHeadCenter = new THREE.Vector3(hp.x, hp.y, hp.z)

      // Bas du segment "head" = head_ffl = origine du headGroup
      const offsetToFfl = new THREE.Vector3(0, -headSeg.length / 2, 0)
        .applyQuaternion(physHeadQ)
      const headFflWorld = physHeadCenter.clone().add(offsetToFfl)
      this.mii.headGroup.position.copy(this.mii.root.worldToLocal(headFflWorld))

      // Rotation delta head → local de root
      const headDelta   = physHeadQ.clone().multiply(this.physRestHeadQ.clone().invert())
      const headWorldQ  = headDelta.clone().multiply(this.headRestWorldQ)
      const rootWorldQ  = new THREE.Quaternion()
      this.mii.root.getWorldQuaternion(rootWorldQ)
      this.mii.headGroup.quaternion.copy(rootWorldQ.clone().invert().multiply(headWorldQ))
    }
  }

  // ── Visibilité des capsules de debug ───────────────────────────────────────

  hidePhysicsMeshes(scene: THREE.Scene): void {
    this.skeleton.removeFromScene(scene)
  }

  showPhysicsMeshes(scene: THREE.Scene): void {
    this.skeleton.addToScene(scene)
  }

  dispose(scene: THREE.Scene): void {
    this.mii.dispose(scene)
    this.skeleton.destroy()
  }
}
