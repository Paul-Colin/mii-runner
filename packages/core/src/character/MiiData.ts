// packages/core/src/character/MiiData.ts

export interface MiiData {
  miiName:      string
  creatorName:  string
  gender:       number   // 0–1
  birthMonth:   number   // 0–12
  birthDay:     number   // 0–31
  favoriteColor: number  // 0–11
  favorite:     boolean
  height:       number   // 0–127
  build:        number   // 0–127

  faceType:     number   // 0–11
  skinColor:    number   // 0–5
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
  favoriteColor: 0,
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
// Utilitaire : entier aléatoire dans [min, max] inclus
// ─────────────────────────────────────────────────────────────────────────────

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
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
    favoriteColor: ri(0, 11),
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

    mustacheType:      Math.random() < 0.1 ? ri(1, 5) : 0,
    beardType:         Math.random() < 0.1 ? ri(1, 5) : 0,
    facialHairColor:   ri(0, 7),
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
// Crossover visuel pour l'algo génétique (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

export function crossoverMiiData(a: MiiData, b: MiiData): MiiData {
  function pick<T>(va: T, vb: T): T {
    return Math.random() < 0.5 ? va : vb
  }
  const mutate = (val: number, min: number, max: number): number =>
    Math.random() < 0.05 ? ri(min, max) : val

  return {
    miiName:       pick(a.miiName, b.miiName),
    creatorName:   '',
    gender:        pick(a.gender, b.gender),
    birthMonth:    0,
    birthDay:      0,
    favoriteColor: pick(a.favoriteColor, b.favoriteColor),
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