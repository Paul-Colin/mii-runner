import * as THREE from 'three'

export interface FreeCameraOptions {
  speed: number
  sensitivity: number
  position?: { x: number; y: number; z: number }
}

const DEFAULT_OPTIONS: FreeCameraOptions = {
  speed: 10,
  sensitivity: 0.002,
}

export class FreeCamera {
  private camera: THREE.PerspectiveCamera
  private speed: number
  private sensitivity: number
  private enabled = false

  private keys = new Set<string>()
  private pitch = 0
  private yaw   = 0

  private onKeyDown:   (e: KeyboardEvent) => void
  private onKeyUp:     (e: KeyboardEvent) => void
  private onMouseMove: (e: MouseEvent)    => void
  private onToggle:    (e: KeyboardEvent) => void

  constructor(camera: THREE.PerspectiveCamera, options: Partial<FreeCameraOptions> = {}) {
    const opts    = { ...DEFAULT_OPTIONS, ...options }
    this.camera   = camera
    this.speed    = opts.speed
    this.sensitivity = opts.sensitivity

    if (opts.position) {
      this.camera.position.set(opts.position.x, opts.position.y, opts.position.z)
    }

    const euler = new THREE.Euler()
    euler.setFromQuaternion(this.camera.quaternion, 'YXZ')
    this.pitch = euler.x
    this.yaw   = euler.y

    this.onKeyDown = (e) => {
      this.keys.add(e.code)
    }

    this.onKeyUp = (e) => {
      this.keys.delete(e.code)
    }

    this.onMouseMove = (e) => {
      if (!this.enabled) return
      this.yaw   -= e.movementX * this.sensitivity
      this.pitch -= e.movementY * this.sensitivity
      this.pitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch))
      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
    }

    this.onToggle = (e) => {
      if (e.code === 'KeyF') this.toggle()
    }

    window.addEventListener('keydown',   this.onKeyDown)
    window.addEventListener('keyup',     this.onKeyUp)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('keydown',   this.onToggle)
  }

  toggle(): void {
    this.enabled = !this.enabled

    if (this.enabled) {
      document.body.requestPointerLock()
    } else {
      document.exitPointerLock()
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  update(dt: number): void {
    if (!this.enabled) return

    const moveSpeed = this.speed * dt
    const forward   = new THREE.Vector3()
    const right     = new THREE.Vector3()
    const up        = new THREE.Vector3(0, 1, 0)

    this.camera.getWorldDirection(forward)
    right.crossVectors(forward, up).normalize()

    if (this.keys.has('KeyW') || this.keys.has('KeyZ')) {
      this.camera.position.addScaledVector(forward, moveSpeed)
    }
    if (this.keys.has('KeyS')) {
      this.camera.position.addScaledVector(forward, -moveSpeed)
    }
    if (this.keys.has('KeyD')) {
      this.camera.position.addScaledVector(right, moveSpeed)
    }
    if (this.keys.has('KeyA') || this.keys.has('KeyQ')) {
      this.camera.position.addScaledVector(right, -moveSpeed)
    }
    if (this.keys.has('Space')) {
      this.camera.position.addScaledVector(up, moveSpeed)
    }
    if (this.keys.has('ShiftLeft')) {
      this.camera.position.addScaledVector(up, -moveSpeed)
    }
  }

  destroy(): void {
    window.removeEventListener('keydown',   this.onKeyDown)
    window.removeEventListener('keyup',     this.onKeyUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('keydown',   this.onToggle)
    document.exitPointerLock()
  }
}
