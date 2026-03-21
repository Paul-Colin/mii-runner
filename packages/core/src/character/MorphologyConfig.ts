export interface MorphologyInput {
  height: number
  weight: number
  muscle: number
}

export interface MorphologyConfig {
  height: number
  weight: number
  muscle: number
  eMax: number
  fMaxBase: number
  contractionSpeedBase: number
  segmentScale: number
  massScale: number
}

export interface MorphologyConstraints {
  heightMin: number
  heightMax: number
  weightMin: number
  weightMax: number
  muscleMin: number
  muscleMax: number
  kPoids: number
  kMuscle: number
  fMaxBase: number
  contractionSpeedBase: number
}

const DEFAULT_CONSTRAINTS: MorphologyConstraints = {
  heightMin: 1.40,
  heightMax: 2.00,
  weightMin: 40,
  weightMax: 120,
  muscleMin: 0.5,
  muscleMax: 2.0,
  kPoids: 8,
  kMuscle: 15,
  fMaxBase: 800,
  contractionSpeedBase: 1200,
}

export function validateMorphology(
  input: MorphologyInput,
  constraints: Partial<MorphologyConstraints> = {}
): MorphologyConfig {
  const c = { ...DEFAULT_CONSTRAINTS, ...constraints }

  // 1. Clamp height
  const height = Math.max(c.heightMin, Math.min(c.heightMax, input.height))

  // 2. Clamp le poids demandé dans ses bornes absolues
  const weightRequested = Math.max(c.weightMin, Math.min(c.weightMax, input.weight))

  // 3. Calculer muscle max basé sur le poids DEMANDÉ par l'utilisateur
  //    C'est ce qui empêche M=2.0 avec P=40kg
  const mMaxFromWeight = (weightRequested - height * 20) / 20
  const muscle = Math.max(
    c.muscleMin,
    Math.min(Math.min(c.muscleMax, mMaxFromWeight), input.muscle)
  )

  // 4. Calculer le poids final en tenant compte du muscle validé
  const pMin = height * 25 + muscle * 20
  const pMax = height * 40 + muscle * 35
  const weight = Math.max(
    Math.max(c.weightMin, pMin),
    Math.min(Math.min(c.weightMax, pMax), weightRequested)
  )

  const eMax = weight * c.kPoids + muscle * c.kMuscle
  const fMaxBase = c.fMaxBase * muscle
  const contractionSpeedBase = c.contractionSpeedBase * Math.sqrt(muscle)
  const segmentScale = height / 1.75
  const massScale = weight / 70

  return {
    height,
    weight,
    muscle,
    eMax,
    fMaxBase,
    contractionSpeedBase,
    segmentScale,
    massScale,
  }
}

export function getArchetype(config: MorphologyConfig): string {
  const { height, weight, muscle } = config
  const bmi = weight / (height * height)

  if (height >= 1.85 && bmi < 24 && muscle >= 0.9 && muscle <= 1.4) return 'Sprinteur élancé'
  if (bmi >= 26 && muscle >= 1.4) return 'Tank musclé'
  if (height <= 1.60 && bmi < 22) return 'Petit vif'
  if (height >= 1.90 && muscle < 0.9) return 'Géant lent'
  return 'Athlète équilibré'
}
