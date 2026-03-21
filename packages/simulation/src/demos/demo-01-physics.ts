import * as THREE from 'three'
import { Clock, PhysicsWorld, Renderer, getEngineInfo } from '@mii-engine/core'

export async function runDemo01(statsEl: HTMLElement): Promise<void> {
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

  const balls: Array<{ body: ReturnType<typeof world.createDynamicBall>; mesh: THREE.Mesh }> = []

  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 3
    const y = 5 + i * 2
    const radius = 0.4 + Math.random() * 0.3
    const color = new THREE.Color().setHSL(i / 5, 0.8, 0.6)

    const body = world.createDynamicBall({ x, y, z: 0 }, radius, 1)
    const geo = new THREE.SphereGeometry(radius, 16, 16)
    const mat = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    renderer.addMesh(mesh)
    balls.push({ body, mesh })
  }

  clock.start()

  let frameCount = 0
  let lastFpsTime = performance.now()
  let fps = 0

  function animate(nowMs: number) {
    requestAnimationFrame(animate)
    clock.tick(nowMs, (dt) => { world.step(dt) })

    for (const { body, mesh } of balls) {
      const pos = body.translation()
      mesh.position.set(pos.x, pos.y, pos.z)
      const rot = body.rotation()
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    }

    frameCount++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps = frameCount
      frameCount = 0
      lastFpsTime = now
    }

    statsEl.textContent = `FPS: ${fps} | Steps: ${clock.getStepCount()} | Balles: ${balls.length}`
    renderer.render()
  }

  requestAnimationFrame(animate)
}
