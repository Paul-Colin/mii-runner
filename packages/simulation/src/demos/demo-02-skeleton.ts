import { Clock, PhysicsWorld, Renderer, Skeleton, getEngineInfo } from '@mii-engine/core'

export async function runDemo02(statsEl: HTMLElement): Promise<void> {
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
  camera.position.set(0, 3, 8)
  camera.lookAt(0, 1, 0)

  const skeleton = new Skeleton(world.getRapierWorld(), {
    height: 1.75,
    weight: 70,
    muscle: 1.0,
  })
  skeleton.addToScene(renderer.getScene())

  clock.start()

  let frameCount = 0
  let lastFpsTime = performance.now()
  let fps = 0

  function animate(nowMs: number) {
    requestAnimationFrame(animate)
    clock.tick(nowMs, (dt) => { world.step(dt) })
    skeleton.syncMeshes()

    const com = skeleton.getCenterOfMass()
    const upright = skeleton.isUpright(0.3)

    frameCount++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps = frameCount
      frameCount = 0
      lastFpsTime = now
    }

    statsEl.textContent =
      `FPS: ${fps} | Steps: ${clock.getStepCount()} | ` +
      `Centre de masse: y=${com.y.toFixed(2)} | ` +
      `Debout: ${upright ? 'oui' : 'non'}`

    renderer.render()
  }

  requestAnimationFrame(animate)
}
