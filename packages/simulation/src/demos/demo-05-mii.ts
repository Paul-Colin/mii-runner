// packages/simulation/src/demos/demo-05-mii.ts
import * as THREE from 'three'
import { Renderer, getEngineInfo } from '@mii-engine/core'
import { MiiHeadLoader } from '@mii-engine/core'
import type { MiiInstance } from '@mii-engine/core'
import { setupFreeCamera } from '../helpers/setupFreeCamera.js'

const MII_COUNT = 5
const SPACING   = 2.5
const MII_SCALE = 0.015

export async function runDemo05(statsEl: HTMLElement): Promise<void> {
  console.log(getEngineInfo())

  const renderer = new Renderer({
    width:  window.innerWidth,
    height: window.innerHeight,
  })
  document.body.appendChild(renderer.getDomElement())

  window.addEventListener('resize', () => {
    renderer.resize(window.innerWidth, window.innerHeight)
  })

  const scene = renderer.getScene()

  // ── Lumières ───────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 5.0))


  // const frontLight = new THREE.DirectionalLight(0xffffff, 2.5)
  // frontLight.position.set(0, 4, 8)
  // scene.add(frontLight)

  const fillLight = new THREE.DirectionalLight(0xaaccff, 1.0)
  fillLight.position.set(-6, 3, 4)
  scene.add(fillLight)

  // ── Caméra ─────────────────────────────────────────────────────────────────
  const camera = renderer.getCamera()
  camera.position.set(0, 1.8, 10)
  camera.lookAt(0, 1.5, 0)

  const freeCamera = setupFreeCamera(renderer)

  renderer.addGround(40, 10)

  const loader = new MiiHeadLoader(scene, {
    shaderType:    'wiiu',
    texResolution: 512,
    scale:         MII_SCALE,
  })

  // ── État ───────────────────────────────────────────────────────────────────
  const loadedMiis: MiiInstance[] = []
  let   isLoading   = false
  let   fps         = 0
  let   frameCount  = 0
  let   lastFpsTime = performance.now()

  // ── Panneau UI ─────────────────────────────────────────────────────────────
  const panel = document.createElement('div')
  panel.style.cssText = `
    position: absolute; top: 60px; left: 12px;
    display: flex; flex-direction: column; gap: 8px;
  `
  document.body.appendChild(panel)

  function makeButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText = `
      padding: 8px 14px; font-family: monospace; font-size: 12px;
      background: rgba(255,255,255,0.1); color: #fff;
      border: 1px solid rgba(255,255,255,0.3); border-radius: 6px;
      cursor: pointer; text-align: left;
    `
    btn.addEventListener('click', onClick)
    return btn
  }

  panel.appendChild(makeButton(`🎲 Charger ${MII_COUNT} Miis aléatoires`, async () => {
    if (isLoading) return
    await clearMiis()
    await spawnMiis('random')
  }))

  panel.appendChild(makeButton(`👦 Charger ${MII_COUNT} Miis masculins`, async () => {
    if (isLoading) return
    await clearMiis()
    await spawnMiis('masculine')
  }))

  panel.appendChild(makeButton(`👧 Charger ${MII_COUNT} Miis féminins`, async () => {
    if (isLoading) return
    await clearMiis()
    await spawnMiis('feminine')
  }))

  panel.appendChild(makeButton('🔄 Recharger le 1er depuis JSON', async () => {
    if (isLoading || loadedMiis.length === 0) return
    const savedData = loadedMiis[0]!.toJSON()
    loadedMiis[0]!.dispose()
    isLoading = true
    try {
      const x = -((MII_COUNT - 1) / 2) * SPACING
      const reloaded = await loader.loadFromData(savedData, { x, y: 0, z: 0 })
      placeOnGround(reloaded)
      reloaded.setRotationY(Math.PI)
      loadedMiis[0] = reloaded
    } catch (err) {
      console.error('[demo-05] Erreur rechargement :', err)
    } finally {
      isLoading = false
    }
  }))

  panel.appendChild(makeButton('📋 Log hex du 1er Mii', () => {
    if (loadedMiis.length === 0) return
    const hex = loadedMiis[0]!.hex
    console.log('[demo-05] Hex FFSD :', hex)
    navigator.clipboard?.writeText(hex).catch(() => {})
    statsEl.textContent = `Hex copié ! (${hex.length} chars)`
  }))

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Place la tête du Mii au-dessus du sol (Y=0) */
  function placeOnGround(mii: MiiInstance): void {
    mii.group.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(mii.group)
    const minY = box.min.y
    if (minY < 0.01) {
      mii.group.position.y += -minY + 0.01
    }
  }

  async function clearMiis(): Promise<void> {
    for (const mii of loadedMiis) mii.dispose()
    loadedMiis.length = 0
  }

  async function spawnMiis(style: 'masculine' | 'feminine' | 'random'): Promise<void> {
    isLoading = true
    const offsetX = -((MII_COUNT - 1) / 2) * SPACING

    try {
      for (let i = 0; i < MII_COUNT; i++) {
        statsEl.textContent = `Chargement ${i + 1}/${MII_COUNT}...`
        const mii = await loader.loadCoherent(style, {
          x: offsetX + i * SPACING,
          y: 0,
          z: 0,
        })
        placeOnGround(mii)
        mii.setRotationY(Math.PI)
        loadedMiis.push(mii)
      }
    } catch (err) {
      console.error('[demo-05] Erreur :', err)
      statsEl.textContent = `Erreur : ${String(err)}`
    } finally {
      isLoading = false
    }
  }

  // ── Boucle d'animation ─────────────────────────────────────────────────────
  let lastTime = performance.now()

  function animate(nowMs: number): void {
    requestAnimationFrame(animate)

    const dt = Math.min((nowMs - lastTime) / 1000, 0.05)
    lastTime = nowMs

    freeCamera.update(dt)

    for (let i = 0; i < loadedMiis.length; i++) {
      loadedMiis[i]!.group.rotation.y = Math.sin(nowMs / 2000 + i * 0.8) * 0.25

    }

    frameCount++
    if (performance.now() - lastFpsTime >= 1000) {
      fps = frameCount; frameCount = 0; lastFpsTime = performance.now()
    }

    if (!isLoading) {
      statsEl.textContent =
        `FPS: ${fps} | Miis chargés: ${loadedMiis.length} | FreeCam: ${freeCamera.isEnabled() ? 'ON' : 'OFF'}`
    }

    renderer.render()
  }

  requestAnimationFrame(animate)
}