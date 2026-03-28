/**
 * Env 02 — Ligne de départ
 *
 * Charge l'île Wuhu + piste et place 4 Miis sur les couloirs de départ.
 * Sert de base visuelle pour la future simulation GA.
 *
 * Contrôles :
 *   [F]   — caméra libre
 *   [B]   — wireframe
 */

import * as THREE from 'three'
import { GLTFLoader }       from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment }  from 'three/addons/environments/RoomEnvironment.js'
import {
  Renderer,
  MiiLoader,
  coherentMiiData,
} from '@mii-engine/core'
import { setupFreeCamera }  from '../helpers/setupFreeCamera.js'

// ── Positions de départ (mesurées en Three.js via free cam env-02) ────────────
// X fixe ≈ 26.26, Z espacement constant 0.25, Y = surface de la piste ≈ 2.0
const LANE_X     = 26.26
const LANE_Y     = 2.08   // hauteur surface piste — ajuster si Miis flottent/s'enfoncent
const LANE_Z_0   = 6.985  // Z couloir 1
const LANE_STEP  = 0.250  // écart entre couloirs

const START_POSITIONS = [0, 1, 2, 3].map(i =>
  new THREE.Vector3(LANE_X, LANE_Y, LANE_Z_0 + i * LANE_STEP)
)

// ─────────────────────────────────────────────────────────────────────────────

export async function runEnv02(statsEl: HTMLElement): Promise<void> {

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer   = new Renderer({ width: window.innerWidth, height: window.innerHeight })
  document.body.appendChild(renderer.getDomElement())
  window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight))

  const scene      = renderer.getScene()
  const camera     = renderer.getCamera()
  const domElement = renderer.getDomElement()
  // [Shift+F] vitesse lente pour positionner précisément
  const freeCamera = setupFreeCamera(renderer, { speed: 5 })

  // ── IBL ────────────────────────────────────────────────────────────────────
  const ctx = domElement.getContext('webgl2') ?? domElement.getContext('webgl')
  const internalRenderer = new THREE.WebGLRenderer({ canvas: domElement, context: ctx as WebGLRenderingContext })
  const pmrem   = new THREE.PMREMGenerator(internalRenderer)
  const roomEnv = new RoomEnvironment()
  scene.environment = pmrem.fromScene(roomEnv, 0.04).texture
  scene.background  = new THREE.Color(0x87CEEB)
  roomEnv.dispose()
  pmrem.dispose()

  // ── Lumières ───────────────────────────────────────────────────────────────
  const sun = new THREE.DirectionalLight(0xFFE5A0, 1.8)
  sun.position.set(80, 120, 60)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near   = 0.5
  sun.shadow.camera.far    = 500
  sun.shadow.camera.left   = sun.shadow.camera.bottom = -150
  sun.shadow.camera.right  = sun.shadow.camera.top    =  150
  scene.add(sun)
  scene.add(new THREE.AmbientLight(0xCCDDFF, 0.6))

  scene.fog = new THREE.Fog(0xC8E6FF, 200, 800)

  // ── Caméra ─────────────────────────────────────────────────────────────────
  camera.position.set(30, 5, 13)
  camera.lookAt(0, 3, 0)
  camera.far = 2000
  camera.updateProjectionMatrix()

  // ── Chargement de l'île ────────────────────────────────────────────────────
  statsEl.textContent = 'Chargement de la map…'

  let wireframe = false
  let island: THREE.Group | null = null

  try {
    const loader = new GLTFLoader()
    const gltf   = await loader.loadAsync('/assets/models/ile_wuhu_pistev1.glb')
    island = gltf.scene

    // Même centrage que env-01
    const box    = new THREE.Box3().setFromObject(island)
    const center = new THREE.Vector3()
    box.getCenter(center)

    island.position.x -= center.x
    island.position.z -= center.z
    island.position.y -= box.min.y

    island.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      obj.receiveShadow = true
      obj.castShadow    = true
    })

    scene.add(island)
    statsEl.textContent = 'Map chargée — chargement des Miis…'

  } catch (err) {
    statsEl.textContent = '❌ ile_wuhu_pistev1.glb introuvable'
    console.error('[Env02]', err)
  }

  // ── Positions de départ (directement en Three.js, mesurées via free cam) ──
  const startPositions = START_POSITIONS

  // ── Chargement des 4 Miis ─────────────────────────────────────────────────
  // Scale réduit pour matcher l'échelle de l'île Wuhu (1414 unités)
  // 0.155 = 1 unité ≈ 1m → trop grand. À ajuster selon le rendu.
  const MII_SCALE = 0.015

  const miiLoader = new MiiLoader(scene, {
    modelsBasePath: '/assets/models',
    bodyStyle:      'wiiu',
    texResolution:  256,
    scale:          MII_SCALE,
  })

  const miis = await Promise.all(
    startPositions.map((pos, i) => {
      const data = coherentMiiData(undefined, `env02-${i}`)
      return miiLoader.load(data).then(mii => {
        mii.setPosition(pos.x, pos.y, pos.z)
        mii.setRotationY(Math.PI / 2)  // 45° sens trigonométrique (CCW vu de dessus)
        return mii
      })
    })
  )

  statsEl.textContent = `${miis.length} Miis prêts sur la ligne de départ`

  // ── Légende ────────────────────────────────────────────────────────────────
  const legend = document.createElement('div')
  legend.style.cssText = `
    position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
    color:#fff; font-family:monospace; font-size:11px;
    background:rgba(0,0,0,0.65); padding:6px 14px; border-radius:8px;
    pointer-events:none; white-space:nowrap;
  `
  legend.textContent = '[F] caméra libre  |  [B] wireframe  |  coordonnées affichées en haut à gauche'
  document.body.appendChild(legend)

  // ── Clavier ────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && island) {
      wireframe = !wireframe
      island.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach(m => { if ('wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe })
          else if ('wireframe' in mat) (mat as THREE.MeshStandardMaterial).wireframe = wireframe
        }
      })
    }
  })

  // ── Boucle ─────────────────────────────────────────────────────────────────
  let fps = 0, frames = 0, lastFpsTime = performance.now()

  function animate() {
    requestAnimationFrame(animate)
    freeCamera.update(1 / 60)
    miis.forEach(mii => mii.update())

    frames++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps = frames; frames = 0; lastFpsTime = now
    }

    const cam = camera.position
    statsEl.textContent =
      `FPS: ${fps}  |  Cam: (${cam.x.toFixed(3)}, ${cam.y.toFixed(3)}, ${cam.z.toFixed(3)})`

    renderer.render()
  }
  requestAnimationFrame(animate)
}
