# Mii Genetic Runner — Devlog #1 : Le MiiLoader

## Contexte du projet

**Mii Genetic Runner** est une simulation d'apprentissage par algorithme génétique où des personnages Mii de Nintendo apprennent à courir. Le projet repose sur un moteur maison combinant **Rapier** (physique) et **Three.js** (rendu 3D), organisé en monorepo npm workspaces :

```
packages/
  core/        → @mii-engine/core (moteur, loaders, données)
  simulation/  → démos visuelles
```

Au moment où ce devlog commence, les démos 01 à 04 sont terminées (physique de base, squelette humanoïde, muscles & énergie, morphologies T/P/M). L'étape suivante : habiller le squelette avec de vrais **visages Mii Nintendo** via une API 3D.

---

## Étape 1 — Choix d'architecture

**Décisions prises :**
- `MiiLoader` dans `@mii-engine/core` (réutilisable par toutes les démos)
- TypeScript (cohérent avec le reste du projet)
- Démo 05 = test isolé du loader sans squelette physique

**Source principale :** documentation `mii-loader-implementation.md` fournie en contexte projet, et l'API publique `https://mii-unsecure.ariankordi.net` (serveur FFL-Testing par ariankordi).

---

## Étape 2 — Encodage FFSD : le cauchemar

Le format **FFSD** (FFLStoreData) est le format binaire de 96 octets utilisé par Nintendo pour stocker les données d'un Mii (Wii U / 3DS). Pour appeler l'API, il faut encoder les données du Mii en FFSD puis le passer en hexadécimal dans la requête.

### Tentative 1 — `mii-js` (PretendoNetwork)

La lib `@pretendonetwork/mii-js` fait exactement ça. Problème : elle utilise l'API `Buffer` de Node.js, qui n'existe pas dans le navigateur.

**Erreur rencontrée :**
```
ReferenceError: Buffer is not defined
```

**Tentative de fix :** `vite-plugin-node-polyfills` — incompatible avec Vite 8.

**Tentative suivante :** inject `Buffer` via `define` dans `vite.config.ts` — partiellement fonctionnel, mais `struct-fu` (dépendance interne de `mii-js`) ne reconnaissait pas le `Buffer` polyfillé comme un vrai `Buffer` Node.js.

**Erreurs successives rencontrées avec `mii-js` :**
```
Must specify a valid BitView, ArrayBuffer or Buffer
Invalid Mii eyebrow Y position. Got 0, expected 3-18
Invalid flip hair flag. Got 0, expected true or false
RangeError: offset is out of bounds (writeUTF16String)
```

Chaque fix en amenait un autre. `mii-js` est très strict sur les types (booléens vs entiers, plages de valeurs exactes) et son `encode()` alloue son propre buffer interne — difficile à patcher sans modifier la lib.

### Tentative 2 — Encodage natif (BitWriter maison)

**Décision :** abandonner `mii-js` et implémenter l'encodage FFSD manuellement avec `Uint8Array` et un `BitWriter` en pur JavaScript browser.

Un FFSD de référence valide de 96 octets a été fourni manuellement comme base :
```
03810040000000000000000080ff7099...ff50
```

L'encodage utilise ce buffer comme base et patch les champs par-dessus avec un `BitWriter` custom (lecture/écriture bit à bit, support little/big endian, CRC16-XMODEM sur 94 octets).

**Difficulté clé :** le format FFSD est peu documenté. Il a fallu croiser plusieurs sources : la lib `mii-js`, le code de `mii-creator` (datkat21), et le projet `nwf-mii-cemu-toy` (ariankordi). La position des champs au niveau du bit n'est pas triviale.

---

## Étape 3 — L'API ne fait que la tête

**Premier succès :** avec `verifyCharInfo=0` et le type `all_body`, l'API répond enfin en 200. Mais un nouveau problème apparaît.

### Découverte critique

Peu importe le type passé à l'API (`face`, `all_body`, `ffliconwithbody`, `variableiconbody`, `drawStageMode=body_only`...) — **l'endpoint `/miis/image.glb` ne retourne que la tête**.

Le corps en GLB n'est tout simplement pas supporté par ce serveur. Les tests dans gltf-viewer confirment :
- `all_body` → tête seulement
- `drawStageMode=body_only` → `"This model contains no scene"`

**Ce que fait mii-creator :** ils utilisent leur propre fork hébergé (`datkat21/FFL-Testing-with-hats`) + le corps en PNG (`type=all_body_sugar`) pour les previews statiques. Le corps 3D dans leur app vient de **modèles GLB statiques inclus dans le repo** (`miiBodyM_wiiu.glb`, `miiBodyF_wiiu.glb`).

**Impact sur le projet :** le corps sera géré par le squelette Rapier (capsules) — c'était prévu dans les specs. La tête GLB reste la pièce maîtresse.

---

## Étape 4 — Éclairage PBR

Les matériaux du GLB Mii sont en `MeshStandardMaterial` (PBR). Dans Three.js, les `AmbientLight` et `DirectionalLight` ont peu d'effet sur ce type de matériaux sans IBL.

**Solution :** `PMREMGenerator` + `RoomEnvironment` de Three.js pour générer un environment map IBL. C'est ce que fait gltf-viewer par défaut, d'où la bonne luminosité là-bas.

**Difficulté :** le `WebGLRenderer` interne est encapsulé dans le `Renderer.ts` du projet. Workaround temporaire : `AmbientLight(5.0)` + lumière directionnelle, puis migration vers IBL correcte dans la démo.

**Autre problème d'orientation :** les têtes regardaient vers la caméra par défaut — pas besoin de `setRotationY(Math.PI)` contrairement à ce qui avait été tenté. La rotation à 0 est la bonne.

---

## Étape 5 — MiiData cohérent (Démo 06)

`randomMiiData()` génère des Miis aux proportions absurdes : bouche au-dessus du nez, sourcils dans les yeux, etc.

**Contrainte anatomique clé :** dans le FFSD, une valeur Y plus grande = plus bas sur le visage. Donc :
```
eyebrowYPosition < eyeYPosition < noseYPosition < mouthYPosition
```

**Autre piège :** `mustacheYPosition` est **inversé** — 0 = bas, 16 = haut. Pour placer la moustache entre le nez et la bouche, il faut une valeur entre 8 et 14.

**Fonction `coherentMiiData()`** créée avec :
- Zones Y garanties par ordre anatomique
- Couleur de sourcils = couleur de cheveux (70% du temps)
- Maquillage féminin uniquement, moustache/barbe masculine uniquement

---

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `packages/core/src/character/MiiData.ts` | Interface + `DEFAULT_MII_DATA` + `randomMiiData()` + `coherentMiiData()` + `crossoverMiiData()` |
| `packages/core/src/character/MiiHeadLoader.ts` | Loader Three.js — encode FFSD → appel API FFL → GLB |
| `packages/simulation/src/demos/demo-05-mii.ts` | 5 Miis en rangée, IBL, boutons genre |
| `packages/simulation/src/demos/demo-06-coherent.ts` | Comparaison `coherentMiiData()` vs `randomMiiData()` |

---

## Sources utilisées

- **API FFL :** `https://mii-unsecure.ariankordi.net` par ariankordi (GitHub: `ariankordi/FFL-Testing`)
- **mii-creator :** `https://github.com/datkat21/mii-creator` — source principale pour comprendre les URLs, types, et paramètres
- **mii-js :** `https://github.com/PretendoNetwork/mii-js` — référence pour le format FFSD (abandonné en runtime, utilisé comme doc)
- **Swagger API :** doc JSON complète fournie manuellement (l'URL Swagger ne chargeait pas via fetch)
