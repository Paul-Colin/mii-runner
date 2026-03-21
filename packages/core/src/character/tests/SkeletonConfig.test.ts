import { describe, it, expect } from 'vitest'
import { buildSkeletonDef } from '../SkeletonConfig.js'

describe('SkeletonConfig', () => {
  it('génère une config avec le bon nombre de segments', () => {
    const def = buildSkeletonDef()
    expect(Object.keys(def.segments)).toHaveLength(13)
  })

  it('génère une config avec le bon nombre de joints', () => {
    const def = buildSkeletonDef()
    expect(def.joints).toHaveLength(12)
  })

  it('le segment racine existe', () => {
    const def = buildSkeletonDef()
    expect(def.segments[def.rootSegment]).toBeDefined()
  })

  it('tous les joints référencent des segments existants', () => {
    const def = buildSkeletonDef()
    for (const joint of def.joints) {
      expect(def.segments[joint.parentSegment]).toBeDefined()
      expect(def.segments[joint.childSegment]).toBeDefined()
    }
  })

  it('un personnage plus grand a des segments plus longs', () => {
    const small = buildSkeletonDef(1.50)
    const tall  = buildSkeletonDef(2.00)
    expect(tall.segments['thigh_l']!.length)
      .toBeGreaterThan(small.segments['thigh_l']!.length)
  })

  it('la position de spawn est au dessus du sol', () => {
    const def = buildSkeletonDef()
    expect(def.spawnPosition.y).toBeGreaterThan(1.0)
  })

  it('le coefficient muscle impacte le radius des segments', () => {
    const slim    = buildSkeletonDef(1.75, 70, 0.5)
    const muscled = buildSkeletonDef(1.75, 70, 2.0)
    expect(muscled.segments['torso']!.radius)
      .toBeGreaterThan(slim.segments['torso']!.radius)
  })
})
