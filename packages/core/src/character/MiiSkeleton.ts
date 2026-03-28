/**
 * MiiSkeleton — squelette physique RAPIER dont les dimensions et positions
 * sont dérivées directement des bones du GLB corps Mii chargé.
 *
 * Contrairement au Skeleton générique :
 *  - Les corps RAPIER sont placés aux positions réelles des bones (après scaling)
 *  - Orientations initiales alignées sur la T-pose du GLB (bras horizontaux, etc.)
 *  - S'adapte automatiquement à toute morphologie Mii (height/build FFSD)
 *  - Intègre le bone "head" pour synchroniser la tête FFL avec la physique
 *
 * Usage :
 *   const skeleton = MiiSkeleton.createFromMii(rapierWorld, mii)
 *   // chaque frame :
 *   skeleton.syncMeshes()
 */

import * as THREE from 'three'
import RAPIER    from '@dimforge/rapier3d-compat'
import type { MiiInstance } from './MiiLoader.js'

// ── Constantes ───────────────────────────────────────────────────────────────

const DEG  = Math.PI / 180
const Y_UP = new THREE.Vector3(0, 1, 0)

// Collision group partagé avec le sol (même valeur que dans Segment.ts)
const COLLISION_GROUP = 0x00020004

// ── Types internes ────────────────────────────────────────────────────────────

export interface MiiSegment {
  body:         RAPIER.RigidBody
  mesh:         THREE.Mesh
  /** Quaternion initial du corps RAPIER (= orientation au repos, T-pose) */
  initialQuat:  THREE.Quaternion
  center:       THREE.Vector3
  length:       number
  radius:       number
}

// ── Classe principale ─────────────────────────────────────────────────────────

export class MiiSkeleton {
  readonly segments    = new Map<string, MiiSegment>()
  private  _joints:    RAPIER.ImpulseJoint[] = []
  /** Joints indexés par nom — accès pour le système de muscles */
  readonly joints      = new Map<string, RAPIER.ImpulseJoint>()
  private  world:      RAPIER.World
  /** Positions world des bones GLB + points calculés */
  readonly bonePos     = new Map<string, THREE.Vector3>()

  private constructor(world: RAPIER.World) {
    this.world = world
  }

  // ── Factory ────────────────────────────────────────────────────────────────

  /**
   * Crée un MiiSkeleton depuis un MiiInstance déjà chargé et positionné.
   * Doit être appelé après mii.placeOnGround() (les matrices world doivent être à jour).
   */
  static createFromMii(world: RAPIER.World, mii: MiiInstance): MiiSkeleton {
    const sk = new MiiSkeleton(world)

    // ── 1. Collecter les positions world des bones ────────────────────────────
    const BONE_NAMES = [
      'hip', 'chest', 'head',
      'arm_l1', 'arm_l2', 'wrist_l',
      'arm_r1', 'arm_r2', 'wrist_r',
      'foot_l1', 'foot_l2', 'ankle_l',
      'foot_r1', 'foot_r2', 'ankle_r',
    ] as const

    mii.root.updateWorldMatrix(true, true)

    mii.root.traverse((obj) => {
      if ((obj as THREE.Bone).isBone && (BONE_NAMES as readonly string[]).includes(obj.name)) {
        const p = new THREE.Vector3()
        obj.getWorldPosition(p)
        sk.bonePos.set(obj.name, p)
      }
    })

    // Vérification
    for (const n of BONE_NAMES) {
      if (!sk.bonePos.has(n)) console.warn(`[MiiSkeleton] bone "${n}" introuvable`)
    }

    // ── 2. Points calculés ───────────────────────────────────────────────────

    // Centre des hanches (entre foot_l1 et foot_r1)
    const hipJointCenter = sk.bonePos.get('foot_l1')!.clone()
      .add(sk.bonePos.get('foot_r1')!).multiplyScalar(0.5)
    sk.bonePos.set('hip_joint_center', hipJointCenter)

    // "Waist" = position du bone hip/chest dans le GLB (même position)
    sk.bonePos.set('waist', sk.bonePos.get('hip')!.clone())

    // Centre des épaules (entre arm_l1 et arm_r1)
    const shoulderCenter = sk.bonePos.get('arm_l1')!.clone()
      .add(sk.bonePos.get('arm_r1')!).multiplyScalar(0.5)
    sk.bonePos.set('shoulder_center', shoulderCenter)

    // Position initiale de la tête FFL (headGroup world position)
    const headFflPos = new THREE.Vector3()
    mii.headGroup.getWorldPosition(headFflPos)
    sk.bonePos.set('head_ffl', headFflPos)

    // Sommet de la tête : estime la hauteur depuis la bounding box du headGroup
    const headBox = new THREE.Box3().setFromObject(mii.headGroup)
    const headHeight = headBox.max.y - headBox.min.y
    sk.bonePos.set('head_top', headFflPos.clone().add(new THREE.Vector3(0, headHeight * 0.6, 0)))

    // Extrémités des pieds (prolonge la direction du shin au-delà de l'ankle)
    for (const side of ['l', 'r'] as const) {
      const ankle = sk.bonePos.get(`ankle_${side}`)!
      const shin2 = sk.bonePos.get(`foot_${side}2`)!
      const shinDir = ankle.clone().sub(shin2).normalize()
      const shinLen = ankle.distanceTo(shin2)
      sk.bonePos.set(`foot_${side}_end`, ankle.clone().addScaledVector(shinDir, shinLen * 0.35))
    }

    // ── 3. Définitions des segments ──────────────────────────────────────────
    // [nom, bone_start, bone_end, radiusFactor, massFactor]
    //
    // IMPORTANT — convention d'orientation des segments jambe :
    //   Tous les segments de jambe pointent de DISTAL → PROXIMAL (vers le haut).
    //   Cela garantit que chaque segment adjacent au niveau d'un joint a le même
    //   initialQuat ≈ Y_UP (identity), ce qui évite l'explosion RAPIER lors de la
    //   création des joints revolute (l'écart angulaire initial sur les axes
    //   contraints est alors ≈ 0° au lieu de 180°).
    //   La formule delta de MiiRagdoll (physCurrentQ × physRestQ⁻¹) est invariante
    //   à cette inversion — le rendu visuel est identique.
    const SEG_DEFS: Array<[string, string, string, number, number]> = [
      // Tronc : le torso s'étend jusqu'à head_ffl pour que le joint "neck" soit valide
      ['hip',         'hip_joint_center', 'waist',     0.12, 3.0],
      ['torso',       'waist',            'head_ffl',  0.10, 4.0],
      // Tête : capsule petite (physique), le visuel FFL est plus grand
      ['head',        'head_ffl',         'head_top',  0.18, 1.5],
      // Jambes — pointent vers le haut (distal→proximal) pour aligner Q_up avec le bassin
      ['thigh_l',     'foot_l2',          'foot_l1',   0.10, 1.5],  // genou → hanche
      ['shin_l',      'ankle_l',          'foot_l2',   0.08, 1.0],  // cheville → genou
      ['foot_l',      'foot_l_end',       'ankle_l',   0.09, 0.5],  // extrémité → cheville
      ['thigh_r',     'foot_r2',          'foot_r1',   0.10, 1.5],
      ['shin_r',      'ankle_r',          'foot_r2',   0.08, 1.0],
      ['foot_r',      'foot_r_end',       'ankle_r',   0.09, 0.5],
      // Bras — pointent de l'épaule vers le poignet (proximal→distal)
      // upper_arm et fore_arm partagent déjà la même direction horizontale → joints coude ok
      ['upper_arm_l', 'arm_l1',           'arm_l2',    0.09, 0.8],
      ['fore_arm_l',  'arm_l2',           'wrist_l',   0.07, 0.6],
      ['upper_arm_r', 'arm_r1',           'arm_r2',    0.09, 0.8],
      ['fore_arm_r',  'arm_r2',           'wrist_r',   0.07, 0.6],
    ]

    for (const [name, startKey, endKey, rf, mf] of SEG_DEFS) {
      const start = sk.bonePos.get(startKey)
      const end   = sk.bonePos.get(endKey)
      if (!start || !end) { console.warn(`[MiiSkeleton] missing bones for segment "${name}"`); continue }
      sk._createSegment(name, start, end, rf, mf)
    }

    // ── 4. Joints ────────────────────────────────────────────────────────────
    sk._buildJoints()

    return sk
  }

  // ── Création d'un segment ──────────────────────────────────────────────────

  private _createSegment(
    name:         string,
    start:        THREE.Vector3,
    end:          THREE.Vector3,
    radiusFactor: number,
    massFactor:   number,
  ): void {
    const center = start.clone().add(end).multiplyScalar(0.5)
    const dir    = end.clone().sub(start)
    const length = Math.max(dir.length(), 0.01)
    dir.normalize()

    // Rotation initiale : aligne l'axe Y local du capsule sur la direction du segment
    const initialQuat = new THREE.Quaternion().setFromUnitVectors(Y_UP, dir)

    const radius = Math.max(0.015, length * radiusFactor)
    const mass   = length * massFactor

    // Corps RAPIER
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: initialQuat.x, y: initialQuat.y, z: initialQuat.z, w: initialQuat.w })
      .setAdditionalMass(mass)
      .setLinearDamping(6.0)
      .setAngularDamping(15.0)
      .setSoftCcdPrediction(0.5)
      .setGravityScale(0)   // désactivé au départ — appeler enableGravity() pour démarrer

    const body = this.world.createRigidBody(bodyDesc)

    const collDesc = RAPIER.ColliderDesc
      .capsule(length / 2, radius)
      .setFriction(0.8)
      .setRestitution(0.1)
      .setCollisionGroups(COLLISION_GROUP)

    this.world.createCollider(collDesc, body)

    // Mesh de debug (capsule semi-transparente)
    const geo = new THREE.CapsuleGeometry(radius, length, 4, 8)
    const mat = new THREE.MeshLambertMaterial({
      color:       0x44aaff,
      transparent: true,
      opacity:     0.35,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = false

    this.segments.set(name, { body, mesh, initialQuat: initialQuat.clone(), center: center.clone(), length, radius })
  }

  // ── Joints ─────────────────────────────────────────────────────────────────

  private _buildJoints(): void {
    type JDef = {
      name:         string
      parent:       string
      child:        string
      junction:     string   // clé dans bonePos de la position de l'articulation
      type:         'fixed' | 'revolute' | 'spherical' | 'ball'
      axis?:        { x: number, y: number, z: number }
      limits?:      { min: number, max: number }
      // Pour 'ball' : limites angulaires par axe (via raw API RAPIER)
      // Axe du joint défini par axis={x:1,y:0,z:0} → AngX=sagittal, AngY=transversal, AngZ=frontal
      angX?:        { min: number, max: number }
      angY?:        { min: number, max: number }
      angZ?:        { min: number, max: number }
    }

    // NOTE sur les axes genou/cheville — axe {x:-1,y:0,z:0} (−X monde) :
    //   Les segments de jambe ayant été retournés (Q_up), le produit vectoriel
    //   Q_up⁻¹ × (−X) = −X local, ce qui préserve la même convention d'angle
    //   que l'ancien système (Q_down, axe +X → local −X).
    //   Résultat : 0° = jambe droite, +θ = flexion anatomique (tibia en arrière).
    //
    // NOTE sur les hanches — joint revolute possible grâce au flip :
    //   hip (Q_up) ↔ thigh_flipped (Q_up) → même orientation → écart initial = 0°
    //   → les limites incluent 0° → aucune impulsion corrective → pas d'explosion.
    //
    // NOTE sur les épaules — conservées sphériques :
    //   torso (Q_up↑) ↔ upper_arm (Q_horizontal) → incompatibles quoi qu'on retourne.
    //   Un joint revolute sur n'importe quel axe verrait un écart initial ≠ 0°
    //   sur les axes contraints → explosion garantie. Sphérique = sans limite mais stable.
    const JOINTS: JDef[] = [
      // Tronc
      { name: 'spine',      parent: 'hip',         child: 'torso',       junction: 'waist',       type: 'revolute',  axis: {x:1,y:0,z:0}, limits: { min: -20*DEG, max: 30*DEG } },
      { name: 'neck',       parent: 'torso',        child: 'head',        junction: 'head_ffl',    type: 'fixed' },
      // Hanches — ball joint 3-DOF (GenericJoint translations verrouillées + limites raw API)
      //   hip (Q_up) ↔ thigh_flipped (Q_up) → écart initial = 0° sur tous les axes → pas d'explosion
      //   axis {x:1} → joint local X = monde X → AngX=sagittal, AngY=transversal, AngZ=frontal
      { name: 'hip_l', parent: 'hip', child: 'thigh_l', junction: 'foot_l1', type: 'ball',
        angX: { min: -25*DEG, max: 150*DEG },   // flex/extension sagittale
        angY: { min: -40*DEG, max:  40*DEG },   // rotation interne/externe
        angZ: { min: -45*DEG, max:  25*DEG },   // abduction/adduction frontale
      },
      { name: 'hip_r', parent: 'hip', child: 'thigh_r', junction: 'foot_r1', type: 'ball',
        angX: { min: -25*DEG, max: 150*DEG },
        angY: { min: -40*DEG, max:  40*DEG },
        angZ: { min: -45*DEG, max:  25*DEG },
      },
      // Genoux — axe +X : le corps GLB fait face à -Z, donc +Z = derrière le Mii.
      //   Rotation positive autour de +X : tibia (+Y) → +Z = flexion anatomique correcte.
      { name: 'knee_l',     parent: 'thigh_l',      child: 'shin_l',      junction: 'foot_l2',     type: 'revolute',  axis: {x:1,y:0,z:0}, limits: { min: 0, max: 150*DEG } },
      { name: 'knee_r',     parent: 'thigh_r',      child: 'shin_r',      junction: 'foot_r2',     type: 'revolute',  axis: {x:1,y:0,z:0}, limits: { min: 0, max: 150*DEG } },
      // Chevilles — axe +X idem (plantarflexion = pied vers +Z = vers l'arrière)
      { name: 'ankle_l',    parent: 'shin_l',       child: 'foot_l',      junction: 'ankle_l',     type: 'revolute',  axis: {x:1,y:0,z:0}, limits: { min: -35*DEG, max: 50*DEG } },
      { name: 'ankle_r',    parent: 'shin_r',       child: 'foot_r',      junction: 'ankle_r',     type: 'revolute',  axis: {x:1,y:0,z:0}, limits: { min: -35*DEG, max: 50*DEG } },
      // Épaules — sphériques (orientations incompatibles pour revolute, cf. note ci-dessus)
      { name: 'shoulder_l', parent: 'torso',        child: 'upper_arm_l', junction: 'arm_l1',      type: 'spherical' },
      { name: 'shoulder_r', parent: 'torso',        child: 'upper_arm_r', junction: 'arm_r1',      type: 'spherical' },
      // Coudes — bras G pointe +X → axe +Z ; bras D pointe -X → axe -Z pour symétriser.
      //   Résultat : angle positif = avant-bras monte vers +Y sur les deux bras.
      { name: 'elbow_l',    parent: 'upper_arm_l',  child: 'fore_arm_l',  junction: 'arm_l2',      type: 'revolute',  axis: {x:0,y:0,z:1},  limits: { min: 0, max: 145*DEG } },
      { name: 'elbow_r',    parent: 'upper_arm_r',  child: 'fore_arm_r',  junction: 'arm_r2',      type: 'revolute',  axis: {x:0,y:0,z:-1}, limits: { min: 0, max: 145*DEG } },
    ]

    for (const jd of JOINTS) {
      const parentSeg = this.segments.get(jd.parent)
      const childSeg  = this.segments.get(jd.child)
      const jPos      = this.bonePos.get(jd.junction)
      if (!parentSeg || !childSeg || !jPos) { console.warn(`[MiiSkeleton] joint "${jd.name}" ignoré (segment/bone manquant)`); continue }

      const pa = this._worldToLocal(jPos, parentSeg)
      const ca = this._worldToLocal(jPos, childSeg)

      let joint: RAPIER.ImpulseJoint | null = null

      if (jd.type === 'fixed') {
        joint = this.world.createImpulseJoint(
          RAPIER.JointData.fixed(pa, { w:1,x:0,y:0,z:0 }, ca, { w:1,x:0,y:0,z:0 }),
          parentSeg.body, childSeg.body, true
        )
      } else if (jd.type === 'revolute' && jd.axis) {
        const params = RAPIER.JointData.revolute(pa, ca, jd.axis)
        joint = this.world.createImpulseJoint(params, parentSeg.body, childSeg.body, true)
        if (joint && jd.limits) {
          (joint as RAPIER.RevoluteImpulseJoint).setLimits(jd.limits.min, jd.limits.max)
        }
      } else if (jd.type === 'spherical') {
        joint = this.world.createImpulseJoint(
          RAPIER.JointData.spherical(pa, ca),
          parentSeg.body, childSeg.body, true
        )
      } else if (jd.type === 'ball') {
        // GenericJoint : translations verrouillées (= sphérique) + limites angulaires via raw API.
        // Les deux corps ont Q_up ≈ identity → angle initial = 0° sur tous les axes
        // → aucune impulsion corrective à la création → pas d'explosion.
        const params = RAPIER.JointData.generic(
          pa, ca,
          { x: 1, y: 0, z: 0 },   // axe principal X → AngX=sagittal, AngZ=frontal
          RAPIER.JointAxesMask.LinX | RAPIER.JointAxesMask.LinY | RAPIER.JointAxesMask.LinZ
        )
        joint = this.world.createImpulseJoint(params, parentSeg.body, childSeg.body, true)
        if (joint) {
          // RawJointAxis : AngX=3, AngY=4, AngZ=5
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rs = (joint as any).rawSet as { jointSetLimits(h: number, ax: number, min: number, max: number): void }
          if (jd.angX) rs.jointSetLimits(joint.handle, 3, jd.angX.min, jd.angX.max)
          if (jd.angY) rs.jointSetLimits(joint.handle, 4, jd.angY.min, jd.angY.max)
          if (jd.angZ) rs.jointSetLimits(joint.handle, 5, jd.angZ.min, jd.angZ.max)
        }
      }

      if (joint) {
        this._joints.push(joint)
        this.joints.set(jd.name, joint)
      }
    }
  }

  // ── Utilitaire : position world → anchor local du segment ─────────────────

  private _worldToLocal(
    worldPos: THREE.Vector3,
    seg:      MiiSegment,
  ): { x: number, y: number, z: number } {
    const local = worldPos.clone().sub(seg.center)
    local.applyQuaternion(seg.initialQuat.clone().invert())
    return { x: local.x, y: local.y, z: local.z }
  }

  // ── API publique ───────────────────────────────────────────────────────────

  getSegment(name: string): MiiSegment | undefined {
    return this.segments.get(name)
  }

  /**
   * Active la gravité sur tous les segments (désactivée par défaut).
   * Appeler au moment voulu (ex : touche Espace) pour déclencher le ragdoll.
   */
  enableGravity(scale = 1.0): void {
    for (const seg of this.segments.values()) {
      seg.body.setGravityScale(scale, true)
    }
  }

  /** Synchronise les meshes de debug sur les corps RAPIER */
  syncMeshes(): void {
    for (const seg of this.segments.values()) {
      const pos = seg.body.translation()
      const rot = seg.body.rotation()
      seg.mesh.position.set(pos.x, pos.y, pos.z)
      seg.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    }
  }

  addToScene(scene: THREE.Scene): void {
    for (const seg of this.segments.values()) scene.add(seg.mesh)
  }

  removeFromScene(scene: THREE.Scene): void {
    for (const seg of this.segments.values()) scene.remove(seg.mesh)
  }

  getCenterOfMass(): { x: number, y: number, z: number } {
    let x = 0, y = 0, z = 0, total = 0
    for (const seg of this.segments.values()) {
      const p = seg.body.translation()
      const m = seg.body.mass()
      x += p.x * m; y += p.y * m; z += p.z * m; total += m
    }
    return { x: x / total, y: y / total, z: z / total }
  }

  isUpright(minY: number): boolean {
    return this.getCenterOfMass().y >= minY
  }

  destroy(): void {
    for (const j of this._joints) this.world.removeImpulseJoint(j, true)
    for (const seg of this.segments.values()) {
      this.world.removeRigidBody(seg.body)
      seg.mesh.geometry.dispose()
      ;(seg.mesh.material as THREE.Material).dispose()
    }
    this.segments.clear()
    this.joints.clear()
    this._joints.length = 0
  }
}
