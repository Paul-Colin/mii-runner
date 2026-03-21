import { describe, it, expect } from 'vitest'
import { validateMorphology, getArchetype } from '../MorphologyConfig.js'

describe('MorphologyConfig', () => {
  it('valeurs normales passent sans modification', () => {
    const cfg = validateMorphology({ height: 1.75, weight: 70, muscle: 1.0 })
    expect(cfg.height).toBeCloseTo(1.75)
    expect(cfg.muscle).toBeCloseTo(1.0)
  })

  it('height est clampée dans [1.40, 2.00]', () => {
    expect(validateMorphology({ height: 0.5, weight: 70, muscle: 1.0 }).height).toBeCloseTo(1.40)
    expect(validateMorphology({ height: 3.0, weight: 70, muscle: 1.0 }).height).toBeCloseTo(2.00)
  })

  it('muscle élevé force un poids minimum cohérent', () => {
    const cfg   = validateMorphology({ height: 1.75, weight: 100, muscle: 2.0 })
    const pMin  = cfg.height * 25 + cfg.muscle * 20
    expect(cfg.weight).toBeGreaterThanOrEqual(pMin)
  })

  it('poids faible plafonne le muscle', () => {
    const cfg = validateMorphology({ height: 1.75, weight: 45, muscle: 2.0 })
    expect(cfg.muscle).toBeLessThan(2.0)
  })

  it('impossible d\'avoir M=2.0 avec P=40kg', () => {
    const cfg = validateMorphology({ height: 1.75, weight: 40, muscle: 2.0 })
    expect(cfg.muscle).toBeLessThan(2.0)
  })

  it('le poids final respecte toujours pMin basé sur muscle validé', () => {
    const cfg  = validateMorphology({ height: 1.75, weight: 70, muscle: 1.0 })
    const pMin = cfg.height * 25 + cfg.muscle * 20
    expect(cfg.weight).toBeGreaterThanOrEqual(pMin)
  })

  it('E_max calculé correctement', () => {
    const cfg = validateMorphology({ height: 1.75, weight: 70, muscle: 1.0 })
    expect(cfg.eMax).toBeCloseTo(70 * 8 + 1.0 * 15)
  })

  it('un grand personnage a un segmentScale plus élevé', () => {
    const small = validateMorphology({ height: 1.50, weight: 55, muscle: 1.0 })
    const tall  = validateMorphology({ height: 2.00, weight: 90, muscle: 1.0 })
    expect(tall.segmentScale).toBeGreaterThan(small.segmentScale)
  })

  it('fMaxBase proportionnel au muscle', () => {
    const weak   = validateMorphology({ height: 1.75, weight: 70, muscle: 0.5 })
    const strong = validateMorphology({ height: 1.75, weight: 90, muscle: 1.8 })
    expect(strong.fMaxBase).toBeGreaterThan(weak.fMaxBase)
  })

  it('getArchetype retourne une string non vide', () => {
    const cfg = validateMorphology({ height: 1.75, weight: 70, muscle: 1.0 })
    expect(getArchetype(cfg).length).toBeGreaterThan(0)
  })

  it('archétype tank musclé détecté', () => {
    const cfg = validateMorphology({ height: 1.75, weight: 110, muscle: 1.8 })
    expect(getArchetype(cfg)).toBe('Tank musclé')
  })
})
