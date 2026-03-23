# Mii Genetic Runner — Devlog #2 : Le corps du Mii

## Contexte

Après le Devlog #1, on a une tête GLB fonctionnelle et des données Mii cohérentes. L'étape suivante : donner un **corps fidèle** aux Miis, en plus de leur tête générée par l'API FFL.

---

## Découverte des modèles GLB statiques de mii-creator

En explorant le repo `datkat21/mii-creator`, on trouve dans `public/assets/models/` :

```
miiBodyM_wiiu.glb    (289 Ko)
miiBodyF_wiiu.glb    (292 Ko)
miiBodyM_switch.glb  (189 Ko)
miiBodyF_switch.glb  (189 Ko)
miiBodyM_miitomo.glb (534 Ko)
miiBodyF_miitomo.glb (570 Ko)
```

Ces modèles sont **open source / publics** dans le repo. Ils contiennent le corps complet animé avec un squelette (bones), plusieurs animations (`Wait`, `Finish`...), et trois groupes de meshes : `body_m`, `legs_m`, `hands_m` (ou `_f` pour féminin).

**Code source clé :** `src/class/3DScene.ts` — le fichier de 1200 lignes qui orchestre tout le rendu 3D de mii-creator.

---

## Architecture choisie

On refactorise en 3 couches :

```
MiiLoader (orchestrateur)
  ├── MiiHeadLoader  → GLB tête depuis API FFL (inchangé)
  └── MiiBodyLoader  → GLB corps statique local
        ├── scaling height/build (formule Wii U)
        ├── couleurs matériaux (body/legs/hands)
        └── headBone → updateHeadTransform()
```

Et `MiiData` gagne deux nouveaux champs : `height: number` (0–127) et `build: number` (0–127), directement issus du format FFSD natif.

---

## Scaling du corps — formule Wii U

Dans `3DScene.ts` de mii-creator, mode `scaleApply` :

```typescript
scaleX = (build * (height * 0.003671875 + 0.4)) / 128.0
       + height * 0.001796875 + 0.4
scaleY = height * 0.006015625 + 0.5
scaleZ = scaleX
// Note: 1.0 scale ≈ build=82 / height=83
```

Cette formule est portée directement depuis le code Wii U officiel (via la décompilation FFL). Elle est appliquée sur le bone racine (`m` ou `f`) du corps.

**Mapping morphologie → FFSD :**
```typescript
// Corps GLB wiiu ~12.87 unités de hauteur
height_ffsd = lerp(30, 127, (heightM - 1.40) / 0.60)
build_ffsd  = lerp(20, 127, (muscle  - 0.50) / 1.50)
```

---

## Couleurs des matériaux

Portées depuis `mii-creator/src/constants/ColorTables.ts` et `fflShaderConst.ts` :

| Partie | Source |
|---|---|
| `body_m` / `body_f` | `favoriteColor` → table 12 couleurs hex |
| `legs_m` / `legs_f` | Gris (`#40464e`) / Rouge si favori / Or si spécial |
| `hands_m` / `hands_f` | `skinColor` → table 10 couleurs |

On utilise `MeshStandardMaterial` simple (roughness 0.85) pour éviter les shaders custom de mii-creator (FFL shader, Switch shader) qui nécessiteraient un renderer WebGL spécifique.

---

## Positionnement de la tête sur le head bone

### Problème

Dans mii-creator, la tête est ajoutée **directement à la scène** (world space). Leur code :
```typescript
headBone.matrixWorld.decompose(position, quaternion, scale)
GLB.scene.position.copy(position)  // world → world, ça marche
```

Dans notre architecture, la tête est **enfant du `root` group** qui a un scale global (ex: `0.13`). Donc copier directement la position world dans un espace local scalé donne un résultat faux — la tête se retrouve à une position complètement décalée.

**Fix :**
```typescript
const worldPos = new THREE.Vector3()
headBone.getWorldPosition(worldPos)
// Convertir world → local du parent (root)
target.parent.worldToLocal(worldPos.clone())
target.position.copy(worldPos)
```

### Problème de rotation

Le `skl_root` du GLB corps a une rotation de `-90°` sur X (`quaternion [-0.707, 0, 0, 0.707]`) — c'est ce qui redresse le modèle qui était couché dans l'espace de modélisation. Cette rotation se propage dans la `matrixWorld` du head bone.

Si on applique ce quaternion à la tête GLB, elle se retrouve couchée sur le côté ou retournée.

**Fix :** reset simple de la rotation à zéro — la tête GLB venant de l'API FFL est déjà orientée correctement debout.
```typescript
target.rotation.set(0, 0, 0)
```

---

## Scale global du Mii

Le corps GLB wiiu fait **~12.87 unités** de hauteur (mesuré via les accessors des meshes). Pour avoir un Mii à taille humaine dans la scène :

```
scale = 0.155 → Mii ≈ 2.0m  (cohérent avec squelette Rapier démo 04)
scale = 0.13  → Mii ≈ 1.67m (plus compact, lisible 3 côte à côte)
```

Ce scale est appliqué sur le `root` group du Mii. La tête (scale 0.12 local) et le corps (scale height/build interne) restent dans leur propre espace local — seul le root contrôle la taille finale.

---

## placeOnGround()

La bounding box du Mii varie selon le `height` FFSD. Pour poser les Miis sur le sol (Y=0) :

```typescript
root.updateWorldMatrix(true, true)
const box = new THREE.Box3().setFromObject(root)
if (box.min.y < 0.001) {
  root.position.y += -box.min.y + 0.001
}
```

---

## Résultat — Démo 07

Trois archétypes côte à côte, avec :
- Corps GLB fidèle (style Wii U)
- Tête GLB FFL générée depuis l'API
- Taille/corpulence pilotées par les stats T/P/M du moteur
- Couleurs body/legs/hands correctes

---

## Fichiers créés / modifiés

| Fichier | Changement |
|---|---|
| `packages/core/src/character/MiiData.ts` | + `height`, `build` (0–127) |
| `packages/core/src/character/MiiHeadLoader.ts` | + `loadHeadOnly()` (tête seule, sans ajout à la scène) |
| `packages/core/src/character/MiiBodyLoader.ts` | Nouveau — corps GLB + scaling + couleurs + headBone |
| `packages/core/src/character/MiiLoader.ts` | Nouveau orchestrateur — parallélise tête + corps, `scale` global, `placeOnGround()` |
| `packages/simulation/src/demos/demo-07-mii-full.ts` | Démo 3 archétypes Mii complets |
| `packages/simulation/public/assets/models/` | 4 GLB copiés depuis mii-creator |

---

## Sources utilisées

- **mii-creator/3DScene.ts :** logique complète du rendu corps+tête, scaling, matériaux, head bone sync
- **mii-creator/src/constants/ColorTables.ts :** tables hex des 12 couleurs favorites + 10 couleurs peau
- **mii-creator/src/class/3d/shader/fflShaderConst.ts :** tables FFL shader colors + couleurs pantalon
- **Analyse GLB (Python/struct) :** extraction des dimensions réelles du modèle pour calibrer le scale
