/**
 * Env 01 — Île Wuhu
 *
 * Charge wuhu_island.glb et le place dans une scène Three.js avec IBL.
 * Permet d'explorer l'île à la caméra libre et de calibrer la position / l'échelle
 * avant d'y intégrer la piste d'athlétisme.
 *
 * Contrôles :
 *   [F] / clic droit   — caméra libre (WASD + souris)
 *   [G]                — afficher/masquer la grille de référence (1 unité = 1 m)
 *   [W]                — toggle wireframe
 */

import * as THREE from 'three'
import { GLTFLoader }       from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment }  from 'three/addons/environments/RoomEnvironment.js'
import { Renderer }         from '@mii-engine/core'
import { setupFreeCamera }  from '../helpers/setupFreeCamera.js'

export async function runEnv01(statsEl: HTMLElement): Promise<void> {

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer   = new Renderer({ width: window.innerWidth, height: window.innerHeight })
  document.body.appendChild(renderer.getDomElement())
  window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight))

  const scene      = renderer.getScene()
  const camera     = renderer.getCamera()
  const domElement = renderer.getDomElement()
  const freeCamera = setupFreeCamera(renderer, { speed: 80 })

  // ── IBL ────────────────────────────────────────────────────────────────────
  const ctx = domElement.getContext('webgl2') ?? domElement.getContext('webgl')
  const internalRenderer = new THREE.WebGLRenderer({ canvas: domElement, context: ctx as WebGLRenderingContext })
  const pmrem   = new THREE.PMREMGenerator(internalRenderer)
  const roomEnv = new RoomEnvironment()
  scene.environment = pmrem.fromScene(roomEnv, 0.04).texture
  scene.background  = new THREE.Color(0x87CEEB)   // ciel bleu Wii
  roomEnv.dispose()
  pmrem.dispose()

  // ── Lumières ───────────────────────────────────────────────────────────────
  const sun = new THREE.DirectionalLight(0xFFE5A0, 1.8)
  sun.position.set(80, 120, 60)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far  = 500
  sun.shadow.camera.left = sun.shadow.camera.bottom = -150
  sun.shadow.camera.right = sun.shadow.camera.top  =  150
  scene.add(sun)

  const ambient = new THREE.AmbientLight(0xCCDDFF, 0.6)
  scene.add(ambient)

  // ── Brume douce ────────────────────────────────────────────────────────────
  scene.fog = new THREE.Fog(0xC8E6FF, 200, 800)

  // ── Grille de référence (1 carreau = 10 m) ─────────────────────────────────
  const grid = new THREE.GridHelper(500, 50, 0x888888, 0x444444)
  grid.position.y = 0.05
  grid.visible = false
  scene.add(grid)

  // ── Caméra initiale ────────────────────────────────────────────────────────
  camera.position.set(0, 60, 180)
  camera.lookAt(0, 0, 0)
  camera.far = 2000
  camera.updateProjectionMatrix()

  // ── Chargement de l'île Wuhu ───────────────────────────────────────────────
  statsEl.textContent = 'Chargement de l\'île Wuhu…'

  let island: THREE.Group | null = null
  let wireframe = false

  try {
    const loader = new GLTFLoader()
    const gltf   = await loader.loadAsync('/assets/models/ile_wuhu_pistev1.glb')
    island = gltf.scene

    // ── Calibrage auto : centrer + poser sur Y=0 ──────────────────────────────
    const box    = new THREE.Box3().setFromObject(island)
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size   = new THREE.Vector3()
    box.getSize(size)

    // Centrer horizontalement
    island.position.x -= center.x
    island.position.z -= center.z
    // Poser sur Y=0
    island.position.y -= box.min.y

    island.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      obj.receiveShadow = true
      obj.castShadow    = true
      // Activer les matériaux PBR si le GLB en contient
      if (obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.envMapIntensity = 0.4
      }
    })

    scene.add(island)

    // ── Stats du modèle ───────────────────────────────────────────────────────
    let tris = 0
    island.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const geo = obj.geometry as THREE.BufferGeometry
        const idx = geo.index
        tris += idx ? idx.count / 3 : (geo.attributes.position?.count ?? 0) / 3
      }
    })

    const sizeStr = `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} u`
    statsEl.textContent = `Île chargée — ${Math.round(tris).toLocaleString()} triangles — ${sizeStr}`

    // Recadrer la caméra : légèrement au-dessus du sol, en retrait
    const span = Math.max(size.x, size.z)
    camera.position.set(0, size.y * 0.15, span * 0.55)
    camera.lookAt(0, size.y * 0.1, 0)
    camera.updateProjectionMatrix()

  } catch (err) {
    statsEl.textContent = '❌ ile_wuhu_pistev1.glb introuvable — déposer dans public/assets/models/'
    console.error('[Env01]', err)
  }

  // ── Légende ────────────────────────────────────────────────────────────────
  const legend = document.createElement('div')
  legend.style.cssText = `
    position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
    color:#fff; font-family:monospace; font-size:11px;
    background:rgba(0,0,0,0.65); padding:6px 14px; border-radius:8px;
    pointer-events:none; white-space:nowrap;
  `
  legend.textContent = '[F] caméra libre  |  [G] grille  |  [B] wireframe'
  document.body.appendChild(legend)

  // ── Clavier ────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyG') {
      grid.visible = !grid.visible
    }
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

    frames++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps = frames; frames = 0; lastFpsTime = now
      if (island) {
        const pos = camera.position
        statsEl.textContent = statsEl.textContent!.replace(/FPS.*$/, '')
          + `  |  FPS: ${fps}  |  Cam: (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`
      }
    }

    renderer.render()
  }
  requestAnimationFrame(animate)
}
