import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { MiiData } from './MiiData.js'
import { DEFAULT_MII_DATA, randomMiiData } from './MiiData.js'

export interface MiiHeadLoaderOptions {
  apiBase?:       string
  shaderType?:    'wiiu' | 'switch' | 'miitomo'
  texResolution?: number
  width?:         number
  /** Scale appliqué au groupe Three.js. Défaut : 0.015 (GLB ~160u → monde ~2.4m) */
  scale?:         number
}

export interface MiiHeadInstance {
  group: THREE.Group
  body:  THREE.Object3D
  data:  MiiData
  hex:   string
  setPosition(x: number, y: number, z: number): void
  setRotationY(radians: number): void
  toJSON(): MiiData
  dispose(): void
}

// ─────────────────────────────────────────────────────────────────────────────
// FFSD de référence valide — 96 octets, CRC vérifié
// ─────────────────────────────────────────────────────────────────────────────

const BASE_FFSD_HEX =
  '03810040000000000000000080ff709900000000000000000000740065007300' +
  '7400000000000000000000000000776f00003501026844182634461481121768' +
  '0d0000290052485000000000000000000000000000000000000000000000ff50'

function crc16(data: Uint8Array, length: number): number {
  let crc = 0x0000
  for (let i = 0; i < length; i++) {
    crc ^= (data[i]! << 8)
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc
}

class BitWriter {
  readonly data: Uint8Array
  private pos = 0
  private bigEndian = false

  constructor(base: Uint8Array) { this.data = new Uint8Array(base) }

  swapEndian(): void { this.bigEndian = !this.bigEndian }

  writeBit(bit: number): void {
    const byteIdx = this.pos >> 3
    let   bitIdx  = this.pos & 7
    if (this.bigEndian) bitIdx = 7 - bitIdx
    if (bit) this.data[byteIdx]! |=  (1 << bitIdx)
    else     this.data[byteIdx]! &= ~(1 << bitIdx)
    this.pos++
  }

  writeBits(val: number, n: number): void {
    for (let i = 0; i < n; i++) this.writeBit((val >> i) & 1)
  }

  writeBool(val: boolean): void { this.writeBit(val ? 1 : 0) }

  alignByte(): void {
    if (this.pos & 7) this.pos = ((this.pos >> 3) + 1) << 3
  }

  writeUint8(val: number): void { this.alignByte(); this.writeBits(val & 0xff, 8) }

  writeBuffer(buf: Uint8Array | number[]): void {
    this.alignByte()
    for (const b of buf) this.writeBits(b as number, 8)
  }

  skipBit():   void { this.pos++ }
  skipInt16(): void { this.alignByte(); this.pos += 16 }

  writeUtf16(str: string, byteLength = 20): void {
    this.alignByte()
    const buf = new Uint8Array(byteLength)
    const chars = [...str].slice(0, byteLength / 2)
    for (let i = 0; i < chars.length; i++) {
      const code = chars[i]!.charCodeAt(0)
      buf[i * 2]     = code & 0xff
      buf[i * 2 + 1] = (code >> 8) & 0xff
    }
    this.writeBuffer(buf)
  }
}

function hexToUint8(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return arr
}

const BASE_FFSD = hexToUint8(BASE_FFSD_HEX)

export function miiDataToBuffer(data: MiiData): Uint8Array {
  const w = new BitWriter(BASE_FFSD)

  w.writeUint8(3); w.writeBool(true); w.writeBool(false)
  w.writeBits(0, 2); w.writeBits(0, 2); w.alignByte()
  w.writeBits(0, 4); w.writeBits(0, 4); w.writeBits(0, 4); w.writeBits(4, 3); w.alignByte()
  w.writeBuffer(new Uint8Array(8))
  w.swapEndian()
  w.writeBool(true); w.writeBool(false); w.writeBool(false); w.writeBool(true)
  w.writeBits(0, 28)
  w.swapEndian()
  w.writeBuffer(new Uint8Array(6)); w.skipInt16()

  w.writeBit(data.gender)
  w.writeBits(data.birthMonth, 4); w.writeBits(data.birthDay, 5)
  w.writeBits(data.favoriteColor, 4); w.writeBool(data.favorite); w.alignByte()

  w.writeUtf16(data.miiName.slice(0, 10), 20)
  w.writeUint8(data.height); w.writeUint8(data.build)

  w.writeBool(false)
  w.writeBits(data.faceType, 4); w.writeBits(data.skinColor, 3)
  w.writeBits(data.wrinklesType, 4); w.writeBits(data.makeupType, 4)
  w.writeUint8(data.hairType)
  w.writeBits(data.hairColor, 3); w.writeBool(data.flipHair); w.alignByte()

  w.writeBits(data.eyeType, 6); w.writeBits(data.eyeColor, 3)
  w.writeBits(data.eyeScale, 4); w.writeBits(data.eyeVerticalStretch, 3)
  w.writeBits(data.eyeRotation, 5); w.writeBits(data.eyeSpacing, 4)
  w.writeBits(data.eyeYPosition, 5); w.alignByte()

  w.writeBits(data.eyebrowType, 5); w.writeBits(data.eyebrowColor, 3)
  w.writeBits(data.eyebrowScale, 4); w.writeBits(data.eyebrowVerticalStretch, 3)
  w.skipBit()
  w.writeBits(data.eyebrowRotation, 4); w.skipBit()
  w.writeBits(data.eyebrowSpacing, 4)
  w.writeBits(Math.max(3, data.eyebrowYPosition), 5); w.alignByte()

  w.writeBits(data.noseType, 5); w.writeBits(data.noseScale, 4)
  w.writeBits(data.noseYPosition, 5); w.alignByte()

  w.writeBits(data.mouthType, 6); w.writeBits(data.mouthColor, 3)
  w.writeBits(data.mouthScale, 4); w.writeBits(data.mouthHorizontalStretch, 3)
  w.writeBits(data.mouthYPosition, 5)
  w.writeBits(data.mustacheType, 3); w.writeUint8(0)
  w.writeBits(data.beardType, 3); w.writeBits(data.facialHairColor, 3)
  w.writeBits(data.mustacheScale, 4); w.writeBits(data.mustacheYPosition, 5); w.alignByte()

  w.writeBits(data.glassesType, 4); w.writeBits(data.glassesColor, 3)
  w.writeBits(data.glassesScale, 4); w.writeBits(data.glassesYPosition, 5)
  w.writeBool(data.moleEnabled)
  w.writeBits(data.moleScale, 4); w.writeBits(data.moleXPosition, 5)
  w.writeBits(data.moleYPosition, 5); w.alignByte()

  w.writeUtf16((data.creatorName ?? '').slice(0, 10), 20)
  w.skipInt16()

  // CRC16-XMODEM sur 94 octets → big-endian à 0x5E-0x5F
  w.data[0x5e] = 0; w.data[0x5f] = 0
  const crc = crc16(w.data, 94)
  w.data[0x5e] = (crc >> 8) & 0xff
  w.data[0x5f] = crc & 0xff

  return w.data
}

export function miiDataToHex(data: MiiData): string {
  return Array.from(miiDataToBuffer(data)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// MiiLoader
// ─────────────────────────────────────────────────────────────────────────────

export class MiiHeadLoader {
  private scene:         THREE.Scene
  private apiBase:       string
  private shaderType:    string
  private texResolution: number
  private width:         number
  private scale:         number
  private gltfLoader:    GLTFLoader

  constructor(scene: THREE.Scene, options: MiiHeadLoaderOptions = {}) {
    this.scene         = scene
    this.apiBase       = options.apiBase       ?? 'https://mii-unsecure.ariankordi.net'
    this.shaderType    = options.shaderType    ?? 'wiiu'
    this.texResolution = options.texResolution ?? 512
    this.width         = options.width         ?? 512
    // GLB all_body fait ~160 unités → 0.015 ≈ 2.4m, cohérent avec un personnage 1.75m
    this.scale         = options.scale         ?? 0.015
    this.gltfLoader    = new GLTFLoader()
  }

  async loadRandom(
    position?: THREE.Vector3 | { x: number; y: number; z: number }
  ): Promise<MiiHeadInstance> {
    return this.loadFromData(randomMiiData(), position)
  }

  async loadCoherent(
    style: 'masculine' | 'feminine' | 'random' = 'random',
    position?: THREE.Vector3 | { x: number; y: number; z: number }
  ): Promise<MiiHeadInstance> {
    const data = randomMiiData()
    if (style === 'masculine') {
      data.gender = 0; data.makeupType = 0
      data.mustacheType = Math.random() < 0.2 ? Math.floor(Math.random() * 5) + 1 : 0
    } else if (style === 'feminine') {
      data.gender = 1
      data.makeupType = Math.floor(Math.random() * 11) + 1
      data.mustacheType = 0; data.beardType = 0
    }
    return this.loadFromData(data, position)
  }

  async loadFromData(
    data: Partial<MiiData>,
    position?: THREE.Vector3 | { x: number; y: number; z: number }
  ): Promise<MiiHeadInstance> {
    const fullData: MiiData = { ...DEFAULT_MII_DATA, ...data }
    return this._load(miiDataToHex(fullData), fullData, position)
  }

  async loadFromHex(
    hex: string,
    position?: THREE.Vector3 | { x: number; y: number; z: number }
  ): Promise<MiiHeadInstance> {
    return this._load(hex, { ...DEFAULT_MII_DATA }, position)
  }

  static toHex(data: MiiData): string { return miiDataToHex(data) }

  // ── Privé ──────────────────────────────────────────────────────────────────

  private buildUrl(type: string, hex: string): string {
    return `${this.apiBase}/miis/image.glb?${new URLSearchParams({
      type,
      data:           hex,
      shaderType:     this.shaderType,
      texResolution:  String(this.texResolution),
      width:          String(this.width),
      bgColor:        'FFFFFF00',
      verifyCharInfo: '0',
      lightEnable:    '0',   // ← désactive l'éclairage interne du renderer
    })}`
  }

  private loadGLB(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(new Error(`[MiiLoader] GLB load error: ${String(err)}`))
      )
    })
  }

  private async _load(
    hex:       string,
    data:      MiiData,
    position?: THREE.Vector3 | { x: number; y: number; z: number }
  ): Promise<MiiHeadInstance> {
    // Charger uniquement la "face" (tête) pour éviter d'avoir un corps renvoyé
    // par l'API qui se superpose et peut masquer les mains/couleurs du corps statique.
    const bodyObj = await this.loadGLB(this.buildUrl('face', hex))

    const group = new THREE.Group()
    group.add(bodyObj)

    // Scale : le GLB all_body fait ~160 unités → 0.015 ≈ 2.4m dans le monde physique
    group.scale.setScalar(this.scale)

    if (position) group.position.set(position.x, position.y, position.z)
    this.scene.add(group)

    return {
      group,
      body: bodyObj,
      data,
      hex,
      setPosition(x, y, z) { group.position.set(x, y, z) },
      setRotationY(r)       { group.rotation.y = r },
      toJSON()              { return { ...data } },
      dispose() {
        group.parent?.remove(group)
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      },
    }
  }
}