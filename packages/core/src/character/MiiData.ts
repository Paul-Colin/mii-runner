// packages/core/src/character/MiiData.ts

import { randomSwitchColor } from './MiiColorPalette.js'

export interface MiiData {
  miiName:      string
  creatorName:  string
  gender:       number   // 0–1
  birthMonth:   number   // 0–12
  birthDay:     number   // 0–31
  favoriteColor:    number   // 0–11
  favoriteColorHex: string | null  // ex: '#ff6200' — override couleur corps/haut (null = table standard 12 couleurs)
  customHairHex:    string | null  // ex: '#57b4f2' — override couleur cheveux via palette Switch (null = hairColor standard)
  favorite:     boolean
  height:       number   // 0–127
  build:        number   // 0–127

  faceType:     number   // 0–11
  skinColor:    number   // 0–5 (plage FFSD Wii U officielle — champ 3 bits, Nintendo utilise 0–5)
  wrinklesType: number   // 0–11
  makeupType:   number   // 0–11

  hairType:     number   // 0–131
  hairColor:    number   // 0–7
  flipHair:     boolean

  eyeType:              number  // 0–59
  eyeColor:             number  // 0–5
  eyeScale:             number  // 0–7
  eyeVerticalStretch:   number  // 0–6
  eyeRotation:          number  // 0–7
  eyeSpacing:           number  // 0–12
  eyeYPosition:         number  // 0–18

  eyebrowType:              number  // 0–24
  eyebrowColor:             number  // 0–7
  eyebrowScale:             number  // 0–8
  eyebrowVerticalStretch:   number  // 0–6
  eyebrowRotation:          number  // 0–11
  eyebrowSpacing:           number  // 0–12
  eyebrowYPosition:         number  // 3–18  ← minimum 3 !

  noseType:      number  // 0–17
  noseScale:     number  // 0–8
  noseYPosition: number  // 0–18

  mouthType:               number  // 0–35
  mouthColor:              number  // 0–4
  mouthScale:              number  // 0–8
  mouthHorizontalStretch:  number  // 0–6
  mouthYPosition:          number  // 0–18

  mustacheType:      number  // 0–5
  beardType:         number  // 0–5
  facialHairColor:   number  // 0–7
  mustacheScale:     number  // 0–8
  mustacheYPosition: number  // 0–16

  glassesType:      number  // 0–8
  glassesColor:     number  // 0–5
  glassesScale:     number  // 0–7
  glassesYPosition: number  // 0–20

  moleEnabled:   boolean
  moleScale:     number  // 0–8
  moleXPosition: number  // 0–16
  moleYPosition: number  // 0–30
}

// ─────────────────────────────────────────────────────────────────────────────
// Valeurs par défaut
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MII_DATA: MiiData = {
  miiName:      'Mii',
  creatorName:  '',
  gender:       0,
  birthMonth:   0,
  birthDay:     0,
  favoriteColor:    0,
  favoriteColorHex: null,
  customHairHex:    null,
  favorite:     false,
  height:       64,
  build:        64,

  faceType:     0,
  skinColor:    0,
  wrinklesType: 0,
  makeupType:   0,

  hairType:     0,
  hairColor:    0,
  flipHair:     false,

  eyeType:             2,
  eyeColor:            0,
  eyeScale:            4,
  eyeVerticalStretch:  3,
  eyeRotation:         4,
  eyeSpacing:          2,
  eyeYPosition:        12,

  eyebrowType:             0,
  eyebrowColor:            0,
  eyebrowScale:            4,
  eyebrowVerticalStretch:  3,
  eyebrowRotation:         6,
  eyebrowSpacing:          2,
  eyebrowYPosition:        10,  // dans [3, 18]

  noseType:      1,
  noseScale:     4,
  noseYPosition: 9,

  mouthType:              23,
  mouthColor:             0,
  mouthScale:             4,
  mouthHorizontalStretch: 3,
  mouthYPosition:         13,

  mustacheType:      0,
  beardType:         0,
  facialHairColor:   0,
  mustacheScale:     4,
  mustacheYPosition: 10,

  glassesType:      0,
  glassesColor:     0,
  glassesScale:     4,
  glassesYPosition: 10,

  moleEnabled:   false,
  moleScale:     4,
  moleXPosition: 2,
  moleYPosition: 20,
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────
 
function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
 
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ─────────────────────────────────────────────────────────────────────────────
// Générateur aléatoire — plages strictement conformes à mii-js
// ─────────────────────────────────────────────────────────────────────────────

export function randomMiiData(nameSuffix?: string): MiiData {
  const gender = ri(0, 1)
  return {
    miiName:      nameSuffix ? `Mii${nameSuffix}` : 'Mii',
    creatorName:  '',
    gender,
    birthMonth:   0,
    birthDay:     0,
    favoriteColor:    ri(0, 11),
    favoriteColorHex: null,
    customHairHex:    null,
    favorite:     false,
    height:       ri(0, 127),
    build:        ri(0, 127),

    faceType:     ri(0, 11),
    skinColor:    ri(0, 5),
    wrinklesType: Math.random() < 0.15 ? ri(1, 11) : 0,
    makeupType:   gender === 1 && Math.random() < 0.4 ? ri(1, 11) : 0,

    hairType:     ri(0, 131),
    hairColor:    ri(0, 7),
    flipHair:     Math.random() < 0.3,

    eyeType:             ri(0, 59),
    eyeColor:            ri(0, 5),
    eyeScale:            ri(0, 7),
    eyeVerticalStretch:  ri(0, 6),
    eyeRotation:         ri(0, 7),
    eyeSpacing:          ri(0, 12),
    eyeYPosition:        ri(0, 18),

    eyebrowType:             ri(0, 24),
    eyebrowColor:            ri(0, 7),
    eyebrowScale:            ri(0, 8),
    eyebrowVerticalStretch:  ri(0, 6),
    eyebrowRotation:         ri(0, 11),
    eyebrowSpacing:          ri(0, 12),
    eyebrowYPosition:        ri(3, 18),  // ← minimum 3

    noseType:      ri(0, 17),
    noseScale:     ri(0, 8),
    noseYPosition: ri(0, 18),

    mouthType:              ri(0, 35),
    mouthColor:             ri(0, 4),
    mouthScale:             ri(0, 8),
    mouthHorizontalStretch: ri(0, 6),
    mouthYPosition:         ri(0, 18),

    mustacheType:      gender === 0 && Math.random() < 0.1 ? ri(1, 5) : 0,
    beardType:         gender === 0 && Math.random() < 0.1 ? ri(1, 5) : 0,
    facialHairColor:   gender === 0 ? ri(0, 7) : 0,
    mustacheScale:     ri(0, 8),
    mustacheYPosition: ri(0, 16),

    glassesType:      Math.random() < 0.2 ? ri(1, 8) : 0,
    glassesColor:     ri(0, 5),
    glassesScale:     ri(0, 7),
    glassesYPosition: ri(0, 20),

    moleEnabled:   Math.random() < 0.1,
    moleScale:     ri(0, 8),
    moleXPosition: ri(0, 16),
    moleYPosition: ri(0, 30),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Générateur COHÉRENT — positionnement facial anatomiquement correct
//
// Dans le FFSD, position Y : 0 = haut du visage, 18 = bas du visage
// Ordre vertical garanti : sourcils < yeux < nez < bouche
//
// Zones utilisées :
//   Sourcils  : eyebrowY ∈ [3,  9]
//   Yeux      : eyeY     ∈ [eyebrowY+1, 13]
//   Nez       : noseY    ∈ [eyeY+1, 15]
//   Bouche    : mouthY   ∈ [noseY+2, 18]
//
// Note mustacheYPosition : INVERSÉ (0 = bas visage, 16 = haut visage)
//   → pour placer la moustache entre nez et bouche, on utilise [8, 14]
// ─────────────────────────────────────────────────────────────────────────────

export function coherentMiiData(gender?: number, nameSuffix?: string, customColors = false): MiiData {
  const g = gender !== undefined ? gender : ri(0, 1)

  // ── Couleurs cohérentes ────────────────────────────────────────────────────
  const skinColor = ri(0, 5)
  const hairColor = ri(0, 7)
  // Couleurs custom Switch (palette étendue 100 couleurs)
  const favoriteColorHex = customColors ? randomSwitchColor() : null
  const customHairHex    = customColors ? randomSwitchColor() : null
  // Sourcils souvent de la même couleur que les cheveux
  const browColor = Math.random() < 0.7 ? hairColor : ri(0, 7)

  // ── Positions Y garanties de haut en bas ───────────────────────────────────
  const eyebrowY = ri(3, 9)
  const eyeY     = clamp(ri(eyebrowY + 1, eyebrowY + 5), eyebrowY + 1, 13)
  const noseY    = clamp(ri(eyeY + 1, eyeY + 4),         eyeY + 1,     15)
  const mouthY   = clamp(ri(noseY + 2, 18),              noseY + 2,    18)

  // ── Espacement horizontal cohérent ────────────────────────────────────────
  // eyeSpacing modéré : évite les yeux collés ou trop écartés
  const eyeSpacing  = ri(1, 6)
  const browSpacing = clamp(eyeSpacing + ri(-1, 1), 0, 12)

  // ── Moustache masculine — entre nez et bouche ──────────────────────────────
  // mustacheYPosition est INVERSÉ : valeur haute = visuellement haut
  const hasMustache  = g === 0 && Math.random() < 0.2
  const mustacheType = hasMustache ? ri(1, 5) : 0
  const mustacheY    = hasMustache ? ri(8, 14) : 10

  const hasBeard  = g === 0 && Math.random() < 0.15
  const beardType = hasBeard ? ri(1, 5) : 0

  // ── Maquillage féminin ────────────────────────────────────────────────────
  const makeupType = g === 1 && Math.random() < 0.45 ? ri(1, 11) : 0

  // ── Lunettes — positionnées au niveau des yeux ────────────────────────────
  const hasGlasses = Math.random() < 0.2
  // glassesYPosition ∈ [0, 20], eyeY ∈ [0, 18] → mapping proportionnel
  const glassesY   = hasGlasses ? clamp(Math.round(eyeY * 1.1), 0, 20) : 10

  // ── Échelles raisonnables (évite les valeurs extrêmes) ────────────────────
  const eyeScale   = ri(2, 6)
  const browScale  = ri(2, 6)
  const noseScale  = ri(2, 6)
  const mouthScale = ri(2, 6)

  return {
    miiName:       nameSuffix ? `Mii${nameSuffix}` : 'Mii',
    creatorName:   '',
    gender:        g,
    birthMonth:    0,
    birthDay:      0,
    favoriteColor:    ri(0, 11),
    favoriteColorHex,
    customHairHex,
    favorite:      false,
    height:        ri(0, 127),
    build:         ri(0, 127),

    faceType:     ri(0, 11),
    skinColor,
    wrinklesType: Math.random() < 0.1 ? ri(1, 11) : 0,
    makeupType,

    hairType:  ri(0, 131),
    hairColor,
    flipHair:  Math.random() < 0.3,

    eyeType:             ri(0, 59),
    eyeColor:            ri(0, 5),
    eyeScale,
    eyeVerticalStretch:  ri(1, 5),
    eyeRotation:         ri(2, 6),
    eyeSpacing,
    eyeYPosition:        eyeY,

    eyebrowType:             ri(0, 24),
    eyebrowColor:            browColor,
    eyebrowScale:            browScale,
    eyebrowVerticalStretch:  ri(1, 5),
    eyebrowRotation:         ri(3, 9),
    eyebrowSpacing:          browSpacing,
    eyebrowYPosition:        eyebrowY,

    noseType:      ri(0, 17),
    noseScale,
    noseYPosition: noseY,

    mouthType:              ri(0, 35),
    mouthColor:             g === 1 ? ri(0, 4) : 0,
    mouthScale,
    mouthHorizontalStretch: ri(1, 5),
    mouthYPosition:         mouthY,

    mustacheType,
    beardType:              g === 1 ? 0 : beardType, // ← femmes sans barbe
    facialHairColor:        g === 0 ? browColor : 0,
    mustacheScale:     hasMustache ? ri(2, 6) : 4,
    mustacheYPosition: mustacheY,

    glassesType:      hasGlasses ? ri(1, 8) : 0,
    glassesColor:     ri(0, 5),
    glassesScale:     ri(2, 6),
    glassesYPosition: glassesY,

    moleEnabled:   Math.random() < 0.08,
    moleScale:     ri(1, 5),
    moleXPosition: ri(0, 16),
    moleYPosition: ri(15, 28),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Crossover visuel pour l'algo génétique (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

export function crossoverMiiData(a: MiiData, b: MiiData): MiiData {
  function pick<T>(va: T, vb: T): T { return Math.random() < 0.5 ? va : vb }
  const mutate = (val: number, min: number, max: number): number =>
    Math.random() < 0.05 ? ri(min, max) : val

  const outGender = pick(a.gender, b.gender)

  return {
    miiName:       pick(a.miiName, b.miiName),
    creatorName:   '',
    gender:        outGender,
    birthMonth:    0, birthDay: 0,
    favoriteColor:    pick(a.favoriteColor, b.favoriteColor),
    favoriteColorHex: null,
    customHairHex:    null,
    favorite:      false,
    height:        pick(a.height, b.height),
    build:         pick(a.build, b.build),
    faceType:      pick(a.faceType, b.faceType),
    skinColor:     Math.round((a.skinColor + b.skinColor) / 2),
    wrinklesType:  pick(a.wrinklesType, b.wrinklesType),
    makeupType:    pick(a.makeupType, b.makeupType),
    hairType:      pick(a.hairType, b.hairType),
    hairColor:     mutate(pick(a.hairColor, b.hairColor), 0, 7),
    flipHair:      pick(a.flipHair, b.flipHair),
    eyeType:             pick(a.eyeType, b.eyeType),
    eyeColor:            pick(a.eyeColor, b.eyeColor),
    eyeScale:            pick(a.eyeScale, b.eyeScale),
    eyeVerticalStretch:  pick(a.eyeVerticalStretch, b.eyeVerticalStretch),
    eyeRotation:         pick(a.eyeRotation, b.eyeRotation),
    eyeSpacing:          pick(a.eyeSpacing, b.eyeSpacing),
    eyeYPosition:        pick(a.eyeYPosition, b.eyeYPosition),
    eyebrowType:             pick(a.eyebrowType, b.eyebrowType),
    eyebrowColor:            pick(a.eyebrowColor, b.eyebrowColor),
    eyebrowScale:            pick(a.eyebrowScale, b.eyebrowScale),
    eyebrowVerticalStretch:  pick(a.eyebrowVerticalStretch, b.eyebrowVerticalStretch),
    eyebrowRotation:         pick(a.eyebrowRotation, b.eyebrowRotation),
    eyebrowSpacing:          pick(a.eyebrowSpacing, b.eyebrowSpacing),
    eyebrowYPosition:        Math.max(3, pick(a.eyebrowYPosition, b.eyebrowYPosition)),
    noseType:      pick(a.noseType, b.noseType),
    noseScale:     pick(a.noseScale, b.noseScale),
    noseYPosition: pick(a.noseYPosition, b.noseYPosition),
    mouthType:              pick(a.mouthType, b.mouthType),
    mouthColor:             pick(a.mouthColor, b.mouthColor),
    mouthScale:             pick(a.mouthScale, b.mouthScale),
    mouthHorizontalStretch: pick(a.mouthHorizontalStretch, b.mouthHorizontalStretch),
    mouthYPosition:         pick(a.mouthYPosition, b.mouthYPosition),
    mustacheType:      pick(a.mustacheType, b.mustacheType),
    beardType:         pick(a.beardType, b.beardType),
    facialHairColor:   pick(a.facialHairColor, b.facialHairColor),
    mustacheScale:     pick(a.mustacheScale, b.mustacheScale),
    mustacheYPosition: pick(a.mustacheYPosition, b.mustacheYPosition),
    glassesType:      pick(a.glassesType, b.glassesType),
    glassesColor:     pick(a.glassesColor, b.glassesColor),
    glassesScale:     pick(a.glassesScale, b.glassesScale),
    glassesYPosition: pick(a.glassesYPosition, b.glassesYPosition),
    moleEnabled:   pick(a.moleEnabled, b.moleEnabled),
    moleScale:     pick(a.moleScale, b.moleScale),
    moleXPosition: pick(a.moleXPosition, b.moleXPosition),
    moleYPosition: pick(a.moleYPosition, b.moleYPosition),
  }
}