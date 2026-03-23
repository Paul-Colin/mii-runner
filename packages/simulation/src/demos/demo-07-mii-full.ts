/**
 * Demo 07 — Mii complet : corps GLB + tête GLB FFL
 *
 * Démontre :
 *  - MiiLoader avec scale global configurable
 *  - placeOnGround() pour poser les Miis sur le sol
 *  - height / build pilotés par les stats T/P/M du moteur
 *  - Comparaison 3 archétypes côte à côte
 */

import * as THREE from 'three'
import { RoomEnvironment }    from 'three/addons/environments/RoomEnvironment.js'
import { Renderer, getEngineInfo, validateMorphology, getArchetype } from '@mii-engine/core'
import { MiiLoader }          from '@mii-engine/core'
import { coherentMiiData }    from '@mii-engine/core'
import type { MiiInstance }   from '@mii-engine/core'
import { setupFreeCamera }    from '../helpers/setupFreeCamera.js'

// ─── Taille globale ───────────────────────────────────────────────────────────
// Corps GLB wiiu = ~12.87 unités.
// 0.155 → Mii ≈ 2m (cohérent avec démo 04 squelette Rapier)
// 0.12  → un peu plus petits, plus lisibles depuis loin
const MII_SCALE = 0.13

// ─── Mapping morphologie → FFSD (0–127) ──────────────────────────────────────

function morphoToFfsdHeight(heightM: number): number {
  const t = Math.max(0, Math.min(1, (heightM - 1.40) / 0.60))
  return Math.round(30 + t * 97)
}

function morphoToFfsdBuild(muscle: number): number {
  const t = Math.max(0, Math.min(1, (muscle - 0.5) / 1.5))
  return Math.round(20 + t * 107)
}

// ─── Archétypes ───────────────────────────────────────────────────────────────

const ARCHETYPES = [
  { label: 'Petit vif',        height: 1.55, weight: 48,  muscle: 0.7, x: -3.5, gender: 0 as 0|1 },
  { label: 'Sprinteur élancé', height: 1.82, weight: 72,  muscle: 1.1, x:  0,   gender: 0 as 0|1 },
  { label: 'Tank musclé',      height: 1.78, weight: 108, muscle: 1.9, x:  3.5, gender: 0 as 0|1 },
]

// ─── Demo ─────────────────────────────────────────────────────────────────────

export async function runDemo07(statsEl: HTMLElement): Promise<void> {
  console.log(getEngineInfo())

  const renderer = new Renderer({
    width:  window.innerWidth,
    height: window.innerHeight,
  })
  document.body.appendChild(renderer.getDomElement())

  window.addEventListener('resize', () => {
    renderer.resize(window.innerWidth, window.innerHeight)
  })

  const scene      = renderer.getScene()
  const domElement = renderer.getDomElement()
  const freeCamera = setupFreeCamera(renderer)

  // ── IBL pour les matériaux PBR (tête GLB) ────────────────────────────────
  const ctx = domElement.getContext('webgl2') ?? domElement.getContext('webgl')
  const internalRenderer = new THREE.WebGLRenderer({ canvas: domElement, context: ctx as WebGLRenderingContext })
  const pmrem      = new THREE.PMREMGenerator(internalRenderer)
  const roomEnv    = new RoomEnvironment()
  scene.environment = pmrem.fromScene(roomEnv, 0.04).texture
  roomEnv.dispose()
  pmrem.dispose()

  // ── Sol + caméra ──────────────────────────────────────────────────────────
  renderer.addGround(40, 20)

  const camera = renderer.getCamera()
  camera.position.set(0, 3, 10)
  camera.lookAt(0, 2, 0)

  // ── MiiLoader ─────────────────────────────────────────────────────────────
  const loader = new MiiLoader(scene, {
    modelsBasePath: '/assets/models',
    bodyStyle:      'wiiu',
    texResolution:  512,
    scale:          MII_SCALE,
  })

  // ── Charger les archétypes ────────────────────────────────────────────────
  const miis: MiiInstance[]   = []
  const labels: HTMLElement[] = []
  const morphologies          = ARCHETYPES.map((a) => validateMorphology(a))

  async function loadAll(): Promise<void> {
    statsEl.textContent = 'Chargement des Miis…'

    const promises = ARCHETYPES.map(async (arch, i) => {
      const cfg  = morphologies[i]!
      const data = coherentMiiData(arch.gender, String(i + 1))

      data.height        = morphoToFfsdHeight(cfg.height)
      data.build         = morphoToFfsdBuild(cfg.muscle)
      data.favoriteColor = [2, 5, 0][i]!

      const mii = await loader.load(data)
      mii.setPosition(arch.x, 0, 0)
      mii.placeOnGround()
      return mii
    })

    const loaded = await Promise.all(promises)
    miis.push(...loaded)
    statsEl.textContent = ''
  }

  await loadAll()

  // ── Labels HTML ───────────────────────────────────────────────────────────
  for (let i = 0; i < ARCHETYPES.length; i++) {
    const cfg   = morphologies[i]!
    const arch  = ARCHETYPES[i]!
    const label = document.createElement('div')
    label.style.cssText = `
      position: absolute;
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      background: rgba(0,0,0,0.65);
      padding: 5px 10px;
      border-radius: 6px;
      pointer-events: none;
      text-align: center;
      line-height: 1.7;
      white-space: nowrap;
    `
    label.innerHTML = `
      <b>${getArchetype(cfg)}</b><br>
      T:${cfg.height.toFixed(2)}m  P:${cfg.weight.toFixed(0)}kg  M:${cfg.muscle.toFixed(1)}<br>
      ffsd h=${miis[i]?.data.height ?? '?'}  build=${miis[i]?.data.build ?? '?'}
    `
    document.body.appendChild(label)
    labels.push(label)
  }

  // ── Bouton recharger ──────────────────────────────────────────────────────
  const btnReload = document.createElement('button')
  btnReload.textContent = '🔄 Nouveaux visages'
  btnReload.style.cssText = `
    position: absolute; bottom: 20px; left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px; font-family: monospace; font-size: 13px;
    background: rgba(68,136,255,0.8); color: #fff;
    border: none; border-radius: 8px; cursor: pointer;
  `
  document.body.appendChild(btnReload)

  let reloading = false
  btnReload.addEventListener('click', async () => {
    if (reloading) return
    reloading = true
    btnReload.textContent = '⏳ Chargement…'

    for (const mii of miis) mii.dispose(scene)
    miis.length = 0

    await loadAll()

    // Mettre à jour les labels
    for (let i = 0; i < labels.length; i++) {
      const d = miis[i]?.data
      if (d && labels[i]) {
        const cfg = morphologies[i]!
        labels[i]!.innerHTML = `
          <b>${getArchetype(cfg)}</b><br>
          T:${cfg.height.toFixed(2)}m  P:${cfg.weight.toFixed(0)}kg  M:${cfg.muscle.toFixed(1)}<br>
          ffsd h=${d.height}  build=${d.build}
        `
      }
    }

    btnReload.textContent = '🔄 Nouveaux visages'
    reloading = false
  })

  // ── Boucle de rendu ───────────────────────────────────────────────────────
  let fps = 0, frames = 0, lastFpsTime = performance.now()

  function worldToScreen(worldPos: THREE.Vector3): { x: number; y: number } {
    const proj = worldPos.clone().project(camera)
    return {
      x: ( proj.x * 0.5 + 0.5) * domElement.clientWidth,
      y: (-proj.y * 0.5 + 0.5) * domElement.clientHeight,
    }
  }

  function animate() {
    requestAnimationFrame(animate)
    freeCamera.update(1 / 60)

    for (let i = 0; i < miis.length; i++) {
      miis[i]!.update()

      if (labels[i]) {
        if (!freeCamera.isEnabled()) {
          // Positionner le label au-dessus du Mii
          // On projette un point dans le monde à la hauteur de la tête
          const miiPos  = miis[i]!.root.position
          const headY   = miiPos.y + cfg_heights[i]!
          const worldPt = new THREE.Vector3(miiPos.x, headY, miiPos.z)
          const screen  = worldToScreen(worldPt)
          labels[i]!.style.left    = `${screen.x - 90}px`
          labels[i]!.style.top     = `${screen.y - 10}px`
          labels[i]!.style.display = 'block'
        } else {
          labels[i]!.style.display = 'none'
        }
      }
    }

    frames++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps = frames; frames = 0; lastFpsTime = now
    }

    statsEl.textContent =
      `FPS: ${fps} | ${miis.length} Miis complets (scale=${MII_SCALE}) | FreeCam: ${freeCamera.isEnabled() ? 'ON' : 'OFF'}`

    renderer.render()
  }

  // Hauteurs approximatives de la tête pour le label (en unités monde = morpho height)
  const cfg_heights = morphologies.map((cfg) => cfg.height + 0.3)

  animate()
}