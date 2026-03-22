// packages/simulation/src/demos/demo-06-coherent.ts
import * as THREE from 'three'
import { Renderer, getEngineInfo } from '@mii-engine/core'
import { MiiLoader, coherentMiiData } from '@mii-engine/core'
import type { MiiInstance } from '@mii-engine/core'
import { setupFreeCamera } from '../helpers/setupFreeCamera.js'

const MII_COUNT = 5
const SPACING   = 2.5
const MII_SCALE = 0.015

export async function runDemo06(statsEl: HTMLElement): Promise<void> {
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

  // Éclairage
  scene.add(new THREE.AmbientLight(0xffffff, 5.0))
  const key = new THREE.DirectionalLight(0xffffff, 1.0)
  key.position.set(2, 5, 5)
  scene.add(key)

  const camera = renderer.getCamera()
  camera.position.set(0, 1.8, 10)
  camera.lookAt(0, 1.5, 0)

  const freeCamera = setupFreeCamera(renderer)
  renderer.addGround(40, 10)

  const loader = new MiiLoader(scene, {
    shaderType:    'wiiu',
    texResolution: 512,
    scale:         MII_SCALE,
  })

  const loadedMiis: MiiInstance[] = []
  let   isLoading   = false
  let   fps         = 0
  let   frameCount  = 0
  let   lastFpsTime = performance.now()

  // ── UI ─────────────────────────────────────────────────────────────────────
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

  // Boutons cohérents
  panel.appendChild(makeButton(`✅ ${MII_COUNT} Miis cohérents aléatoires`, async () => {
    if (isLoading) return; await clearMiis(); await spawnCoherent('random')
  }))
  panel.appendChild(makeButton(`✅ 👦 ${MII_COUNT} Miis cohérents masculins`, async () => {
    if (isLoading) return; await clearMiis(); await spawnCoherent('masculine')
  }))
  panel.appendChild(makeButton(`✅ 👧 ${MII_COUNT} Miis cohérents féminins`, async () => {
    if (isLoading) return; await clearMiis(); await spawnCoherent('feminine')
  }))

  // Séparateur
  const sep = document.createElement('div')
  sep.style.cssText = `height: 1px; background: rgba(255,255,255,0.2); margin: 4px 0;`
  panel.appendChild(sep)

  // Boutons aléatoires bruts (pour comparaison)
  panel.appendChild(makeButton(`🎲 ${MII_COUNT} Miis aléatoires bruts`, async () => {
    if (isLoading) return; await clearMiis(); await spawnRandom()
  }))

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function placeOnGround(mii: MiiInstance): void {
    mii.group.updateWorldMatrix(true, true)
    const box  = new THREE.Box3().setFromObject(mii.group)
    const minY = box.min.y
    if (minY < 0.01) mii.group.position.y += -minY + 0.01
  }

  async function clearMiis(): Promise<void> {
    for (const mii of loadedMiis) mii.dispose()
    loadedMiis.length = 0
  }

  async function spawnCoherent(style: 'masculine' | 'feminine' | 'random'): Promise<void> {
    isLoading = true
    const offsetX = -((MII_COUNT - 1) / 2) * SPACING
    try {
      for (let i = 0; i < MII_COUNT; i++) {
        statsEl.textContent = `Chargement cohérent ${i + 1}/${MII_COUNT}...`
        const gender = style === 'masculine' ? 0 : style === 'feminine' ? 1 : undefined
        const data = coherentMiiData(gender)
        const mii = await loader.loadFromData(data, {
          x: offsetX + i * SPACING, y: 0, z: 0,
        })
        placeOnGround(mii)
        loadedMiis.push(mii)
      }
    } catch (err) {
      console.error('[demo-06]', err)
      statsEl.textContent = `Erreur : ${String(err)}`
    } finally {
      isLoading = false
    }
  }

  async function spawnRandom(): Promise<void> {
    isLoading = true
    const offsetX = -((MII_COUNT - 1) / 2) * SPACING
    try {
      for (let i = 0; i < MII_COUNT; i++) {
        statsEl.textContent = `Chargement aléatoire ${i + 1}/${MII_COUNT}...`
        const mii = await loader.loadRandom({
          x: offsetX + i * SPACING, y: 0, z: 0,
        })
        placeOnGround(mii)
        loadedMiis.push(mii)
      }
    } catch (err) {
      console.error('[demo-06]', err)
      statsEl.textContent = `Erreur : ${String(err)}`
    } finally {
      isLoading = false
    }
  }

  // ── Boucle d'animation ──────────────────────────────────────────────────────
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
        `FPS: ${fps} | Miis: ${loadedMiis.length} | FreeCam: ${freeCamera.isEnabled() ? 'ON' : 'OFF'}`
    }

    renderer.render()
  }

  requestAnimationFrame(animate)
}