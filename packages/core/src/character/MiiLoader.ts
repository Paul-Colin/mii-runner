/**
 * MiiLoader — orchestre MiiHeadLoader + MiiBodyLoader
 * pour produire un Mii complet (tête GLB FFL + corps GLB statique).
 *
 * Usage :
 *   const loader = new MiiLoader(scene, { modelsBasePath: '/assets/models' })
 *   const mii = await loader.load(miiData)
 *   // chaque frame :
 *   mii.update()
 */

import * as THREE from 'three'
import { MiiHeadLoader, miiDataToHex }  from './MiiHeadLoader.js'
import { MiiBodyLoader }                from './MiiBodyLoader.js'
import type { BodyStyle }               from './MiiBodyLoader.js'
import type { MiiData }                 from './MiiData.js'

// modulateType index pour les meshes de la tête FFL
// Source : fflShaderConst.ts (mii-creator / ariankordi)
const FFL_HAIR    = 4  // FFL_MODULATE_TYPE_SHAPE_HAIR
const FFL_GLASS   = 8  // FFL_MODULATE_TYPE_SHAPE_GLASS — lunettes uniquement

// ─── Options ──────────────────────────────────────────────────────────────────

export interface MiiLoaderOptions {
  /** URL de base de l'API FFL */
  apiBase?: string
  /** Chemin de base vers les modèles GLB du corps */
  modelsBasePath?: string
  /** Style de corps ('wiiu' | 'switch') */
  bodyStyle?: BodyStyle
  /** Résolution de la texture visage */
  texResolution?: number
  /**
   * Scale global appliqué au root group.
   * Corps GLB wiiu ~12.87 unités → 0.155 donne ~2m dans la scène.
   * Défaut : 0.155
   */
  scale?: number
}

// ─── Instance Mii complète ────────────────────────────────────────────────────

export interface MiiInstance {
  /**
   * Group THREE.js racine.
   * Ajouter ce group à la scène — NE PAS ajouter corps/tête séparément.
   */
  root: THREE.Group

  /** Données MiiData source */
  data: MiiData

  /** Hex FFSD correspondant */
  hex: string

  /** Group THREE.js de la tête FFL (sans le corps GLB) */
  headGroup: THREE.Group

  /**
   * À appeler chaque frame (dans la boucle d'animation).
   * Synchronise la position/rotation de la tête sur le head bone du corps.
   */
  update(): void

  /** Positionne le Mii dans le monde */
  setPosition(x: number, y: number, z: number): void

  /** Oriente le Mii sur l'axe Y */
  setRotationY(rad: number): void

  /**
   * Pose le Mii sur le sol (Y=0) via bounding box.
   * À appeler après setPosition, une fois les meshes chargés.
   */
  placeOnGround(): void

  /** Sérialise les données visuelles */
  toJSON(): MiiData

  /** Retire de la scène et libère les ressources */
  dispose(scene: THREE.Scene): void
}

// ─── Loader principal ─────────────────────────────────────────────────────────

export class MiiLoader {
  private scene: THREE.Scene
  private headLoader: MiiHeadLoader
  private bodyLoader: MiiBodyLoader
  private bodyStyle: BodyStyle
  private globalScale: number

  constructor(scene: THREE.Scene, options: MiiLoaderOptions = {}) {
    this.scene       = scene
    this.bodyStyle   = options.bodyStyle ?? 'wiiu'
    this.globalScale = options.scale     ?? 0.155

    this.headLoader = new MiiHeadLoader(scene, {
      ...(options.apiBase       !== undefined && { apiBase:       options.apiBase }),
      ...(options.texResolution !== undefined && { texResolution: options.texResolution }),
      // scale tête calibré pour s'aligner avec le corps wiiu (valeur mii-creator)
      scale: 0.12,
    })

    this.bodyLoader = new MiiBodyLoader(
      options.modelsBasePath ?? '/assets/models'
    )
  }

  /**
   * Charge un Mii complet depuis des données MiiData.
   * Les deux chargements (tête + corps) sont faits en parallèle.
   */
  async load(data: MiiData): Promise<MiiInstance> {
    const hex = miiDataToHex(data)

    const [head, body] = await Promise.all([
      this.headLoader.loadFromHex(hex),
      this.bodyLoader.load({
        gender:           data.gender,
        height:           data.height,
        build:            data.build,
        favoriteColor:    data.favoriteColor,
        favoriteColorHex: data.favoriteColorHex,
        skinColor:        data.skinColor,
        favorite:         data.favorite,
        normalMii:        true,
        style:            this.bodyStyle,
      }),
    ])

    // ── Scale de la tête proportionnel à la taille du Mii ───────────────────
    // scaleHeight = formule MiiBodyLoader (height=83 → ~1.0, height=0 → 0.5)
    // Facteur partiel : réduit les petites têtes sans sur-amplifier les grandes.
    {
      const scaleHeight     = data.height * 0.006015625 + 0.5
      const headScaleFactor = (0.7 + 0.3 * scaleHeight) * 0.75
      head.group.scale.multiplyScalar(headScaleFactor)
    }

    // ── Overrides de couleur sur la tête FFL ─────────────────────────────────
    // Le GLB de l'API FFL expose geometry.userData.modulateType sur chaque mesh.
    // On peut remplacer la couleur de certaines parties en changeant material.color.
    // ── Overrides de couleur sur la tête FFL ─────────────────────────────────
    // Structure confirmée du GLB `face` (ariankordi FFL API) :
    //   OpaHair     type=4  modulateColor=[r,g,b] ← couleur baked dans modulateColor
    //   XluMask     type=6  modulateColor=[1,1,1] ← UN seul mesh pour TOUS les traits
    //                                               (yeux/sourcils/lèvres) — couleurs
    //                                               baked dans la TEXTURE, pas modifiable
    //   OpaFaceline type=0  modulateColor=[1,1,1] ← texture pré-colorée (peau)
    //   OpaForehead type=3  modulateColor=[r,g,b] ← skin color baked
    //   OpaGlass    type=8  (présent uniquement si le Mii a des lunettes)
    //
    // → Seuls hair (4) et glasses (8) sont surchargeables proprement via material.color.
    //   L'iris des yeux est baked dans la texture du XluMask → non modifiable ici.
    // DEBUG — dump tous les meshes de la tête pour identifier les modulateType
    if (data.customGlassesHex) {
      console.group(`[MiiLoader DEBUG] glassesType=${data.glassesType} customGlassesHex=${data.customGlassesHex}`)
      head.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh) return
        const ud = mesh.geometry?.userData ?? {}
        console.log(`  mesh="${mesh.name}"  modulateType=${ud.modulateType}  modulateMode=${ud.modulateMode}  modulateColor=${JSON.stringify(ud.modulateColor)}  matType=${(mesh.material as any)?.type}`)
      })
      console.groupEnd()
    }

    if (data.customHairHex || data.customGlassesHex) {
      head.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh) return
        const modType: number | undefined = mesh.geometry?.userData?.modulateType
        if (modType === undefined) return

        const applyColor = (hex: string) => {
          const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
          if (mat && 'color' in mat) mat.color.setStyle(hex)
        }

        if (data.customHairHex    && modType === FFL_HAIR)  applyColor(data.customHairHex)
        if (data.customGlassesHex && modType === FFL_GLASS) applyColor(data.customGlassesHex)
      })
    }

    // ── Construire la hiérarchie ──────────────────────────────────────────────
    const root = new THREE.Group()
    root.scale.setScalar(this.globalScale)

    // Corps en enfant direct de root
    root.add(body.group)

    // Tête en enfant direct de root (positionnée via head bone chaque frame)
    root.add(head.group)

    // Position initiale de la tête sur le head bone (avant la 1ère frame)
    body.updateHeadTransform(head.group)

    // Ajouter root à la scène
    this.scene.add(root)

    // ── Helpers ──────────────────────────────────────────────────────────────
    const update = () => {
      body.updateHeadTransform(head.group)
    }

    const setPosition = (x: number, y: number, z: number) => {
      root.position.set(x, y, z)
    }

    const setRotationY = (rad: number) => {
      root.rotation.y = rad
    }

    const placeOnGround = () => {
      root.updateWorldMatrix(true, true)
      const box = new THREE.Box3().setFromObject(root)
      if (box.min.y < 0.001) {
        root.position.y += -box.min.y + 0.001
      }
    }

    const toJSON = (): MiiData => ({ ...data })

    const dispose = (scene: THREE.Scene) => {
      scene.remove(root)
      head.dispose()
      body.dispose()
    }

    return { root, data, hex, headGroup: head.group, update, setPosition, setRotationY, placeOnGround, toJSON, dispose }
  }
}