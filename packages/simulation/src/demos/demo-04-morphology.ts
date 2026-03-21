import * as THREE from 'three'
import { Clock, PhysicsWorld, Renderer, Skeleton, getEngineInfo, validateMorphology, getArchetype } from '@mii-engine/core'
import { setupFreeCamera } from '../helpers/setupFreeCamera.js'

export async function runDemo04(statsEl: HTMLElement): Promise<void> {
  console.log(getEngineInfo())

  const renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  document.body.appendChild(renderer.getDomElement())

  window.addEventListener('resize', () => {
    renderer.resize(window.innerWidth, window.innerHeight)
  })

  const world = await PhysicsWorld.create()
  const clock = new Clock({ fixedStep: 1 / 60, maxStepsPerFrame: 10 })

  renderer.addGround(400, 20)
  world.createGround(200, 10)

  const camera = renderer.getCamera()
  camera.position.set(0, 3, 12)
  camera.lookAt(0, 1.5, 0)

  const freeCamera = setupFreeCamera(renderer)

  const morphologies = [
    { height: 1.50, weight: 45, muscle: 0.6,  x: -5 },
    { height: 1.75, weight: 75, muscle: 1.0,  x:  0 },
    { height: 1.95, weight: 110, muscle: 1.8, x:  5 },
  ]

  const skeletons: Skeleton[] = []
  const labels: HTMLElement[] = []

  for (const morph of morphologies) {
    const cfg = validateMorphology({
      height: morph.height,
      weight: morph.weight,
      muscle: morph.muscle,
    })

    const skeleton = new Skeleton(world.getRapierWorld(), {
      height: cfg.height,
      weight: cfg.weight,
      muscle: cfg.muscle,
      position: { x: morph.x, y: cfg.height * 1.2, z: 0 },
    })
    skeleton.addToScene(renderer.getScene())
    skeletons.push(skeleton)

    const label = document.createElement('div')
    label.style.cssText = `
      position: absolute;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      background: rgba(0,0,0,0.6);
      padding: 6px 10px;
      border-radius: 6px;
      pointer-events: none;
      text-align: center;
      line-height: 1.6;
    `
    label.innerHTML = `
      <b>${getArchetype(cfg)}</b><br>
      T: ${cfg.height.toFixed(2)}m &nbsp;
      P: ${cfg.weight.toFixed(0)}kg &nbsp;
      M: ${cfg.muscle.toFixed(1)}<br>
      E_max: ${cfg.eMax.toFixed(0)}
    `
    document.body.appendChild(label)
    labels.push(label)
  }

  clock.start()

  let frameCount = 0
  let lastFpsTime = performance.now()
  let fps = 0

  const canvas = renderer.getDomElement()

  function worldToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const projected = pos.clone().project(renderer.getCamera())
    return {
      x: ( projected.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight,
    }
  }

  function animate(nowMs: number) {
    requestAnimationFrame(animate)

    clock.tick(nowMs, (dt) => {
      freeCamera.update(dt)
      world.step(dt)
    })

    for (let i = 0; i < skeletons.length; i++) {
      const skeleton = skeletons[i]!
      skeleton.syncMeshes()

      const hip = skeleton.getSegment('hip')
      if (hip && !freeCamera.isEnabled()) {
        const pos = hip.getPosition()
        const worldPos = new THREE.Vector3(pos.x, pos.y + 1.2, pos.z)
        const screen = worldToScreen(worldPos)
        const label = labels[i]!
        label.style.left    = `${screen.x - 80}px`
        label.style.top     = `${screen.y - 20}px`
        label.style.display = 'block'
      } else {
        labels[i]!.style.display = 'none'
      }
    }

    frameCount++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps = frameCount
      frameCount = 0
      lastFpsTime = now
    }

    statsEl.textContent = `FPS: ${fps} | ${skeletons.length} personnages | FreeCam: ${freeCamera.isEnabled() ? 'ON' : 'OFF'}`
    renderer.render()
  }

  requestAnimationFrame(animate)
}
