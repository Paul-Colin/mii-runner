/**
 * Demo 08 — Palette de couleurs étendue Switch
 *
 * Démontre :
 *  - coherentMiiData(gender, suffix, customColors=true)
 *    → favoriteColorHex tiré de SWITCH_BODY_COLORS (100 hex) pour le corps
 *    → customHairHex    tiré de SWITCH_BODY_COLORS pour la couleur des cheveux
 *  - Corpulence aléatoire (height + build aléatoires dans toute la plage FFSD)
 *  - 8 Miis côte à côte, genre aléatoire
 *  - Bouton "Renouveler" pour régénérer tout
 */

import * as THREE from 'three'
import { RoomEnvironment }  from 'three/addons/environments/RoomEnvironment.js'
import { Renderer, getEngineInfo } from '@mii-engine/core'
import { MiiLoader }        from '@mii-engine/core'
import { coherentMiiData }  from '@mii-engine/core'
import type { MiiInstance } from '@mii-engine/core'
import { setupFreeCamera }  from '../helpers/setupFreeCamera.js'

// ─── Configuration ────────────────────────────────────────────────────────────

const MII_COUNT  = 8
const MII_SCALE  = 0.13
const MII_SPREAD = 3.2   // espacement en unités monde

// ─── Demo ─────────────────────────────────────────────────────────────────────

export async function runDemo08(statsEl: HTMLElement): Promise<void> {
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

  // ── IBL ──────────────────────────────────────────────────────────────────
  const ctx = domElement.getContext('webgl2') ?? domElement.getContext('webgl')
  const internalRenderer = new THREE.WebGLRenderer({ canvas: domElement, context: ctx as WebGLRenderingContext })
  const pmrem   = new THREE.PMREMGenerator(internalRenderer)
  const roomEnv = new RoomEnvironment()
  scene.environment = pmrem.fromScene(roomEnv, 0.25).texture
  roomEnv.dispose()
  pmrem.dispose()

  // ── Scène ─────────────────────────────────────────────────────────────────
  renderer.addGround(MII_COUNT * MII_SPREAD + 6, 20)

  const camera = renderer.getCamera()
  const totalWidth = (MII_COUNT - 1) * MII_SPREAD
  camera.position.set(0, 3, 18)
  camera.lookAt(0, 2, 0)

  // ── Loader ────────────────────────────────────────────────────────────────
  const loader = new MiiLoader(scene, {
    modelsBasePath: '/assets/models',
    bodyStyle:      'wiiu',
    texResolution:  512,
    scale:          MII_SCALE,
  })

  // ── Génération ────────────────────────────────────────────────────────────
  const miis:   MiiInstance[]   = []
  const labels: HTMLElement[]   = []

  async function loadAll(): Promise<void> {
    statsEl.textContent = 'Chargement…'

    const promises = Array.from({ length: MII_COUNT }, async (_, i) => {
      const gender = Math.random() < 0.5 ? 0 : 1
      // customColors=true → favoriteColorHex + customHairHex + customGlassesHex aléatoires
      const data = coherentMiiData(gender, String(i + 1), true)
      // Forcer des lunettes sur les Miis pairs pour tester customGlassesHex
      if (i % 2 === 0 && data.glassesType === 0) {
        data.glassesType = Math.floor(Math.random() * 8) + 1
        data.customGlassesHex = data.customGlassesHex ?? data.favoriteColorHex
      }
      // height et build entièrement aléatoires (déjà fait par coherentMiiData)

      const mii = await loader.load(data)
      const x   = -totalWidth / 2 + i * MII_SPREAD
      mii.setPosition(x, 0, 0)
      mii.placeOnGround()
      return mii
    })

    const loaded = await Promise.all(promises)
    miis.push(...loaded)
    statsEl.textContent = ''
  }

  await loadAll()

  // ── Helper label ──────────────────────────────────────────────────────────
  function swatch(hex: string | null): string {
    if (!hex) return ''
    return `<span style="display:inline-block;width:10px;height:10px;background:${hex};border:1px solid #fff;vertical-align:middle;margin-left:4px"></span>`
  }

  function buildLabel(d: typeof miis[0]['data']): string {
    return `
      <b>${d.miiName}</b> ${d.gender === 0 ? '♂' : '♀'}<br>
      h=${d.height} b=${d.build}<br>
      ${swatch(d.favoriteColorHex)} corps
      ${swatch(d.customHairHex)} cheveux
      ${d.customEyeHex     ? swatch(d.customEyeHex)     + ' yeux'    : ''}
      ${d.customGlassesHex ? swatch(d.customGlassesHex) + ' lunettes' : ''}
    `
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  for (let i = 0; i < MII_COUNT; i++) {
    const d     = miis[i]!.data
    const label = document.createElement('div')
    label.style.cssText = `
      position: absolute;
      color: #fff;
      font-family: monospace;
      font-size: 10px;
      background: rgba(0,0,0,0.65);
      padding: 4px 8px;
      border-radius: 5px;
      pointer-events: none;
      text-align: center;
      line-height: 1.6;
      white-space: nowrap;
    `
    label.innerHTML = buildLabel(d)
    document.body.appendChild(label)
    labels.push(label)
  }

  // ── Bouton renouveler ─────────────────────────────────────────────────────
  const btn = document.createElement('button')
  btn.textContent = '🎲 Nouveaux Miis'
  btn.style.cssText = `
    position: absolute; bottom: 20px; left: 50%;
    transform: translateX(-50%);
    padding: 10px 22px; font-family: monospace; font-size: 13px;
    background: rgba(68,136,255,0.85); color: #fff;
    border: none; border-radius: 8px; cursor: pointer;
  `
  document.body.appendChild(btn)

  let reloading = false
  btn.addEventListener('click', async () => {
    if (reloading) return
    reloading = true
    btn.textContent = '⏳ Chargement…'

    for (const mii of miis) mii.dispose(scene)
    miis.length = 0

    await loadAll()

    for (let i = 0; i < labels.length; i++) {
      const d = miis[i]?.data
      if (!d || !labels[i]) continue
      labels[i]!.innerHTML = buildLabel(d)
    }

    btn.textContent = '🎲 Nouveaux Miis'
    reloading = false
  })

  // ── Boucle de rendu ───────────────────────────────────────────────────────
  let fps = 0, frames = 0, lastFpsTime = performance.now()

  function worldToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const proj = pos.clone().project(camera)
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

      if (labels[i] && !freeCamera.isEnabled()) {
        const pos   = miis[i]!.root.position
        const headY = pos.y + (miis[i]!.data.height / 127) * 2.0 + 0.5
        const sc    = worldToScreen(new THREE.Vector3(pos.x, headY, pos.z))
        labels[i]!.style.left    = `${sc.x - 75}px`
        labels[i]!.style.top     = `${sc.y - 10}px`
        labels[i]!.style.display = 'block'
      } else if (labels[i]) {
        labels[i]!.style.display = 'none'
      }
    }

    frames++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) { fps = frames; frames = 0; lastFpsTime = now }

    statsEl.textContent =
      `FPS: ${fps} | ${miis.length} Miis | palette Switch | FreeCam: ${freeCamera.isEnabled() ? 'ON' : 'OFF'}`

    renderer.render()
  }

  animate()
}
