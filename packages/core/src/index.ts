export const ENGINE_VERSION = '1.0.0'

export function getEngineInfo(): string {
  return `@mii-engine/core v${ENGINE_VERSION}`
}

export { Clock } from './engine/Clock.js'
export type { ClockOptions } from './engine/Clock.js'

export { PhysicsWorld } from './engine/PhysicsWorld.js'
export type { PhysicsWorldOptions } from './engine/PhysicsWorld.js'

export { Renderer } from './engine/Renderer.js'
export type { RendererOptions } from './engine/Renderer.js'

export { Skeleton } from './character/Skeleton.js'
export type { SkeletonOptions } from './character/Skeleton.js'

export { buildSkeletonDef } from './character/SkeletonConfig.js'
export type { SkeletonDef, SegmentDef, JointDef } from './character/SkeletonConfig.js'
