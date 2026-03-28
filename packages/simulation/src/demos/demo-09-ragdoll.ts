/**
 * Demo 09 — Mii Ragdoll : physique RAPIER + visuel GLB + tête FFL
 *
 * Démontre :
 *  - MiiSkeleton : squelette RAPIER dont les dimensions viennent du GLB Mii chargé
 *  - MiiRagdoll  : synchronise le visuel Mii (corps GLB + tête FFL) sur la physique
 *  - La tête FFL suit la rotation du segment "head" (pas juste la position)
 *  - Touches : [Espace] pousser le Mii, [D] toggle debug capsules, [R] reset
 */

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  Clock, PhysicsWorld, Renderer,
  MiiLoader, MiiSkeleton, MiiRagdoll,
  coherentMiiData,
  getEngineInfo,
} from '@mii-engine/core'
import { setupFreeCamera } from '../helpers/setupFreeCamera.js'

const MII_SCALE = 0.155

export async function runDemo09(statsEl: HTMLElement): Promise<void> {
  console.log(getEngineInfo())

  // ── Renderer ─────────────────────────────────────────────────────────────────
  const renderer = new Renderer({
    width:  window.innerWidth,
    height: window.innerHeight,
  })
  document.body.appendChild(renderer.getDomElement())
  window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight))

  const scene      = renderer.getScene()
  const domElement = renderer.getDomElement()
  const freeCamera = setupFreeCamera(renderer)

  // ── IBL ──────────────────────────────────────────────────────────────────────
  const ctx = domElement.getContext('webgl2') ?? domElement.getContext('webgl')
  const internalRenderer = new THREE.WebGLRenderer({ canvas: domElement, context: ctx as WebGLRenderingContext })
  const pmrem   = new THREE.PMREMGenerator(internalRenderer)
  const roomEnv = new RoomEnvironment()
  scene.environment = pmrem.fromScene(roomEnv, 0.25).texture
  roomEnv.dispose()
  pmrem.dispose()

  // ── Sol + caméra ──────────────────────────────────────────────────────────────
  renderer.addGround(40, 20)

  const camera = renderer.getCamera()
  camera.position.set(0, 2, 6)
  camera.lookAt(0, 1, 0)

  // ── Physique ──────────────────────────────────────────────────────────────────
  const world = await PhysicsWorld.create()
  const clock = new Clock({ fixedStep: 1 / 60, maxStepsPerFrame: 10 })

  world.createGround(200, 10)

  // ── Mii data ──────────────────────────────────────────────────────────────────
  const data = coherentMiiData(undefined, '09')

  // ── Mii visuel (tête FFL + corps GLB) ────────────────────────────────────────
  statsEl.textContent = 'Chargement du Mii…'

  const loader = new MiiLoader(scene, {
    modelsBasePath: '/assets/models',
    bodyStyle:      'wiiu',
    texResolution:  512,
    scale:          MII_SCALE,
  })
  const mii = await loader.load(data)

  mii.setPosition(0, 0, 0)
  mii.placeOnGround()

  // ── Squelette physique Mii-spécifique ─────────────────────────────────────────
  // Les dimensions des capsules sont dérivées des bones réels du GLB chargé
  const skeleton = MiiSkeleton.createFromMii(world.getRapierWorld(), mii)

  // ── Ragdoll — connecte physique + visuel ──────────────────────────────────────
  const ragdoll = new MiiRagdoll(skeleton, mii)

  // Masquer les capsules de debug par défaut
  let debugVisible = false
  // (capsules non ajoutées à la scène au départ)

  // ── Controls ──────────────────────────────────────────────────────────────────
  // Impulsion calibrée pour la masse physique du ragdoll Mii (~scale 0.155)
  // Une valeur trop élevée dépasse la capacité du solveur (4→12 itérations) et
  // casse les contraintes de joint → segments projetés dans tous les sens.
  const PUSH_IMPULSE = 18

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      // Active la gravité + pousse le Mii
      skeleton.enableGravity()
      const hipSeg = skeleton.getSegment('hip')
      if (hipSeg) hipSeg.body.applyImpulse({ x: 0, y: 4, z: -PUSH_IMPULSE }, true)
    }
    if (e.code === 'KeyD') {
      debugVisible = !debugVisible
      if (debugVisible) ragdoll.showPhysicsMeshes(scene)
      else              ragdoll.hidePhysicsMeshes(scene)
    }
    if (e.code === 'KeyR') {
      window.location.reload()
    }
  })

  // ── Labels ────────────────────────────────────────────────────────────────────
  const info = document.createElement('div')
  info.style.cssText = `
    position: absolute; bottom: 20px; left: 50%;
    transform: translateX(-50%);
    color: #fff; font-family: monospace; font-size: 12px;
    background: rgba(0,0,0,0.7); padding: 8px 16px; border-radius: 8px;
    text-align: center; pointer-events: none;
  `
  info.innerHTML = `[Espace] pousser &nbsp;|&nbsp; [D] debug capsules &nbsp;|&nbsp; [R] reset &nbsp;|&nbsp; [F] caméra libre`
  document.body.appendChild(info)

  statsEl.textContent = ''

  // ── Boucle ────────────────────────────────────────────────────────────────────
  clock.start()
  let fps = 0, frames = 0, lastFpsTime = performance.now()

  function animate(nowMs: number) {
    requestAnimationFrame(animate)
    freeCamera.update(1 / 60)

    clock.tick(nowMs, (dt) => { world.step(dt) })

    // Sync capsules de debug (si visibles)
    if (debugVisible) skeleton.syncMeshes()

    // Sync le visuel Mii sur la physique
    ragdoll.syncVisual()

    const com = skeleton.getCenterOfMass()
    frames++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) { fps = frames; frames = 0; lastFpsTime = now }

    statsEl.textContent =
      `FPS: ${fps} | Centre de masse: y=${com.y.toFixed(2)} | Debout: ${skeleton.isUpright(0.5) ? 'oui' : 'non'}`

    renderer.render()
  }

  requestAnimationFrame(animate)
}
