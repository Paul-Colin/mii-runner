# MiiLoader — Guide d'implémentation Three.js

## Contexte

Ce document décrit comment intégrer un loader de Mii Nintendo dans un projet Three.js existant. L'objectif est de charger des Miis (aléatoires ou définis par JSON) sous forme de modèles 3D GLB dans une scène Three.js.

---

## Architecture globale

```
JSON MiiData  ──[mii-js]──▶  Buffer FFSD (96 octets)  ──[hex]──▶  API HTTP  ──▶  GLB Three.js
     ▲                                                                                   │
     └───────────────────────────────────────────────────────────────────────────────────┘
              bufferToMiiData() permet la lecture inverse (hex → JSON)
```

### Composants

| Fichier | Rôle |
|---|---|
| `MiiData.js` | Schéma JSON, valeurs par défaut, plages valides, générateur aléatoire |
| `MiiLoader.js` | Conversion JSON↔FFSD via mii-js, appels API, chargement GLB dans la scène |

---

## Dépendances

```bash
npm install @pretendonetwork/mii-js
# three + GLTFLoader déjà présents dans le projet
```

---

## API externe : mii-unsecure.ariankordi.net

Le renderer Mii est une instance auto-hébergée de [FFL-Testing](https://github.com/ariankordi/FFL-Testing/tree/renderer-server-prototype), qui utilise la bibliothèque FFL officielle Nintendo décompilée.

### Endpoints utilisés

```
GET https://mii-unsecure.ariankordi.net/miis/image.glb
```

#### Paramètres principaux

| Paramètre | Valeur | Description |
|---|---|---|
| `type` | `face` \| `body` | `face` = tête+épaules, `body` = corps complet |
| `data` | `<hex FFSD>` | Données Mii en hexadécimal (96 octets = 192 caractères) |
| `shaderType` | `wiiu` \| `switch` \| `miitomo` | Style de rendu |
| `texResolution` | `512` | Résolution de la texture du visage |
| `width` | `512` | Largeur du rendu |
| `bgColor` | `FFFFFF00` | Fond transparent (RGBA hex) |

#### Rendu en deux appels

Le Mii complet nécessite **deux GLB séparés** chargés en parallèle :

```
/miis/image.glb?type=face&data=<hex>  →  tête
/miis/image.glb?type=body&data=<hex>  →  corps
```

La tête est ensuite positionnée au-dessus du corps via la bounding box.

> ⚠️ Ce serveur est public mais sans garantie de disponibilité. À terme, prévoir un fallback ou un self-hosting via Docker sur WSL2.

---

## Format des données Mii : FFSD

Le format **FFSD** (FFLStoreData) est le format natif Wii U / 3DS : un buffer de **96 octets** avec un CRC16 en octets 92-93.

On ne manipule **jamais** ces octets directement. La lib `mii-js` fait le mapping automatiquement.

---

## MiiData — Schéma JSON

Toutes les propriétés visuelles d'un Mii sont exposées comme un objet JSON plat. C'est la "source de vérité" : on le sauvegarde, on le transmet, on le modifie.

### Propriétés complètes

#### Méta / identité

| Propriété | Type | Min | Max | Défaut | Description |
|---|---|---|---|---|---|
| `miiName` | string | — | 10 chars | `"Mii"` | Nom du Mii (UTF-16) |
| `creatorName` | string | — | 10 chars | `""` | Nom du créateur |
| `gender` | number | 0 | 1 | `0` | 0 = garçon, 1 = fille |
| `birthMonth` | number | 0 | 12 | `0` | 0 = non défini |
| `birthDay` | number | 0 | 31 | `0` | 0 = non défini |
| `favoriteColor` | number | 0 | 11 | `0` | Couleur de vêtement (voir table ci-dessous) |
| `favorite` | boolean | — | — | `false` | Mii favori (pantalon rouge) |
| `height` | number | 0 | 127 | `64` | Taille |
| `build` | number | 0 | 127 | `64` | Corpulence |

**Couleurs de vêtement (`favoriteColor`)** : 0=Rouge, 1=Orange, 2=Jaune, 3=Vert clair, 4=Vert foncé, 5=Bleu foncé, 6=Bleu clair, 7=Rose, 8=Violet, 9=Marron, 10=Blanc, 11=Noir

#### Visage

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `faceType` | 0 | 11 | 0 |
| `skinColor` | 0 | 5 | 0 |
| `wrinklesType` | 0 | 11 | 0 (= aucune) |
| `makeupType` | 0 | 11 | 0 (= aucun) |

#### Cheveux

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `hairType` | 0 | 131 | 0 |
| `hairColor` | 0 | 7 | 0 |
| `flipHair` | boolean | — | false |

**Couleurs de cheveux** : 0=Noir, 1=Marron foncé, 2=Marron, 3=Roux, 4=Châtain, 5=Blond, 6=Blond clair, 7=Blanc/Gris

#### Yeux

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `eyeType` | 0 | 59 | 0 |
| `eyeColor` | 0 | 5 | 0 |
| `eyeScale` | 0 | 7 | 4 |
| `eyeVerticalStretch` | 0 | 6 | 3 |
| `eyeRotation` | 0 | 7 | 4 |
| `eyeSpacing` | 0 | 12 | 2 |
| `eyeYPosition` | 0 | 18 | 12 |

#### Sourcils

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `eyebrowType` | 0 | 24 | 0 |
| `eyebrowColor` | 0 | 7 | 0 |
| `eyebrowScale` | 0 | 8 | 4 |
| `eyebrowVerticalStretch` | 0 | 6 | 3 |
| `eyebrowRotation` | 0 | 11 | 6 |
| `eyebrowSpacing` | 0 | 12 | 2 |
| `eyebrowYPosition` | 3 | 18 | 10 |

#### Nez

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `noseType` | 0 | 17 | 1 |
| `noseScale` | 0 | 8 | 4 |
| `noseYPosition` | 0 | 18 | 9 |

#### Bouche

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `mouthType` | 0 | 35 | 23 |
| `mouthColor` | 0 | 4 | 0 |
| `mouthScale` | 0 | 8 | 4 |
| `mouthHorizontalStretch` | 0 | 6 | 3 |
| `mouthYPosition` | 0 | 18 | 13 |

#### Moustache / Barbe

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `mustacheType` | 0 | 5 | 0 (= aucune) |
| `beardType` | 0 | 5 | 0 (= aucune) |
| `facialHairColor` | 0 | 7 | 0 |
| `mustacheScale` | 0 | 8 | 4 |
| `mustacheYPosition` | 0 | 16 | 10 |

#### Lunettes

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `glassesType` | 0 | 8 | 0 (= aucune) |
| `glassesColor` | 0 | 5 | 0 |
| `glassesScale` | 0 | 7 | 4 |
| `glassesYPosition` | 0 | 20 | 10 |

#### Grain de beauté

| Propriété | Min | Max | Défaut |
|---|---|---|---|
| `moleEnabled` | boolean | — | false |
| `moleScale` | 0 | 8 | 4 |
| `moleXPosition` | 0 | 16 | 2 |
| `moleYPosition` | 0 | 30 | 20 |

---

## MiiLoader — API

### Initialisation

```js
import { MiiLoader } from "./MiiLoader.js";

const loader = new MiiLoader(scene, {
  apiBase:       "https://mii-unsecure.ariankordi.net", // défaut
  shaderType:    "wiiu",   // "wiiu" | "switch" | "miitomo"
  texResolution: 512,      // résolution texture visage
});
```

### Méthodes de chargement

```js
// Mii totalement aléatoire
const mii = await loader.loadRandom(position);

// Mii aléatoire avec cohérence stylistique
const mii = await loader.loadCoherent("feminine", position);  // "masculine" | "feminine" | "random"

// Depuis un objet JSON MiiData
const mii = await loader.loadFromData({ hairType: 25, eyeColor: 3, ... }, position);

// Depuis un hex FFSD existant (fichier .ffsd, base de données...)
const mii = await loader.loadFromHex("034000...", position);
```

### MiiInstance — propriétés

```js
mii.group    // THREE.Group racine → à utiliser pour position/rotation/physics
mii.head     // THREE.Object3D — tête seule (pour animations faciales, IK tête...)
mii.body     // THREE.Object3D — corps seul
mii.data     // objet JSON MiiData lisible et modifiable
mii.hex      // string FFSD hex (192 chars) → à passer directement à l'API

mii.setPosition(x, y, z)   // raccourci
mii.setRotationY(radians)   // raccourci
mii.toJSON()                // sérialise mii.data (pour sauvegarde)
mii.dispose()               // retire de la scène + libère géométries/matériaux
```

### Utilitaires statiques

```js
// Convertir sans charger dans la scène
const hex  = MiiLoader.toHex(miiDataObject);   // JSON → hex FFSD
const data = MiiLoader.fromHex(hexString);      // hex FFSD → JSON
```

---

## Intégration dans un projet existant avec squelette/physique

Le `mii.group` est un `THREE.Group` standard. Deux approches selon l'architecture :

### Option A — Group parent (simple)

```js
const mii = await loader.loadRandom();
myCharacterRig.add(mii.group);  // le Mii suit le rig
```

### Option B — Attacher tête et corps à des bones séparés (IK, animations)

```js
const mii = await loader.loadRandom();

// Détacher du group par défaut
mii.group.remove(mii.head);
mii.group.remove(mii.body);

// Attacher aux bones du squelette existant
headBone.add(mii.head);
spineBone.add(mii.body);
```

### Exemple complet : population de Miis aléatoires

```js
const loader = new MiiLoader(scene, { shaderType: "wiiu" });

// Charger 10 Miis en parallèle
const positions = Array.from({ length: 10 }, (_, i) =>
  new THREE.Vector3(i * 2 - 10, 0, 0)
);

const miis = await Promise.all(
  positions.map(pos => loader.loadCoherent("random", pos))
);

// Sauvegarder les données pour réutilisation
const savedMiis = miis.map(mii => mii.toJSON());
// → [{ hairType: 42, eyeColor: 3, ... }, ...]

// Recharger un Mii sauvegardé
const reloaded = await loader.loadFromData(savedMiis[0]);
```

---

## Conversion via mii-js

La conversion JSON ↔ FFSD est assurée par [`@pretendonetwork/mii-js`](https://github.com/PretendoNetwork/mii-js).

```js
import Mii from "@pretendonetwork/mii-js";

// Écrire
const buf = Buffer.alloc(96);
buf[0] = 0x03; buf[3] = 0x40; // version + deviceOrigin Wii U
const mii = new Mii(buf);
mii.hairType  = 25;
mii.eyeColor  = 3;
mii.height    = 80;
// etc.
const encoded = mii.encode();  // Buffer 96 octets, CRC recalculé automatiquement
const hex = encoded.toString("hex");

// Lire
const mii2 = new Mii(Buffer.from(hex, "hex"));
console.log(mii2.hairType); // 25
```

Les flags système à toujours positionner pour un Mii généré :

```js
mii.normalMii    = true;
mii.isValid      = true;
mii.dsMii        = false;
mii.nonUserMii   = false;
mii.deviceOrigin = 4;   // 4 = Wii U
mii.regionLock   = 0;
```

---

## Fichiers à intégrer

| Fichier | Emplacement suggéré |
|---|---|
| `MiiData.js` | `src/loaders/MiiData.js` |
| `MiiLoader.js` | `src/loaders/MiiLoader.js` |

---

## Ressources

| Lien | Description |
|---|---|
| [mii-unsecure.ariankordi.net](https://mii-unsecure.ariankordi.net) | API renderer (interface web + doc) |
| [ariankordi/FFL-Testing](https://github.com/ariankordi/FFL-Testing/tree/renderer-server-prototype) | Code source du renderer |
| [PretendoNetwork/mii-js](https://github.com/PretendoNetwork/mii-js) | Lib JS de parsing/encoding FFSD |
| [datkat21/mii-creator](https://github.com/datkat21/mii-creator) | Éditeur Mii open-source (référence d'implémentation) |
| [HEYimHeroic/MiiDataFiles](https://github.com/HEYimHeroic/MiiDataFiles) | Fichiers Mii de référence en formats variés |
