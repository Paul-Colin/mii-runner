/**
 * MiiMuscles — système de moteurs articulaires pour MiiSkeleton.
 *
 * Chaque "muscle" pilote un joint revolute ou ball via RAPIER.
 * L'API est normalisée : setTarget(name, t) avec t ∈ [-1, 1]
 *   →  t = -1 → angle minimum du joint
 *   →  t =  0 → milieu de la plage
 *   →  t = +1 → angle maximum du joint
 *
 * Compatible réseau de neurones : les sorties NN (tanh → [-1,1]) s'appliquent
 * directement à setTarget().
 *
 * Usage :
 *   const muscles = new MiiMuscles(skeleton)
 *   // chaque frame :
 *   muscles.setTarget('knee_l', 0.8)   // 80 % de la flexion max
 */

import RAPIER from '@dimforge/rapier3d-compat'
import type { MiiSkeleton } from './MiiSkeleton.js'

// ── Constantes ────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180

/** Stiffness par défaut (calibrée pour MII_SCALE=0.155, masses ~0.1-0.4 u) */
const DEFAULT_STIFFNESS = 25
/** Damping par défaut */
const DEFAULT_DAMPING   = 5

// ── Définitions des muscles ───────────────────────────────────────────────────

interface MuscleDef {
  /** Nom du joint dans MiiSkeleton.joints */
  jointName: string
  /**
   * null  → RevoluteImpulseJoint (API haut niveau)
   * 3/4/5 → GenericJoint ball, axe RawJointAxis (AngX=3, AngY=4, AngZ=5)
   */
  rawAxis: number | null
  /** Limite angulaire minimale (rad) */
  min: number
  /** Limite angulaire maximale (rad) */
  max: number
}

/**
 * Table des muscles exposés.
 * L'ordre détermine l'index dans le vecteur d'action NN.
 */
export const MUSCLE_DEFS: Record<string, MuscleDef> = {
  // ── Tronc ─────────────────────────────────────────────────────────────────
  spine:          { jointName: 'spine',    rawAxis: null, min: -20*DEG, max:  30*DEG },

  // ── Hanches (ball joint, 2 DOF chacune) ───────────────────────────────────
  hip_l_flex:     { jointName: 'hip_l',   rawAxis: 3,    min: -25*DEG, max: 150*DEG },
  hip_l_abduct:   { jointName: 'hip_l',   rawAxis: 5,    min: -45*DEG, max:  25*DEG },
  hip_r_flex:     { jointName: 'hip_r',   rawAxis: 3,    min: -25*DEG, max: 150*DEG },
  hip_r_abduct:   { jointName: 'hip_r',   rawAxis: 5,    min: -45*DEG, max:  25*DEG },

  // ── Genoux ────────────────────────────────────────────────────────────────
  knee_l:         { jointName: 'knee_l',  rawAxis: null, min:   0*DEG, max: 150*DEG },
  knee_r:         { jointName: 'knee_r',  rawAxis: null, min:   0*DEG, max: 150*DEG },

  // ── Chevilles ─────────────────────────────────────────────────────────────
  ankle_l:        { jointName: 'ankle_l', rawAxis: null, min: -35*DEG, max:  50*DEG },
  ankle_r:        { jointName: 'ankle_r', rawAxis: null, min: -35*DEG, max:  50*DEG },

  // ── Coudes ────────────────────────────────────────────────────────────────
  elbow_l:        { jointName: 'elbow_l', rawAxis: null, min:   0*DEG, max: 145*DEG },
  elbow_r:        { jointName: 'elbow_r', rawAxis: null, min:   0*DEG, max: 145*DEG },
}

// ── Classe principale ─────────────────────────────────────────────────────────

export class MiiMuscles {
  readonly skeleton:   MiiSkeleton
  readonly stiffness:  number
  readonly damping:    number

  /** Valeurs normalisées cibles actuelles [-1, 1] par muscle */
  private targets = new Map<string, number>()

  constructor(skeleton: MiiSkeleton, stiffness = DEFAULT_STIFFNESS, damping = DEFAULT_DAMPING) {
    this.skeleton  = skeleton
    this.stiffness = stiffness
    this.damping   = damping
    for (const name of Object.keys(MUSCLE_DEFS)) {
      this.targets.set(name, 0)
    }
  }

  // ── API principale ─────────────────────────────────────────────────────────

  /**
   * Active un muscle vers une position cible normalisée.
   * @param muscleName  Nom du muscle (cf. MUSCLE_DEFS)
   * @param value       Valeur normalisée ∈ [-1, 1]
   */
  setTarget(muscleName: string, value: number): void {
    const def = MUSCLE_DEFS[muscleName]
    if (!def) return

    const clamped = Math.max(-1, Math.min(1, value))
    this.targets.set(muscleName, clamped)

    // Dénormalisation : [-1,1] → [min, max]
    const targetRad = def.min + (clamped + 1) * 0.5 * (def.max - def.min)

    const joint = this.skeleton.joints.get(def.jointName)
    if (!joint) return

    if (def.rawAxis === null) {
      // RevoluteImpulseJoint — API standard
      ;(joint as RAPIER.RevoluteImpulseJoint).configureMotorPosition(
        targetRad, this.stiffness, this.damping
      )
    } else {
      // GenericImpulseJoint (ball) — accès raw WASM
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rs = (joint as any).rawSet as {
        jointConfigureMotorPosition(h: number, ax: number, pos: number, k: number, d: number): void
      }
      rs.jointConfigureMotorPosition(joint.handle, def.rawAxis, targetRad, this.stiffness, this.damping)
    }
  }

  /**
   * Applique un vecteur d'actions (format NN).
   * L'ordre suit Object.keys(MUSCLE_DEFS).
   * @param actions  Float32Array ou tableau de longueur getMuscleCount()
   */
  setActions(actions: ArrayLike<number>): void {
    const names = this.getMuscleNames()
    for (let i = 0; i < names.length; i++) {
      if (i < actions.length) this.setTarget(names[i], actions[i])
    }
  }

  /** Remet tous les muscles à 0 (milieu de plage) */
  resetTargets(): void {
    for (const name of this.getMuscleNames()) this.setTarget(name, 0)
  }

  // ── Lecture d'état ─────────────────────────────────────────────────────────

  /** Liste ordonnée des noms de muscles (= ordre des sorties NN) */
  getMuscleNames(): string[] {
    return Object.keys(MUSCLE_DEFS)
  }

  /** Nombre de muscles */
  getMuscleCount(): number {
    return Object.keys(MUSCLE_DEFS).length
  }

  /** Valeur normalisée cible actuelle ∈ [-1, 1] */
  getTarget(muscleName: string): number {
    return this.targets.get(muscleName) ?? 0
  }

  /** Angle cible actuel en degrés */
  getTargetDeg(muscleName: string): number {
    const def = MUSCLE_DEFS[muscleName]
    if (!def) return 0
    const t = this.targets.get(muscleName) ?? 0
    return (def.min + (t + 1) * 0.5 * (def.max - def.min)) * (180 / Math.PI)
  }

  /** Plage angulaire du muscle en degrés */
  getLimitsDeg(muscleName: string): { min: number; max: number } | undefined {
    const def = MUSCLE_DEFS[muscleName]
    if (!def) return undefined
    return { min: def.min * (180 / Math.PI), max: def.max * (180 / Math.PI) }
  }
}
