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

export { MuscleSystem } from './character/MuscleSystem.js'
export type { MuscleSystemOptions } from './character/MuscleSystem.js'

export { EnergySystem } from './character/EnergySystem.js'
export type { EnergySystemOptions } from './character/EnergySystem.js'

export { Muscle } from './character/Muscle.js'
export type { MuscleOptions, MuscleDirection } from './character/Muscle.js'

export { validateMorphology, getArchetype } from './character/MorphologyConfig.js'
export type { MorphologyConfig, MorphologyInput, MorphologyConstraints } from './character/MorphologyConfig.js'

export { buildSkeletonDef } from './character/SkeletonConfig.js'
export type { SkeletonDef, SegmentDef, JointDef } from './character/SkeletonConfig.js'

export { MiiHeadLoader, miiDataToHex, miiDataToBuffer } from './character/MiiHeadLoader.js'
export type { MiiHeadLoaderOptions, MiiHeadInstance }       from './character/MiiHeadLoader.js'
 
export { DEFAULT_MII_DATA, randomMiiData, coherentMiiData, crossoverMiiData } from './character/MiiData.js'
export type { MiiData } from './character/MiiData.js'

// MiiBodyLoader (charge le corps GLB statique + scaling T/P/M)
export { MiiBodyLoader } from './character/MiiBodyLoader.js'
export type { MiiBodyOptions, MiiBodyInstance, BodyStyle } from './character/MiiBodyLoader.js'
 
// MiiLoader (orchestrateur : tête + corps → Mii complet)
export { MiiLoader } from './character/MiiLoader.js'
export type { MiiLoaderOptions, MiiInstance } from './character/MiiLoader.js'

export { FreeCamera } from './engine/FreeCamera.js'
export type { FreeCameraOptions } from './engine/FreeCamera.js'

