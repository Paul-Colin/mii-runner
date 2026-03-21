import * as THREE from 'three'

export interface RendererOptions {
  canvas?: HTMLCanvasElement
  width?: number
  height?: number
  backgroundColor?: number
  antialias?: boolean
}

const DEFAULT_OPTIONS: RendererOptions = {
  width: 1280,
  height: 720,
  backgroundColor: 0x1a1a2e,
  antialias: true,
}

export class Renderer {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private animationFrameId: number | null = null

  constructor(options: RendererOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: opts.antialias,
    })
    this.renderer.setSize(opts.width!, opts.height!)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(opts.backgroundColor!)
    this.scene.fog = new THREE.Fog(opts.backgroundColor!, 50, 300)

    this.camera = new THREE.PerspectiveCamera(
      60,
      opts.width! / opts.height!,
      0.1,
      1000
    )
    this.camera.position.set(0, 5, 15)
    this.camera.lookAt(0, 0, 0)

    this.setupLights()
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(30, 50, 30)
    sun.castShadow = true
    sun.shadow.mapSize.width = 2048
    sun.shadow.mapSize.height = 2048
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 300
    sun.shadow.camera.left = -100
    sun.shadow.camera.right = 100
    sun.shadow.camera.top = 100
    sun.shadow.camera.bottom = -100
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0x8888ff, 0.3)
    fill.position.set(-20, 10, -20)
    this.scene.add(fill)
  }

  addGround(width = 400, depth = 20): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, 0.2, depth)
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true
    mesh.position.set(0, -0.1, 0)
    this.scene.add(mesh)
    return mesh
  }

  addMesh(mesh: THREE.Object3D): void {
    this.scene.add(mesh)
  }

  removeMesh(mesh: THREE.Object3D): void {
    this.scene.remove(mesh)
  }

  getScene(): THREE.Scene {
    return this.scene
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.renderer.dispose()
  }
}
