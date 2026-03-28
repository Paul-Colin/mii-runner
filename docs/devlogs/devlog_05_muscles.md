# Mii Genetic Runner — Devlog #5 : Limites articulaires + MiiMuscles (Demo 10)

## Contexte

Suite du Devlog #4. Le ragdoll existait mais sans limites angulaires — les membres pouvaient prendre des poses anatomiquement impossibles. L'objectif de cette session : ajouter des limites réalistes aux joints, construire le système de contrôle moteur (`MiiMuscles`) et valider interactivement chaque articulation via la Demo 10.

---

## Limites articulaires — résolution du problème d'explosion

### Le problème hérité

Le Devlog #4 documentait une explosion physique (centre de masse y = 498 000+) lorsque des joints revolute étaient utilisés. La cause : les segments de jambe adjacents avaient des `initialQuat` incompatibles — le bassin pointait vers le haut (Q_up ≈ identity) et le segment cuisse pointait vers le bas (rotation 180° autour de Z). RAPIER mesurait une déviation angulaire de ~180° sur les axes contraints dès la création du joint → impulsion corrective massive.

### Solution : normalisation des orientations

Tous les segments de jambe ont été **retournés** pour pointer de DISTAL → PROXIMAL (vers le haut), alignant leur `initialQuat` sur Q_up ≈ identity :

```
Avant : thigh_l = foot_l1 → foot_l2  (hanche → genou = vers le bas)
Après : thigh_l = foot_l2 → foot_l1  (genou → hanche = vers le haut)
```

Avec tous les segments adjacents à Q_up ≈ identity, l'angle initial sur les axes contraints est ≈ 0° → aucune impulsion corrective → pas d'explosion.

**Invariance de MiiRagdoll :** la formule de synchronisation visuelle `delta = physCurrentQ × physRestQ⁻¹` est invariante à l'inversion du segment. Le rendu visuel est identique.

### Joints par type

| Joint | Type | Axe | Limites |
|---|---|---|---|
| `spine` | Revolute | +X | [-20°, +30°] |
| `neck` | Fixed | — | — |
| `hip_l/r` | Ball (Generic) | — | AngX [-25°,150°], AngY [-40°,40°], AngZ [-45°,25°] |
| `knee_l/r` | Revolute | +X | [0°, 150°] |
| `ankle_l/r` | Revolute | +X | [-35°, 50°] |
| `shoulder_l/r` | Sphérique | — | libres |
| `elbow_l` | Revolute | +Z | [0°, 145°] |
| `elbow_r` | Revolute | **-Z** | [0°, 145°] |

### Hanches — ball joint (GenericJoint RAPIER)

Les hanches nécessitent 2 degrés de liberté (flexion/extension + abduction/adduction). `JointData.spherical` ne supporte pas les limites angulaires ; `JointData.revolute` n'a qu'un DOF. Solution : `JointData.generic` avec toutes les translations verrouillées + limites via l'API raw WASM :

```ts
const params = RAPIER.JointData.generic(
  pa, ca, { x: 1, y: 0, z: 0 },
  RAPIER.JointAxesMask.LinX | RAPIER.JointAxesMask.LinY | RAPIER.JointAxesMask.LinZ
)
joint = world.createImpulseJoint(params, parentSeg.body, childSeg.body, true)
const rs = (joint as any).rawSet
rs.jointSetLimits(joint.handle, 3, angX.min, angX.max)  // AngX = sagittal
rs.jointSetLimits(joint.handle, 5, angZ.min, angZ.max)  // AngZ = frontal
```

### Correction physique globale

- **Solver iterations :** 4 → 12 (ragdoll complexe avec limites nécessite plus d'itérations pour stabiliser les contraintes)
- **Sol physique :** décalé de -0.1 en Y pour aligner la surface physique (RAPIER) avec la surface visuelle (Three.js y=0)
- **Impulse de poussée Demo 09 :** 80 → 18 (masse du bassin ≈ 0.15 u ; 80 donnait ~533 m/s → breakdown des joints)

### Axes genou/cheville — convention après flip

Le corps GLB Mii est orienté vers -Z (convention standard GLB). Pour une flexion anatomique correcte :
- Rotation positive autour de +X : segment +Y → +Z = vers l'arrière du Mii = correct
- Axe `-X` (précédent) produisait l'effet inverse → genoux qui pliaient en avant

Pour les coudes, le bras gauche pointe en +X et le bras droit en -X. Pour une flexion symétrique (avant-bras monte vers +Y des deux côtés) :
- Coude gauche : axe +Z ✓
- Coude droit : axe **-Z** (le +Z produisait une flexion inversée)

---

## MiiMuscles — interface de contrôle normalisée

### Principe

`MiiMuscles` est la **couche NN → physique** : il traduit les sorties du réseau de neurones (valeurs ∈ [-1, 1]) en angles cibles d'articulation via `configureMotorPosition`.

```
setTarget(name, t)   t ∈ [-1, 1]
   t = -1  →  angle minimum du joint
   t =  0  →  milieu de la plage
   t = +1  →  angle maximum du joint
```

Dénormalisation :
```ts
targetRad = def.min + (t + 1) * 0.5 * (def.max - def.min)
```

### 11 muscles exposés

| Muscle | Joint | DOF | Plage |
|---|---|---|---|
| `spine` | spine | sagittal | [-20°, +30°] |
| `hip_l/r_flex` | hip_l/r | AngX sagittal | [-25°, 150°] |
| `hip_l/r_abduct` | hip_l/r | AngZ frontal | [-45°, +25°] |
| `knee_l/r` | knee_l/r | flexion | [0°, 150°] |
| `ankle_l/r` | ankle_l/r | plantar/dorsi | [-35°, 50°] |
| `elbow_l/r` | elbow_l/r | flexion | [0°, 145°] |

### Moteurs

- **RevoluteImpulseJoint** (spine, genoux, chevilles, coudes) : `joint.configureMotorPosition(target, stiffness, damping)`
- **GenericImpulseJoint** (hanches) : pas d'API haut niveau → accès raw WASM :
  ```ts
  (joint as any).rawSet.jointConfigureMotorPosition(handle, axis, target, stiffness, damping)
  ```

Calibration : `stiffness = 25`, `damping = 5` (pour `MII_SCALE = 0.155`, masses ≈ 0.1–0.4 u).

### Vecteur d'actions NN

```ts
muscles.setActions(Float32Array)  // longueur = getMuscleCount() = 11
```

L'ordre suit `Object.keys(MUSCLE_DEFS)` — fixe et documenté, compatible avec la couche de sortie du réseau.

---

## Demo 10 — test interactif des muscles

Panneau de sliders permettant de piloter chaque muscle manuellement — exactement ce que fera le NN en inférence.

**Interface :**
- Sliders groupés par zone (Tronc / Hanche G & D / Genou-Cheville G & D / Coudes)
- Chaque slider : plage [-1, 1], pas 0.01, affichage de l'angle cible en degrés
- Bouton reset + raccourci [R]

**Contrôles :**
- `[Espace]` — activer/désactiver la gravité
- `[R]` — reset tous les muscles à 0
- `[D]` — debug capsules
- `[F]` — caméra libre

---

## Problèmes rencontrés

### `sliderEntries` accessed before initialization

`buildPanel()` référençait `sliderEntries` via une closure, mais la déclaration `const sliderEntries` apparaissait après l'appel à `buildPanel()` dans le flux d'exécution. `const` n'est pas hoisted — ReferenceError (Temporal Dead Zone). Fix : déplacer la déclaration avant l'appel.

### Collision groups manquants → Mii projeté aléatoirement

Les colliders des capsules du squelette interagissaient entre eux. Fix : `setCollisionGroups(0x00020004)` (membership = groupe 2, filtre = groupe 1) → les segments ne se collisionnent pas entre eux mais interagissent avec le sol.

---

## Fichiers créés / modifiés

| Fichier | Changement |
|---|---|
| `packages/core/src/character/MiiSkeleton.ts` | Segments de jambe retournés (distal→proximal) ; joints ball pour hanches (GenericJoint + raw API) ; axes genou/cheville corrigés (+X) ; coude droit corrigé (-Z) ; `joints` Map nommée pour accès muscles |
| `packages/core/src/character/MiiMuscles.ts` | Nouveau — 11 muscles, API normalisée [-1,1], moteurs position RAPIER |
| `packages/core/src/character/MiiLoader.ts` | Scale tête réduit (× 0.75) |
| `packages/core/src/index.ts` | Export `MiiMuscles`, `MUSCLE_DEFS` |
| `packages/core/src/engine/PhysicsWorld.ts` | Solver iterations 4→12 ; sol décalé -0.1 Y |
| `packages/simulation/src/demos/demo-10-muscles.ts` | Nouveau — UI sliders test muscles |
| `packages/simulation/src/main.ts` | Entrées Demo 09 et 10 dans le registre |
