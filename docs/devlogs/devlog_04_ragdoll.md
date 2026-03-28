# Mii Genetic Runner — Devlog #4 : Ragdoll physique (Demo 09)

## Contexte

Après le Devlog #3, les Miis sont visuellement complets (tête FFL + corps GLB + couleurs custom). L'objectif de cette session : donner un comportement physique réaliste aux Miis — un ragdoll piloté par RAPIER — pour préparer le terrain à l'apprentissage de la marche/course.

---

## Architecture générale

Le système ragdoll repose sur trois composants :

```
MiiSkeleton   — squelette RAPIER (corps rigides + joints)
MiiRagdoll    — synchronise le visuel GLB sur la physique
Demo 09       — scène de test interactive
```

---

## MiiSkeleton — squelette physique adapté au Mii

### Principe

Plutôt qu'un squelette générique aux dimensions fixes, `MiiSkeleton` **lit les positions world des bones du GLB** après chargement pour placer les corps RAPIER exactement aux bonnes coordonnées. Il s'adapte donc automatiquement à toute morphologie Mii (height/build du FFSD).

### Segments

13 capsules RAPIER couvrent le corps :

| Segment | Bones GLB utilisés | Rôle |
|---|---|---|
| `hip` | `hip_joint_center` → `waist` | Bassin |
| `torso` | `waist` → `head_ffl` | Tronc + cou |
| `head` | `head_ffl` → `head_top` | Tête (boîte englobante FFL) |
| `thigh_l/r` | `foot_l1` → `foot_l2` | Cuisse |
| `shin_l/r` | `foot_l2` → `ankle_l/r` | Tibia |
| `foot_l/r` | `ankle_l/r` → extrémité calculée | Pied |
| `upper_arm_l/r` | `arm_l1` → `arm_l2` | Bras |
| `fore_arm_l/r` | `arm_l2` → `wrist_l/r` | Avant-bras |

Chaque capsule est orientée par `setFromUnitVectors(Y_UP, direction_segment)`. La taille de la capsule est proportionnelle à la longueur inter-bones.

### Paramètres physiques

- `setGravityScale(0)` au démarrage — la gravité est activée à la demande via `enableGravity()`
- `setLinearDamping(6.0)` / `setAngularDamping(15.0)` — amorti pour limiter les mouvements brusques
- `setSoftCcdPrediction(0.5)` — évite les tunnelling à grande vitesse

### Joints

Joints sphériques (`JointData.spherical`) entre chaque paire de segments. Les joints sphériques contraignent uniquement la **position** de l'ancrage (pas l'orientation), ce qui évite une explosion physique inévitable avec les joints revolute.

**Pourquoi pas de joints revolute ?**

Les joints revolute contraignent 2 des 3 axes de rotation. Or, les segments adjacents ont des `initialQuat` incompatibles : par exemple, `hip` pointe vers le haut (identity) et `thigh` pointe vers le bas (rotation 180° autour de Z). RAPIER mesure immédiatement une déviation angulaire hors de l'axe autorisé et applique une impulsion corrective massive → explosion (centre de masse y=498 000+). Les joints sphériques évitent ce problème en laissant toute rotation libre à l'ancrage.

**Limitation actuelle :** sans limites angulaires, des poses impossibles restent possibles (jambes qui se croisent, membres qui traversent le corps). À corriger dans une session future.

---

## MiiRagdoll — synchronisation visuelle

### Principe (approche hybride)

Le visuel Mii n'est pas "attaché" aux corps RAPIER par un simple parenting : les bones GLB sont pilotés frame par frame depuis la physique.

```
1. Root group  ← position + rotation du segment "torso"
2. Bones GLB   ← rotation par delta physique (parent→enfant, ordre strict)
3. HeadGroup   ← position + rotation depuis le segment "head"
```

### Formule de rotation par bone

```ts
delta       = physCurrentQ × physRestQ⁻¹         // variation depuis le repos
targetWorldQ = delta × boneRestWorldQ             // orientation world cible du bone
bone.quaternion = parentCurrentWorldQ⁻¹ × targetWorldQ  // en local du parent
bone.updateMatrixWorld(true)                      // MAJ pour les enfants suivants
```

L'état de repos (T-pose) est capturé à la construction de `MiiRagdoll`.

### Ancrage du tronc

Le `root.position` est dérivé du bas du segment `torso` (= position du bone `waist` = hanches), pas du centre du segment. Sinon le Mii "flottait" de moitié de la hauteur du tronc.

### Tête FFL

La tête FFL (`headGroup`) n'est pas un bone GLB standard — elle est un `THREE.Group` indépendant. Sa position est dérivée du bas du segment `head` (= `head_ffl` = jonction cou/tête), et sa rotation suit le delta du segment `head` RAPIER.

---

## Démo 09 — scène ragdoll interactive

**Contrôles :**
- `[Espace]` — active la gravité + pousse le Mii (impulse sur le bassin)
- `[D]` — affiche/masque les capsules de debug (semi-transparentes)
- `[R]` — recharge la page (reset)
- `[F]` — bascule la caméra libre

Le Mii démarre debout en T-pose (gravity scale = 0), figé dans cette pose jusqu'à l'appui sur Espace. La boucle affiche en temps réel : FPS, centre de masse Y, et si le Mii est encore "debout".

---

## Problèmes rencontrés et leçons

### Explosion physique (y = 498 000+)

Cause identifiée : les joints revolute avec `setLimits()` ET/OU `configureMotorPosition()` causent une explosion immédiate car les segments adjacents ont des orientations incompatibles à la création du joint (angle initial ≠ 0 dans le frame du joint).

Solution : joints sphériques uniquement pour l'instant.

### Désynchronisation tête / corps

La tête FFL (groupe Three.js autonome) dérivait du corps après quelques frames. Fix : ancrage sur le bas du segment `head` (et non le centre), + rotation delta depuis le repos du segment `head`.

### Tête trop grande pour les Miis petits

La tête FFL est générée indépendamment du corps — son scale ne tient pas compte de la taille du Mii. Fix dans `MiiLoader` :

```ts
const scaleHeight     = data.height * 0.006015625 + 0.5
const headScaleFactor = 0.7 + 0.3 * scaleHeight
head.group.scale.multiplyScalar(headScaleFactor)
```

### headGroup manquant dans MiiInstance

`MiiRagdoll` a besoin de piloter le `headGroup` directement. Le champ `headGroup: THREE.Group` a été ajouté à l'interface `MiiInstance` et au retour de `MiiLoader.load()`.

---

## Ce qui reste à faire (ragdoll)

- **Limites angulaires sans explosion** : trouver une approche qui fonctionne avec les orientations réelles des segments — par exemple normaliser tous les segments pour qu'ils aient le même `initialQuat` (Y_UP, identity) et gérer l'orientation visuellement, ou utiliser des joints génériques RAPIER avec frame custom.
- **Auto-collision** : empêcher les membres de se traverser (groupes de collision exclusifs entre segments).
- **Pose de repos stable** : maintenir la T-pose par des moteurs articulaires calibrés (pour préparer le RL).

---

## Fichiers créés / modifiés

| Fichier | Changement |
|---|---|
| `packages/core/src/character/MiiSkeleton.ts` | Nouveau — squelette RAPIER adapté au Mii |
| `packages/core/src/character/MiiRagdoll.ts` | Nouveau — synchronisation visuel ↔ physique |
| `packages/core/src/character/MiiLoader.ts` | + `headGroup` dans `MiiInstance` ; scale tête proportionnel à la taille |
| `packages/core/src/index.ts` | Export `MiiSkeleton`, `MiiRagdoll`, `MiiSegment` |
| `packages/core/tsconfig.json` | Exclure `*.test.ts` / `*.spec.ts` (fix erreurs de build) |
| `packages/simulation/src/demos/demo-09-ragdoll.ts` | Nouveau — démo ragdoll interactive |
