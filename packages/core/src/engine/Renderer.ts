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
  backgroundColor: 0x87c0d0,  // ciel bleu clair — was 0x1a1a2e (navy trop foncé)
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

    // Three.js r155+ : lumières physiques par défaut → outputColorSpace + toneMapping requis
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

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
    // Three.js r155+ : intensités en candelas → multiplier par Math.PI
    // pour retrouver la luminosité de l'ancienne API non-physique.
    // Source : mii-creator 3DScene.ts — DirectionalLight(0xebfeff, Math.PI)

    // Lumière ambiante — fill doux, évite les zones complètement noires
    const ambient = new THREE.AmbientLight(0xfff5e8, Math.PI * 0.6)
    this.scene.add(ambient)

    // Soleil principal — lumière du jour chaude, légèrement désaxée
    const sun = new THREE.DirectionalLight(0xfff8f0, Math.PI * 1.8)
    sun.position.set(10, 30, 20)
    sun.castShadow = true
    sun.shadow.mapSize.width = 2048
    sun.shadow.mapSize.height = 2048
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 300
    sun.shadow.camera.left = -50
    sun.shadow.camera.right = 50
    sun.shadow.camera.top = 50
    sun.shadow.camera.bottom = -50
    this.scene.add(sun)

    // Fill latéral — contre-jour bleuté doux (simule ciel)
    const fill = new THREE.DirectionalLight(0xc8d8ff, Math.PI * 0.4)
    fill.position.set(-15, 10, -10)
    this.scene.add(fill)
  }

  addGround(width = 400, depth = 20): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, 0.2, depth)
    const mat = new THREE.MeshLambertMaterial({ color: 0x6abf7a })
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
