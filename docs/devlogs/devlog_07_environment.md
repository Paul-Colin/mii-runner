# Mii Genetic Runner — Devlog #7 : Environnement 3D (Demos Env 01 & 02)

## Contexte

Suite du Devlog #6 (choix d'architecture IA). Avant d'implémenter l'apprentissage, on construit l'environnement visuel : l'île Wuhu comme décor, une piste d'athlétisme modélisée dans Blender, et les Miis positionnés sur les couloirs de départ.

---

## Env 01 — Chargement de l'île Wuhu

### Fichier GLB

Le modèle de l'île Wuhu (Wii Sports Resort) est téléchargé depuis Sketchfab et déposé dans :
```
packages/simulation/public/assets/models/wuhu_island.glb
```

### Chargement Three.js

- Chargement via `GLTFLoader`
- Centrage automatique : bounding box calculée → `island.position` décalé pour centrer XZ à l'origine et poser le bas de l'île à Y=0
- Affichage du nombre de triangles et des dimensions dans le HUD

### Contrôles

| Touche | Action |
|---|---|
| [F] | Activer/désactiver la caméra libre |
| [G] | Afficher/masquer la grille de référence |
| [B] | Toggle wireframe |

### Réglages caméra libre

- AZERTY supporté via `e.code` (position physique des touches, indépendante du layout)
- Vitesse configurable via `setupFreeCamera(renderer, { speed })` — augmentée à 80 pour l'échelle de l'île (1414 unités)
- Bug corrigé : wireframe était sur `KeyW` → conflit avec Z/AZERTY → déplacé sur `KeyB`

---

## Modélisation Blender — Piste d'athlétisme

### Échelle

L'île Wuhu fait 1414 × 1414 unités dans Three.js. Après tests visuels, **10 unités Blender ≈ 100 m à l'échelle Wuhu**. La piste a donc été modélisée à **10 unités de long**.

### Géométrie

- 4 couloirs, largeur totale **1 unité** (0.25 u par couloir)
- Séparation des couloirs : faces distinctes dans Blender (Loop Cut `Ctrl+R`)
- Matériaux séparés par face pour les lignes blanches et le fond de piste

### Export

- Format : glTF 2.0 (`.glb`)
- Scale appliqué (`Ctrl+A > All Transforms`) avant export
- Intégré directement dans le même GLB que l'île : `ile_wuhu_pistev1.glb`

---

## Env 02 — Ligne de départ avec Miis

### Conversion de coordonnées Blender → Three.js

L'export glTF applique une rotation pour passer de Z-up (Blender) à Y-up (Three.js) :

```
Three.js X = Blender X
Three.js Y = Blender Z   (vertical)
Three.js Z = −Blender Y
```

### Positions de départ

Les positions ont été mesurées directement en Three.js via la caméra libre (coordonnées affichées en `.3f` dans le HUD) :

```ts
const LANE_X    = 26.26    // fixe sur tous les couloirs
const LANE_Y    = 2.08     // hauteur surface piste (calé visuellement)
const LANE_Z_0  = 6.985    // Z couloir 1
const LANE_STEP = 0.250    // espacement constant entre couloirs
```

Espacement Z mesuré sur 4 couloirs : 0.250 / 0.254 / 0.250 → très régulier, confirme la largeur uniforme de 0.25 u par couloir.

### Scale des Miis

Le scale standard `0.155` (1 unité ≈ 1 m) rend les Miis géants par rapport à l'île Wuhu. Scale réduit à **`0.015`** pour matcher l'échelle visuelle de la carte.

> ⚠️ Ce scale est uniquement pour la démo visuelle. La simulation physique (ragdoll + RL) reste calibrée à `0.155` dans les demos 09/10.

### Orientation

Les Miis sont orientés face à la piste :
```ts
mii.setRotationY(Math.PI / 2)  // 90° CCW — face à la direction de course
```

*(Initialement tenté à π/4 = 45°, corrigé à π/2 = 90° après vérification visuelle.)*

### Résultat final

4 Miis générés avec `coherentMiiData`, positionnés sur leur couloir respectif, faces à la piste, pieds au niveau de la surface.

---

## Fichiers créés / modifiés

| Fichier | Changement |
|---|---|
| `packages/simulation/src/demos/env-01-wuhu.ts` | Nouveau — chargement île Wuhu, free cam, grille, wireframe |
| `packages/simulation/src/demos/env-02-start.ts` | Nouveau — 4 Miis sur la ligne de départ |
| `packages/simulation/src/helpers/setupFreeCamera.ts` | + paramètre `options { speed, sensitivity }` |
| `packages/simulation/src/main.ts` | Enregistrement `env01` et `env02` + `export {}` pour module ES |
| `packages/simulation/index.html` | Liens nav Env 01 et Env 02 |
| `public/assets/models/ile_wuhu_pistev1.glb` | Modèle combiné île + piste (Blender) |

---

## Prochaines étapes

- Texturer la piste (couleur tartan + lignes de couloir)
- Ajouter le collider physique RAPIER sur la surface de la piste
- Connecter le ragdoll + MiiMuscles à la scène env-02 pour démarrer les simulations
