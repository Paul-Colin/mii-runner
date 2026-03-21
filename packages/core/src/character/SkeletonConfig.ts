export interface SegmentDef {
  name: string
  length: number
  radius: number
  mass: number
  color: number
}

export interface JointDef {
  name: string
  parentSegment: string
  childSegment: string
  parentAnchor: { x: number; y: number; z: number }
  childAnchor:  { x: number; y: number; z: number }
  type: 'revolute' | 'spherical' | 'fixed'
  limits?: {
    minX?: number; maxX?: number
    minY?: number; maxY?: number
    minZ?: number; maxZ?: number
  }
}

export interface SkeletonDef {
  segments: Record<string, SegmentDef>
  joints: JointDef[]
  rootSegment: string
  spawnPosition: { x: number; y: number; z: number }
}

const DEG = Math.PI / 180

export function buildSkeletonDef(
  height = 1.75,
  weight = 70,
  muscle = 1.0
): SkeletonDef {
  const s = height / 1.75

  const torsoH    = 0.50 * s
  const hipH      = 0.18 * s
  const thighH    = 0.42 * s
  const shinH     = 0.40 * s
  const footH     = 0.12 * s
  const upperArmH = 0.30 * s
  const foreArmH  = 0.26 * s
  const headR     = 0.13 * s

  const bodyMass  = weight * 0.43
  const legMass   = (weight * 0.20) / 2
  const armMass   = (weight * 0.06) / 2
  const headMass  = weight * 0.08
  const r         = 0.06 * s * (0.8 + muscle * 0.2)

  const segments: Record<string, SegmentDef> = {
    torso:      { name: 'torso',      length: torsoH,    radius: r * 1.4, mass: bodyMass * 0.6, color: 0x4488ff },
    hip:        { name: 'hip',        length: hipH,      radius: r * 1.2, mass: bodyMass * 0.4, color: 0x3366cc },
    head:       { name: 'head',       length: headR * 2, radius: headR,   mass: headMass,       color: 0xffcc88 },
    thigh_l:    { name: 'thigh_l',    length: thighH,    radius: r,       mass: legMass * 0.55, color: 0x4488ff },
    thigh_r:    { name: 'thigh_r',    length: thighH,    radius: r,       mass: legMass * 0.55, color: 0x4488ff },
    shin_l:     { name: 'shin_l',     length: shinH,     radius: r * 0.8, mass: legMass * 0.35, color: 0x3366cc },
    shin_r:     { name: 'shin_r',     length: shinH,     radius: r * 0.8, mass: legMass * 0.35, color: 0x3366cc },
    foot_l:     { name: 'foot_l',     length: footH,     radius: r * 0.6, mass: legMass * 0.10, color: 0x222222 },
    foot_r:     { name: 'foot_r',     length: footH,     radius: r * 0.6, mass: legMass * 0.10, color: 0x222222 },
    upper_arm_l:{ name: 'upper_arm_l',length: upperArmH, radius: r * 0.7, mass: armMass * 0.55, color: 0x44aaff },
    upper_arm_r:{ name: 'upper_arm_r',length: upperArmH, radius: r * 0.7, mass: armMass * 0.55, color: 0x44aaff },
    fore_arm_l: { name: 'fore_arm_l', length: foreArmH,  radius: r * 0.6, mass: armMass * 0.45, color: 0x3399dd },
    fore_arm_r: { name: 'fore_arm_r', length: foreArmH,  radius: r * 0.6, mass: armMass * 0.45, color: 0x3399dd },
  }

  const joints: JointDef[] = [
    {
      name: 'spine',
      parentSegment: 'hip',
      childSegment: 'torso',
      parentAnchor: { x: 0, y:  hipH / 2,   z: 0 },
      childAnchor:  { x: 0, y: -torsoH / 2, z: 0 },
      type: 'revolute',
      limits: { minX: -20 * DEG, maxX: 30 * DEG },
    },
    {
      name: 'neck',
      parentSegment: 'torso',
      childSegment: 'head',
      parentAnchor: { x: 0, y:  torsoH / 2, z: 0 },
      childAnchor:  { x: 0, y: -headR,      z: 0 },
      type: 'fixed',
    },
    {
      name: 'hip_l',
      parentSegment: 'hip',
      childSegment: 'thigh_l',
      parentAnchor: { x: -r * 1.2, y: -hipH / 2,   z: 0 },
      childAnchor:  { x:  0,       y:  thighH / 2,  z: 0 },
      type: 'spherical',
      limits: { minX: -30 * DEG, maxX: 120 * DEG, minY: -20 * DEG, maxY: 20 * DEG },
    },
    {
      name: 'hip_r',
      parentSegment: 'hip',
      childSegment: 'thigh_r',
      parentAnchor: { x:  r * 1.2, y: -hipH / 2,   z: 0 },
      childAnchor:  { x:  0,       y:  thighH / 2,  z: 0 },
      type: 'spherical',
      limits: { minX: -30 * DEG, maxX: 120 * DEG, minY: -20 * DEG, maxY: 20 * DEG },
    },
    {
      name: 'knee_l',
      parentSegment: 'thigh_l',
      childSegment: 'shin_l',
      parentAnchor: { x: 0, y: -thighH / 2, z: 0 },
      childAnchor:  { x: 0, y:  shinH / 2,  z: 0 },
      type: 'revolute',
      limits: { minX: 0, maxX: 140 * DEG },
    },
    {
      name: 'knee_r',
      parentSegment: 'thigh_r',
      childSegment: 'shin_r',
      parentAnchor: { x: 0, y: -thighH / 2, z: 0 },
      childAnchor:  { x: 0, y:  shinH / 2,  z: 0 },
      type: 'revolute',
      limits: { minX: 0, maxX: 140 * DEG },
    },
    {
      name: 'ankle_l',
      parentSegment: 'shin_l',
      childSegment: 'foot_l',
      parentAnchor: { x: 0, y: -shinH / 2,  z: 0 },
      childAnchor:  { x: 0, y:  footH / 2,  z: 0 },
      type: 'revolute',
      limits: { minX: -30 * DEG, maxX: 40 * DEG },
    },
    {
      name: 'ankle_r',
      parentSegment: 'shin_r',
      childSegment: 'foot_r',
      parentAnchor: { x: 0, y: -shinH / 2,  z: 0 },
      childAnchor:  { x: 0, y:  footH / 2,  z: 0 },
      type: 'revolute',
      limits: { minX: -30 * DEG, maxX: 40 * DEG },
    },
    {
      name: 'shoulder_l',
      parentSegment: 'torso',
      childSegment: 'upper_arm_l',
      parentAnchor: { x: -r * 1.4, y: torsoH * 0.4,   z: 0 },
      childAnchor:  { x:  0,       y: upperArmH / 2,   z: 0 },
      type: 'spherical',
      limits: { minX: -90 * DEG, maxX: 90 * DEG, minY: -60 * DEG, maxY: 60 * DEG },
    },
    {
      name: 'shoulder_r',
      parentSegment: 'torso',
      childSegment: 'upper_arm_r',
      parentAnchor: { x:  r * 1.4, y: torsoH * 0.4,   z: 0 },
      childAnchor:  { x:  0,       y: upperArmH / 2,   z: 0 },
      type: 'spherical',
      limits: { minX: -90 * DEG, maxX: 90 * DEG, minY: -60 * DEG, maxY: 60 * DEG },
    },
    {
      name: 'elbow_l',
      parentSegment: 'upper_arm_l',
      childSegment: 'fore_arm_l',
      parentAnchor: { x: 0, y: -upperArmH / 2, z: 0 },
      childAnchor:  { x: 0, y:  foreArmH / 2,  z: 0 },
      type: 'revolute',
      limits: { minX: 0, maxX: 145 * DEG },
    },
    {
      name: 'elbow_r',
      parentSegment: 'upper_arm_r',
      childSegment: 'fore_arm_r',
      parentAnchor: { x: 0, y: -upperArmH / 2, z: 0 },
      childAnchor:  { x: 0, y:  foreArmH / 2,  z: 0 },
      type: 'revolute',
      limits: { minX: 0, maxX: 145 * DEG },
    },
  ]

  const totalHeight = footH + shinH + thighH + hipH + torsoH + headR * 2
  const spawnY = totalHeight + 0.1

  return {
    segments,
    joints,
    rootSegment: 'hip',
    spawnPosition: { x: 0, y: spawnY, z: 0 },
  }
}