import { Clock, PhysicsWorld, Renderer, Skeleton, MuscleSystem, getEngineInfo } from '@mii-engine/core'

export async function runDemo03(statsEl: HTMLElement): Promise<void> {
  console.log(getEngineInfo())

  const renderer = new Renderer({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  document.body.appendChild(renderer.getDomElement())

  window.addEventListener('resize', () => {
    renderer.resize(window.innerWidth, window.innerHeight)
  })

  const world = await PhysicsWorld.create({ gravity: { x: 0, y: 0, z: 0 } })
  const clock = new Clock({ fixedStep: 1 / 60, maxStepsPerFrame: 10 })

  world.createGround(200, 10)

  const camera = renderer.getCamera()
  camera.position.set(0, 2, 6)
  camera.lookAt(0, 1, 0)

  const skeleton = new Skeleton(world.getRapierWorld(), {
    height: 1.75,
    weight: 70,
    muscle: 1.0,
  })
  skeleton.addToScene(renderer.getScene())

  const muscles = new MuscleSystem(skeleton, { weight: 70, muscle: 1.0 })

  const activeButtons = new Set<string>()

  const muscleNames = muscles.getMuscleNames()

  const panel = document.createElement('div')
  panel.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    max-width: 900px;
    padding: 12px;
    background: rgba(0,0,0,0.6);
    border-radius: 10px;
  `
  document.body.appendChild(panel)

  for (const name of muscleNames) {
    const btn = document.createElement('button')
    btn.textContent = name.replace(/_/g, ' ')
    btn.style.cssText = `
      padding: 8px 12px;
      font-family: monospace;
      font-size: 11px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      cursor: pointer;
      user-select: none;
      transition: background 0.1s;
    `

    const activate = () => {
      activeButtons.add(name)
      btn.style.background = 'rgba(68, 136, 255, 0.7)'
      btn.style.borderColor = '#4488ff'
    }

    const deactivate = () => {
      activeButtons.delete(name)
      btn.style.background = 'rgba(255,255,255,0.1)'
      btn.style.borderColor = 'rgba(255,255,255,0.3)'
    }

    btn.addEventListener('mousedown',   activate)
    btn.addEventListener('mouseup',     deactivate)
    btn.addEventListener('mouseleave',  deactivate)
    btn.addEventListener('touchstart',  (e) => { e.preventDefault(); activate() })
    btn.addEventListener('touchend',    deactivate)

    panel.appendChild(btn)
  }

  clock.start()

  let frameCount = 0
  let lastFpsTime = performance.now()
  let fps = 0

  function animate(nowMs: number) {
    requestAnimationFrame(animate)

    clock.tick(nowMs, (dt) => {
      for (const name of muscleNames) {
        muscles.setActivation(name, activeButtons.has(name) ? 1.0 : 0.0)
      }
      muscles.update(dt)
      world.step(dt)
    })

    skeleton.syncMeshes()

    frameCount++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fps = frameCount
      frameCount = 0
      lastFpsTime = now
    }

    const energy  = muscles.getEnergyRatio()
    const active  = activeButtons.size

    statsEl.textContent =
      `FPS: ${fps} | ` +
      `Muscles actifs: ${active}/${muscleNames.length} | ` +
      `Energie: ${(energy * 100).toFixed(0)}%`

    renderer.render()
  }

  requestAnimationFrame(animate)
}
