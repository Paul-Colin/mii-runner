/**
 * Demo 10 — MiiMuscles : test interactif des articulations
 *
 * Interface à sliders pour piloter chaque muscle du MiiRagdoll.
 * Simule exactement ce que fera le réseau de neurones : les valeurs [-1, 1]
 * des sliders sont les "sorties NN" appliquées à configureMotorPosition().
 *
 * Contrôles :
 *   Sliders        — valeur normalisée [-1, 1] → angle cible de l'articulation
 *   [Espace]       — activer/désactiver la gravité
 *   [R]            — réinitialiser tous les sliders à 0
 *   [D]            — afficher/masquer les capsules de debug
 */

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  Clock, PhysicsWorld, Renderer,
  MiiLoader, MiiSkeleton, MiiRagdoll, MiiMuscles,
  coherentMiiData, getEngineInfo,
} from '@mii-engine/core'
import { setupFreeCamera } from '../helpers/setupFreeCamera.js'

const MII_SCALE = 0.155

export async function runDemo10(statsEl: HTMLElement): Promise<void> {
  console.log(getEngineInfo())

  // ── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new Renderer({ width: window.innerWidth, height: window.innerHeight })
  document.body.appendChild(renderer.getDomElement())
  window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight))

  const scene      = renderer.getScene()
  const domElement = renderer.getDomElement()
  const freeCamera = setupFreeCamera(renderer)

  // ── IBL ──────────────────────────────────────────────────────────────────
  const ctx = domElement.getContext('webgl2') ?? domElement.getContext('webgl')
  const internalRenderer = new THREE.WebGLRenderer({ canvas: domElement, context: ctx as WebGLRenderingContext })
  const pmrem   = new THREE.PMREMGenerator(internalRenderer)
  const roomEnv = new RoomEnvironment()
  scene.environment = pmrem.fromScene(roomEnv, 0.25).texture
  roomEnv.dispose()
  pmrem.dispose()

  // ── Sol + caméra ──────────────────────────────────────────────────────────
  renderer.addGround(40, 20)
  const camera = renderer.getCamera()
  camera.position.set(0, 1.5, 5)
  camera.lookAt(0, 1, 0)

  // ── Physique ──────────────────────────────────────────────────────────────
  const world = await PhysicsWorld.create()
  const clock = new Clock({ fixedStep: 1 / 60, maxStepsPerFrame: 10 })
  world.createGround(200, 10)

  // ── Mii ───────────────────────────────────────────────────────────────────
  statsEl.textContent = 'Chargement du Mii…'
  const loader = new MiiLoader(scene, {
    modelsBasePath: '/assets/models',
    bodyStyle:      'wiiu',
    texResolution:  512,
    scale:          MII_SCALE,
  })
  const mii = await loader.load(coherentMiiData(undefined, '10'))
  mii.setPosition(0, 0, 0)
  mii.placeOnGround()

  // ── Squelette + ragdoll + muscles ─────────────────────────────────────────
  const skeleton = MiiSkeleton.createFromMii(world.getRapierWorld(), mii)
  const ragdoll  = new MiiRagdoll(skeleton, mii)
  const muscles  = new MiiMuscles(skeleton)

  let debugVisible = false
  let gravityOn    = false

  // ── Panneau de contrôle ───────────────────────────────────────────────────
  type SliderEntry = { slider: HTMLInputElement; label: HTMLSpanElement; muscleName: string }
  const sliderEntries: SliderEntry[] = []

  const panel = buildPanel(muscles, () => {
    // callback : reset tous les sliders à 0
    muscles.resetTargets()
    rebuildSliderValues()
  })
  document.body.appendChild(panel)

  // ── Légende ───────────────────────────────────────────────────────────────
  const legend = document.createElement('div')
  legend.style.cssText = `
    position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
    color:#fff; font-family:monospace; font-size:11px;
    background:rgba(0,0,0,0.65); padding:6px 14px; border-radius:8px;
    pointer-events:none; white-space:nowrap;
  `
  legend.textContent = '[Espace] gravité  |  [R] reset  |  [D] debug  |  [F] caméra'
  document.body.appendChild(legend)
  statsEl.textContent = ''

  // ── Clavier ───────────────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      gravityOn = !gravityOn
      skeleton.enableGravity(gravityOn ? 1 : 0)
    }
    if (e.code === 'KeyR') {
      muscles.resetTargets()
      rebuildSliderValues()
    }
    if (e.code === 'KeyD') {
      debugVisible = !debugVisible
      if (debugVisible) ragdoll.showPhysicsMeshes(scene)
      else              ragdoll.hidePhysicsMeshes(scene)
    }
  })

  // ── Boucle ────────────────────────────────────────────────────────────────
  clock.start()
  let fps = 0, frames = 0, lastFpsTime = performance.now()

  function animate(nowMs: number) {
    requestAnimationFrame(animate)
    freeCamera.update(1 / 60)

    clock.tick(nowMs, (dt) => { world.step(dt) })

    if (debugVisible) skeleton.syncMeshes()
    ragdoll.syncVisual()

    const com = skeleton.getCenterOfMass()
    frames++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) { fps = frames; frames = 0; lastFpsTime = now }

    statsEl.textContent =
      `FPS: ${fps}  |  CoM y: ${com.y.toFixed(2)}  |  Gravité: ${gravityOn ? '✓' : '✗'}`

    renderer.render()
  }
  requestAnimationFrame(animate)

  // ─────────────────────────────────────────────────────────────────────────
  // Construction du panneau UI
  // ─────────────────────────────────────────────────────────────────────────

  function rebuildSliderValues() {
    for (const { slider, label, muscleName } of sliderEntries) {
      const t = muscles.getTarget(muscleName)
      slider.value = String(t)
      label.textContent = fmtAngle(muscles.getTargetDeg(muscleName))
    }
  }

  function buildPanel(m: MiiMuscles, onReset: () => void): HTMLDivElement {
    const wrap = document.createElement('div')
    wrap.style.cssText = `
      position:absolute; top:10px; right:10px;
      width:260px; max-height:calc(100vh - 20px);
      overflow-y:auto; overflow-x:hidden;
      background:rgba(0,0,0,0.75); border-radius:10px;
      padding:10px; box-sizing:border-box;
      font-family:monospace; color:#fff; font-size:11px;
    `

    const groups: Array<{ title: string; muscles: string[] }> = [
      { title: 'Tronc',           muscles: ['spine'] },
      { title: 'Hanche G',        muscles: ['hip_l_flex', 'hip_l_abduct'] },
      { title: 'Hanche D',        muscles: ['hip_r_flex', 'hip_r_abduct'] },
      { title: 'Genou / Cheville G', muscles: ['knee_l', 'ankle_l'] },
      { title: 'Genou / Cheville D', muscles: ['knee_r', 'ankle_r'] },
      { title: 'Coudes',          muscles: ['elbow_l', 'elbow_r'] },
    ]

    for (const group of groups) {
      const section = document.createElement('div')
      section.style.marginBottom = '8px'

      const title = document.createElement('div')
      title.textContent = group.title
      title.style.cssText = 'font-weight:bold; color:#adf; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:2px;'
      section.appendChild(title)

      for (const name of group.muscles) {
        const limits = m.getLimitsDeg(name)
        if (!limits) continue

        const row = document.createElement('div')
        row.style.cssText = 'display:grid; grid-template-columns:110px 1fr 38px; align-items:center; gap:4px; margin-bottom:3px;'

        // Nom du muscle
        const nameEl = document.createElement('span')
        nameEl.textContent = name.replace(/_/g, ' ')
        nameEl.style.overflow = 'hidden'
        nameEl.title = `[${limits.min.toFixed(0)}°, ${limits.max.toFixed(0)}°]`
        nameEl.style.color = '#ccc'

        // Slider [-1, 1] en 200 pas
        const slider = document.createElement('input')
        slider.type  = 'range'
        slider.min   = '-1'
        slider.max   = '1'
        slider.step  = '0.01'
        slider.value = String(m.getTarget(name))
        slider.style.cssText = 'width:100%; cursor:pointer; accent-color:#4af;'

        // Affichage angle cible
        const angleLabel = document.createElement('span')
        angleLabel.style.cssText = 'text-align:right; color:#fa4; font-size:10px;'
        angleLabel.textContent = fmtAngle(m.getTargetDeg(name))

        slider.addEventListener('input', () => {
          const val = parseFloat(slider.value)
          m.setTarget(name, val)
          angleLabel.textContent = fmtAngle(m.getTargetDeg(name))
        })

        row.appendChild(nameEl)
        row.appendChild(slider)
        row.appendChild(angleLabel)
        section.appendChild(row)
        sliderEntries.push({ slider, label: angleLabel, muscleName: name })
      }

      wrap.appendChild(section)
    }

    // Bouton reset
    const resetBtn = document.createElement('button')
    resetBtn.textContent = '↺ Reset (R)'
    resetBtn.style.cssText = `
      width:100%; margin-top:6px; padding:6px;
      background:rgba(255,255,255,0.1); color:#fff;
      border:1px solid rgba(255,255,255,0.3); border-radius:6px;
      cursor:pointer; font-family:monospace; font-size:11px;
    `
    resetBtn.addEventListener('click', onReset)
    wrap.appendChild(resetBtn)

    return wrap
  }
}

function fmtAngle(deg: number): string {
  return (deg >= 0 ? '+' : '') + deg.toFixed(1) + '°'
}
