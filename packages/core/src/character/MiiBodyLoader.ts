/**
 * MiiBodyLoader — charge le modèle GLB statique du corps Mii
 * et applique le scaling taille/corpulence + les couleurs (corps, jambes, mains).
 *
 * Logique portée depuis mii-creator / 3DScene.ts (datkat21)
 * Modèles GLB : miiBodyM_wiiu.glb / miiBodyF_wiiu.glb (inclus dans le repo)
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ─── Tables de couleurs (portées depuis mii-creator/src/constants/ColorTables.ts) ──

/** Couleur favorite → hex THREE.js (body / haut) */
const MII_FAVORITE_COLOR: Record<number, number> = {
  0: 0xd21e14, // Rouge
  1: 0xff6e19, // Orange
  2: 0xffd820, // Jaune
  3: 0x78d220, // Vert clair
  4: 0x007830, // Vert foncé
  5: 0x0a48bc, // Bleu foncé
  6: 0x3caade, // Bleu clair
  7: 0xf55a7d, // Rose
  8: 0x7328ad, // Violet
  9: 0x483818, // Marron
  10: 0xe0e0e0, // Blanc
  11: 0x181814, // Noir
}

/** Couleur peau → hex THREE.js (mains) */
const MII_SKIN_COLOR: Record<number, number> = {
  0: 0xffd3ad,
  1: 0xffb66b,
  2: 0xde7942,
  3: 0xffaa8c,
  4: 0xad5129,
  5: 0x632c18,
  6: 0xffbea5,
  7: 0xffc58f,
  8: 0x8c3c23,
  9: 0x3c2d23,
}

/** Couleur pantalon selon le type de Mii */
const PANTS_COLOR_GRAY = 0x40464e // Mii normal
const PANTS_COLOR_RED  = 0x902010 // Mii favori
const PANTS_COLOR_GOLD = 0xc0a030 // Mii spécial

// ─── Options ──────────────────────────────────────────────────────────────────

export type BodyStyle = 'wiiu' | 'switch'

export interface MiiBodyOptions {
  /** 0 = masculin, 1 = féminin */
  gender: number
  /** Taille Mii (0–127) */
  height: number
  /** Corpulence Mii (0–127) */
  build: number
  /** Couleur favorite (0–11) — utilisée si favoriteColorHex est null */
  favoriteColor: number
  /** Override hex de la couleur du haut (ex: '#ff6200') — prioritaire sur favoriteColor */
  favoriteColorHex?: string | null
  /** Couleur de peau (0–9) */
  skinColor: number
  /** true si Mii favori (pantalon rouge) */
  favorite?: boolean
  /** true si Mii spécial Nintendo (pantalon or) */
  normalMii?: boolean
  /** Style de modèle (wiiu recommandé) */
  style?: BodyStyle
  /** Chemin de base vers les modèles GLB */
  modelsBasePath?: string
}

// ─── Résultat ─────────────────────────────────────────────────────────────────

export interface MiiBodyInstance {
  /** Group THREE.js racine du corps */
  group: THREE.Group
  /** Bone "head" du squelette (pour attacher la tête GLB) */
  headBone: THREE.Bone | null
  /**
   * Callback à appeler chaque frame pour synchroniser
   * la position/rotation du head bone → objet 3D externe (tête GLB)
   */
  updateHeadTransform(target: THREE.Object3D): void
  /** Libère les ressources Three.js */
  dispose(): void
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export class MiiBodyLoader {
  private loader: GLTFLoader
  private modelsBasePath: string

  constructor(modelsBasePath = '/assets/models') {
    this.loader = new GLTFLoader()
    this.modelsBasePath = modelsBasePath.replace(/\/$/, '')
  }

  /**
   * Charge le corps Mii et retourne une MiiBodyInstance.
   * Le groupe est prêt à être ajouté à la scène.
   */
  async load(options: MiiBodyOptions): Promise<MiiBodyInstance> {
    const {
      gender,
      height,
      build,
      favoriteColor,
      favoriteColorHex,
      skinColor,
      favorite = false,
      normalMii = true,
      style = 'wiiu',
    } = options

    const type = gender === 0 ? 'm' : 'f'
    const path = `${this.modelsBasePath}/miiBody${type === 'm' ? 'M' : 'F'}_${style}.glb`

    const glb = await this.loader.loadAsync(path)

    // Le GLB contient les deux genres (m + f), on ne prend que le bon
    const bodyRoot = glb.scene.getObjectByName(type) as THREE.Object3D
    if (!bodyRoot) {
      throw new Error(`MiiBodyLoader: bone "${type}" introuvable dans ${path}`)
    }

    // Masquer le genre opposé
    const opposite = glb.scene.getObjectByName(type === 'm' ? 'f' : 'm')
    if (opposite) opposite.visible = false

    // ── Appliquer les matériaux couleur ──────────────────────────────────────
    const favColor  = favoriteColorHex
      ? parseInt(favoriteColorHex.replace('#', ''), 16)
      : (MII_FAVORITE_COLOR[favoriteColor] ?? 0xd21e14)
    const skinCol   = MII_SKIN_COLOR[skinColor] ?? 0xffd3ad
    const pantsCol  = !normalMii ? PANTS_COLOR_GOLD
                    : favorite   ? PANTS_COLOR_RED
                    :              PANTS_COLOR_GRAY

    const applyColor = (name: string, hex: number) => {
      const mesh = glb.scene.getObjectByName(name) as THREE.Mesh | undefined
      if (!mesh?.isMesh) return
      mesh.material = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.85,
        metalness: 0.0,
      })
    }

    applyColor(`body_${type}`,  favColor)
    applyColor(`legs_${type}`,  pantsCol)
    applyColor(`hands_${type}`, skinCol)

    // ── Appliquer le scaling taille / corpulence ─────────────────────────────
    // Formule "scaleApply" portée depuis mii-creator (mode Wii U / Switch)
    // Note: 1.0 scale ≈ build=82 / height=83
    //
    // Mapping des axes — le bone 'm' est enfant de skl_root (rotation -90°X).
    // Après cette rotation parente, les axes locaux de bodyRoot deviennent :
    //   local X → monde X  (largeur)
    //   local Y → monde -Z (profondeur avant/arrière)
    //   local Z → monde Y  (hauteur)
    //
    // scaleCorpulence (build+height) → X et Y locaux = largeur + profondeur
    // scaleHeight     (height seul)  → Z local        = hauteur monde
    const scaleCorpulence =
      (build * (height * 0.003671875 + 0.4)) / 128.0 +
      height * 0.001796875 +
      0.4
    const scaleHeight = height * 0.006015625 + 0.5

    bodyRoot.scale.set(scaleCorpulence, scaleCorpulence, scaleHeight)

    // ── Trouver le head bone ─────────────────────────────────────────────────
    let headBone: THREE.Bone | null = null
    bodyRoot.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const name = obj.name.toLowerCase()
        if (name === 'head') headBone = obj as THREE.Bone
      }
    })

    const group = glb.scene

    // ── Helpers ──────────────────────────────────────────────────────────────
    const updateHeadTransform = (target: THREE.Object3D) => {
      if (!headBone) return
      ;(headBone as THREE.Bone).updateMatrixWorld(true)

      // Extraire la position WORLD du head bone
      const worldPos = new THREE.Vector3()
      ;(headBone as THREE.Bone).getWorldPosition(worldPos)

      // Convertir en espace LOCAL du parent (root group) de la cible.
      // C'est indispensable car la tête est enfant du root scalé,
      // contrairement à mii-creator où elle est enfant direct de la scène.
      if (target.parent) {
        target.parent.updateWorldMatrix(true, false)
        target.position.copy(
          target.parent.worldToLocal(worldPos.clone())
        )
      } else {
        target.position.copy(worldPos)
      }

      // Ne pas copier la rotation du bone : le skl_root du GLB corps
      // applique une rotation -90°X sur tout le squelette, ce qui
      // retournerait la tête. La tête GLB (API FFL) est déjà orientée
      // correctement "debout" — on réinitialise juste la rotation.
      target.rotation.set(0, 0, 0)
    }

    const dispose = () => {
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          const mat = mesh.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else (mat as THREE.Material).dispose()
        }
      })
    }

    return { group, headBone, updateHeadTransform, dispose }
  }
}