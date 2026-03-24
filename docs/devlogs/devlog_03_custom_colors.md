# Mii Genetic Runner — Devlog #3 : Palette de couleurs personnalisée

## Contexte

Après le Devlog #2, les Miis ont un corps complet avec les 12 couleurs favorites standards de Nintendo. L'objectif de cette session : étendre la palette avec les ~100 couleurs de la Switch, corriger un bug de couleur de peau, et explorer jusqu'où on peut pousser les overrides de couleur sur le rendu FFL.

---

## Bug corrigé : décalage de couleur de peau entre tête et mains

### Problème

Les mains (issues du GLB corps statique) avaient parfois une couleur de peau différente de la tête (rendue par l'API FFL). Cause : le champ `skinColor` dans le FFSD est encodé sur **3 bits** (valeurs 0–7 max), et Nintendo n'utilise officielement que 0–5. Notre générateur aléatoire utilisait `ri(0, 9)` — les valeurs 8 et 9 se tronquaient à 0 et 1 dans le FFSD, donc la tête recevait une couleur différente des mains qui lisaient la valeur pre-troncature.

**Fix :** `skinColor: ri(0, 5)` dans `randomMiiData()` et `coherentMiiData()`.

---

## Palette Switch étendue — `SwitchMiiColorTable`

En explorant `mii-creator-dev/src/constants/ColorTables.ts`, on trouve `SwitchMiiColorTable` : **100 couleurs hex** issues de la Switch, couvrant tout le spectre (primaires, pastels, tons skin, matières, etc.). C'est bien plus riche que les 12 couleurs favorites standards.

On crée `packages/core/src/character/MiiColorPalette.ts` avec :
- `SWITCH_BODY_COLORS` : les 100 hex (plus une couleur bonus = 101 entrées)
- `randomSwitchColor()` : tire une couleur aléatoire de cette palette

---

## Architecture couleurs custom dans MiiData

On ajoute 4 champs optionnels à `MiiData` :

```typescript
favoriteColorHex: string | null  // override couleur corps/haut
customHairHex:    string | null  // override cheveux (palette Switch)
customEyeHex:     string | null  // réservé — voir limitation ci-dessous
customGlassesHex: string | null  // override lunettes (tentative — voir ci-dessous)
```

Dans `coherentMiiData(gender?, nameSuffix?, customColors = false)`, le paramètre `customColors` active la génération de ces couleurs via `randomSwitchColor()`.

---

## Overrides post-chargement dans MiiLoader

Le GLB généré par l'API FFL expose `geometry.userData.modulateType` sur chaque mesh. Cela permet d'identifier les parties :

| Mesh | modulateType | mat.color | mat.map | Override possible |
|---|---|---|---|---|
| `OpaHair` | 4 | hairColor (hex) | false | ✅ `mat.color.setStyle(hex)` |
| `XluGlass` | 8 | `#ffffff` (blanc) | true | ⚠️ complexe (voir ci-dessous) |
| `XluMask` | 6 | blanc | true | ❌ couleurs baked dans texture |
| `OpaFaceline` | 0 | blanc | true | ❌ peau baked dans texture |
| `OpaForehead` | 3 | skinColor | false | — |

### Cheveux — ✅ Fonctionne

`OpaHair` n'a pas de texture (`mat.map = false`) et `mat.color` contient directement la couleur des cheveux. Un simple `mat.color.setStyle(customHairHex)` suffit.

### Lunettes — ⚠️ Tentative non concluante

Le mesh `XluGlass` a `mat.color = #ffffff` (blanc) et `mat.map = true`. Le GLTF exporte `baseColorFactor = white`, et la couleur des lunettes est **baked dans les pixels de la texture** (avec `modulateColor` comme multiplicateur dans l'espace linéaire).

J'ai tenté une approche `recolorTexture` inspirée de la fonction `multiplyTexture` de mii-creator : recalculer chaque pixel avec le ratio `customColor / modulateColor`. En théorie correct, en pratique le résultat cassait le rendu des lunettes (artefacts visuels) sans changer la couleur de manière satisfaisante. **Abandonné pour cette session.**

### Yeux / sourcils / lèvres — ❌ Impossible par override material

`XluMask` (type=6) est un **unique mesh** qui regroupe tous les traits du visage. `modulateColor = [1,1,1,1]` et `modulateMode = 1` : les couleurs des yeux, sourcils et lèvres sont **entièrement baked dans la texture** par l'API FFL lors de la génération. `material.color` tinte uniquement le blanc de l'œil / les zones lumineuses, pas l'iris.

La vraie solution (utilisée par mii-creator) : modifier `eyeColor` (0–5) dans le FFSD et re-requêter l'API → nouveau GLB avec la couleur baked. Les 6 couleurs standard d'iris sont donc déjà fonctionnelles via `eyeColor: ri(0, 5)` dans `coherentMiiData`.

---

## Amélioration de l'éclairage de la scène

Three.js r155+ utilise des lumières physiques (intensités en candelas). La scène apparaissait sombre avec les anciennes valeurs non-physiques.

**Fix dans `Renderer.ts` :**
- `outputColorSpace = THREE.SRGBColorSpace`
- `toneMapping = THREE.ACESFilmicToneMapping` + `toneMappingExposure = 1.2`
- Intensités multipliées par `Math.PI` pour retrouver la luminosité attendue
- Fond bleu ciel (`#87c0d0`) + sol vert clair (`#6abf7a`)
- IBL pmrem : `fromScene(roomEnv, 0.25)` (était `0.04`)

---

## Démo 08 — Palette Switch étendue

8 Miis aléatoires générés avec `coherentMiiData(gender, suffix, true)` :
- Corps coloré avec `favoriteColorHex` (palette Switch)
- Cheveux colorés avec `customHairHex` (palette Switch)
- Miis pairs : lunettes forcées + `customGlassesHex` (tentative override)
- Labels HTML avec swatches de couleur inline
- Bouton "Nouveaux Miis" pour régénérer tout

---

## Ce qui reste à faire (couleurs)

- **Lunettes couleurs custom** : l'approche `recolorTexture` (ratio pixel-par-pixel) est la bonne direction mais nécessite plus d'investigation sur la structure exacte de la texture `XluGlass` (espace colorimétrique, si la texture est un masque blanc ou des pixels pré-colorés). Alternative propre : passer `glassesColor` (0–5) via le FFSD → 6 couleurs standard déjà fonctionnelles.
- **Moustache / barbe / lèvres** : identique à `XluMask` — baked dans la texture, non modifiable sans re-requête API.

---

## Fichiers créés / modifiés

| Fichier | Changement |
|---|---|
| `packages/core/src/character/MiiColorPalette.ts` | Nouveau — 101 couleurs Switch + `randomSwitchColor()` |
| `packages/core/src/character/MiiData.ts` | + `favoriteColorHex`, `customHairHex`, `customEyeHex`, `customGlassesHex` ; fix `skinColor` range 0–5 |
| `packages/core/src/character/MiiLoader.ts` | Override cheveux via `mat.color` ; investigation lunettes |
| `packages/core/src/engine/Renderer.ts` | Éclairage physique correct, fond/sol plus clairs |
| `packages/simulation/src/demos/demo-08-mii-custom.ts` | Nouveau — 8 Miis palette Switch |
| `packages/core/src/index.ts` | Export `MiiColorPalette` |

---

## Sources consultées

- **mii-creator/src/constants/ColorTables.ts :** `SwitchMiiColorTable` (100 couleurs)
- **mii-creator/src/class/3d/canvas/multiplyTexture.ts :** approche recoloration texture pixel par pixel
- **mii-creator/src/class/3d/shader/ShaderUtils.ts :** traversée des meshes FFL, lecture `geometry.userData.modulateType/modulateMode/modulateColor`
- **mii-creator/src/ui/tabs/Eye.ts & Glasses.ts :** confirmation que mii-creator re-requête l'API FFL pour changer les couleurs yeux/lunettes (pas d'override post-load)
