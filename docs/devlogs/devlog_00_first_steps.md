# Mii Genetic Runner — DevLog

> Journal de développement du projet : simulation d'algorithme génétique avec personnages Mii en 3D.
> Chaque session documente les décisions prises, les difficultés rencontrées et les solutions trouvées.

---

## Sommaire

1. [Genèse du projet](#1-genèse-du-projet)
2. [Session 1 — Specs & Architecture](#2-session-1--specs--architecture)
3. [Session 2 — Choix technologiques](#3-session-2--choix-technologiques)
4. [Session 3 — Initialisation du projet](#4-session-3--initialisation-du-projet)
5. [Session 4 — Étape 1 : Moteur 3D de base](#5-session-4--étape-1--moteur-3d-de-base)
6. [Session 5 — Étape 2 : Squelette & Articulations](#6-session-5--étape-2--squelette--articulations)
7. [Session 6 — Étape 3 : Muscles & Énergie](#7-session-6--étape-3--muscles--énergie)
8. [Session 7 — Étape 4 : Morphologie T/P/M](#8-session-7--étape-4--morphologie-tpm)
9. [Session 8 — Free Camera & Tentative Mii](#9-session-8--free-camera--tentative-mii)
10. [Bilan & Prochaines étapes](#10-bilan--prochaines-étapes)

---

## 1. Genèse du projet

### Concept

L'idée de départ : créer une simulation où un algorithme génétique apprend à des personnages Mii (univers Nintendo Wii) à courir le plus vite possible sur un 100 mètres. Le projet combine deux domaines : la simulation physique 3D et l'intelligence artificielle évolutive.

### Ce qui rend ce projet unique

- Double objectif de l'algorithme génétique : optimiser à la fois la **morphologie** (taille, poids, muscle) ET le **comportement moteur** (timing des muscles)
- Personnages Mii comme enveloppe visuelle — un côté ludique et reconnaissable
- Système d'énergie avec récupération qui force des stratégies d'effort réalistes
- L'équilibre bipède comme défi central : les premières générations tombent immédiatement

### Ambition

Voir émerger naturellement des archétypes (sprinteur élancé, tank musclé, petit vif) sans les imposer — juste par la pression sélective de la fitness.

---

## 2. Session 1 — Specs & Architecture

### Ce qu'on a fait

Définition complète des spécifications du projet avant d'écrire la moindre ligne de code. Deux fichiers produits.

### Décisions clés

**Squelette simplifié à 14 articulations (~22 degrés de liberté)**
- Compromis entre réalisme biomécanique et légèreté de simulation
- Assez riche pour une course crédible, assez léger pour simuler des centaines d'individus en parallèle

**Oscillateurs rythmiques pour le contrôleur moteur**
- 64 gènes comportementaux (16 actionneurs × 4 paramètres : phase, amplitude, fréquence, offset)
- Plus efficace qu'un réseau de neurones pour ce cas d'usage — convergence plus rapide
- Inspiré des travaux sur la locomotion évolutive (Karl Sims, 1994)

**Système d'énergie avec récupération constante**
- Réservoir E_max calculé depuis le poids et le muscle
- Récupération proportionnelle à E_max (r = 15%/s par défaut)
- Force l'algorithme à découvrir des patterns tension/relâchement naturels

**Contraintes morphologiques bidirectionnelles T/P/M**
- Augmenter M sans augmenter P est impossible (muscle a une masse)
- Être léger plafonne M
- Formules : `P_min = T × 25 + M × 20` et `M_max = (P - T × 20) / 20`
- Empêche l'algorithme de "tricher" en maximisant toutes les stats

**Récompense d'équilibre W6 dans la fitness**
- `Fitness += Temps_debout × W6`
- Crucial pour les premières générations qui tombent immédiatement
- Crée un tremplin évolutif vers la locomotion

### Difficultés

- Définir les contraintes T/P/M qui sont circulaires : muscle → poids minimum → plafond muscle
- Résolu en calculant d'abord le muscle max sur le poids **demandé** (avant correction), puis en calculant le poids final sur le muscle validé

### Sources

- Spécifications dans : `docs/SPECS.md`
- Architecture dans : `docs/ARCHITECTURE.md`
- Référence académique : [Karl Sims — Evolved Virtual Creatures (1994)](https://www.karlsims.com/papers/siggraph94.pdf)
- Inspiration visuelle : [Evolution by Keiwan](https://keiwan.itch.io/evolution)
- [HTML5 Genetic Walkers](https://rednuht.org/genetic_walkers/)

---

## 3. Session 2 — Choix technologiques

### Ce qu'on a fait

Analyse et sélection du stack technique complet. Choix de ne pas refaire un moteur 3D from scratch mais d'utiliser des librairies éprouvées.

### Stack retenu

| Couche | Technologie | Justification |
|---|---|---|
| Rendu 3D | Three.js r165+ | Mature, import glTF, SkinnedMesh, OrbitControls |
| Moteur physique | Rapier.js (WASM) | Rust compilé WASM, joints articulés natifs, déterministe |
| Logique | TypeScript OOP | Typage fort, classes `Individual`, `Population`, `GeneticAlgorithm` |
| Temps réel | WebSocket (ws) | Flux live simulation → dashboard |
| Dashboard | React + Recharts | Stats, graphiques, arbre généalogique |
| Base de données | PostgreSQL 16 + Prisma | Relations naturelles, JSONB pour génome |
| Build | Vite + Node.js 20 LTS | Hot reload, bundling rapide |
| Docker | Docker Compose | Orchestration 3 services |

### Pourquoi Rapier.js plutôt que Cannon.js ou Ammo.js

- **Déterministe** : même seed → même simulation sur toute machine (critique pour reproductibilité algo génétique)
- **Joints articulés natifs** : RevoluteJoint, SphericalJoint, FixedJoint — exactement ce qu'on veut pour le squelette
- **Performances WASM** : quasi-natif dans le navigateur
- **Intégration Three.js** : addon officiel `RapierPhysics` dans Three.js docs

### Base de données : SQL plutôt que NoSQL

Les données sont naturellement relationnelles : simulation → générations → individus → parents. Le JSONB PostgreSQL permet de stocker le génome (64 valeurs) sans créer 64 colonnes. Les requêtes récursives SQL (`WITH RECURSIVE`) donnent l'arbre généalogique gratuitement.

### Environnement de développement

Choix de développer dans WSL avec npm local (pas dans Docker) pour la fluidité du dev quotidien. Docker sert uniquement pour PostgreSQL en dev et pour le build de prod. Node.js 20 LTS utilisé dans WSL pour correspondre exactement aux Dockerfiles.

### Sources

- [Rapier.js — Documentation officielle](https://rapier.rs/)
- [Rapier + Three.js integration](https://sbcode.net/threejs/physics-rapier/)
- [React Three Rapier](https://github.com/pmndrs/react-three-rapier)
- [A Review of Nine Physics Engines for RL Research](https://arxiv.org/html/2407.08590v1)
- [SimBenchmark — comparaison moteurs physique](https://leggedrobotics.github.io/SimBenchmark/)

---

## 4. Session 3 — Initialisation du projet

### Ce qu'on a fait

Mise en place de l'environnement complet : monorepo npm workspaces, Docker Compose, TypeScript, premier test Vitest.

### Structure monorepo

```
mii-genetic-runner/
├── packages/
│   ├── core/          ← @mii-engine/core (moteur réutilisable)
│   ├── simulation/    ← application Three.js
│   ├── dashboard/     ← React dashboard
│   └── database/      ← Prisma + schéma PostgreSQL
├── assets/
├── docker-compose.yml
└── docker-compose.dev.yml
```

### Difficultés

**Prisma 7 — breaking change sur la config datasource**
- Prisma 7 n'accepte plus `url = env("DATABASE_URL")` dans `schema.prisma`
- L'URL doit être dans `prisma.config.ts` avec un adapter
- Résolu en créant `prisma.config.ts` avec `@prisma/adapter-pg`

**PostgreSQL non exposé sur localhost**
- Container PostgreSQL démarré sans exposer le port 5432 vers WSL
- La colonne PORTS affichait `5432/tcp` sans `0.0.0.0:5432->5432/tcp`
- Résolu en démarrant avec `docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres -d`

**Décision : Prisma reporté à la Phase 2**
- On avait commencé à configurer Prisma et les migrations pendant l'étape 0
- C'était prématuré — la BDD n'est utile qu'avec l'algorithme génétique (Phase 2)
- Reporté à plus tard pour rester focus sur le moteur physique

### Premier test validé

```
✓ @mii-engine/core > retourne la bonne version
✓ @mii-engine/core > getEngineInfo contient le nom du package
```

### Sources

- [npm workspaces documentation](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Prisma 7 migration guide](https://pris.ly/d/config-datasource)
- [Vitest documentation](https://vitest.dev/)

---

## 5. Session 4 — Étape 1 : Moteur 3D de base

### Ce qu'on a fait

Trois classes fondamentales du moteur : `Clock`, `PhysicsWorld`, `Renderer`. Démo visuelle : 5 balles colorées qui tombent sur un sol vert.

### Clock.ts — La boucle de simulation

Boucle à pas fixe découplée du rendu. Le pattern "spiral of death" est géré via `maxStepsPerFrame` qui bride le nombre de steps physiques par frame même si le rendu est lent.

**Difficulté : précision virgule flottante**
- Test `produit le bon nombre de steps à 60fps` attendait exactement 60 steps
- `1/60 * 60 ≠ 1.0` en JavaScript — résidu dans l'accumulateur
- Résolu en changeant `toBe(60)` → `toBeGreaterThanOrEqual(59)`

### PhysicsWorld.ts — Rapier WASM

Rapier doit être initialisé de façon **asynchrone** (chargement WASM). Pattern utilisé : factory method statique `PhysicsWorld.create()` plutôt que constructeur classique.

**Warning déprécié Rapier**
- `using deprecated parameters for the initialization function; pass a single object instead`
- Avertissement interne à Rapier, pas bloquant, ignoré volontairement

### Renderer.ts — Three.js

Scène avec lumière directionnelle (soleil avec ombres PCFSoft), lumière ambiante, caméra perspective 60°, fog pour la profondeur. Sol vert 400×20 unités.

### Intégration Vite + @mii-engine/core

**Difficulté : Vite ne résout pas les packages locaux**
- `@mii-engine/core` n'était pas buildé → pas de `dist/`
- Résolu via alias Vite pointant directement vers les sources TypeScript

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@mii-engine/core': path.resolve(__dirname, '../core/src/index.ts'),
  }
}
```

### Résultats

- 60 FPS stables
- 5 balles tombent, rebondissent et s'immobilisent sur le sol
- Stats HUD : FPS, steps physique, nombre de balles

### Sources

- [Three.js documentation](https://threejs.org/docs/)
- [Rapier.js JavaScript guide](https://rapier.rs/docs/user_guides/javascript/getting_started_js)
- [Vite configuration](https://vite.dev/config/)

---

## 6. Session 5 — Étape 2 : Squelette & Articulations

### Ce qu'on a fait

Création du squelette humanoïde : 13 segments osseux + 12 joints articulés. Le personnage tombe et s'effondre de façon crédible sous la gravité.

### SkeletonConfig.ts

Définition anatomique complète : longueurs de segments calculées depuis la taille du personnage, masses depuis le poids, radius depuis le coefficient muscle. Les contraintes angulaires (min/max en radians) empêchent les postures impossibles.

### Segment.ts — Corps rigides Rapier

Chaque os est une capsule rigide Rapier avec friction et restitution 0 (pas de rebond). Le rendu debug utilise `THREE.CapsuleGeometry`.

**Difficulté majeure : squelette qui rebondit indéfiniment**

Problème 1 — segments se collisionnant entre eux : les capsules internes se poussaient mutuellement créant des forces permanentes.

Problème 2 — interpénétration au spawn : les positions calculées ne tenaient pas compte des radius.

**Solution : groupes de collision Rapier**

```
Sol     = 0x00010002  → groupe 1, collisionne avec groupe 2
Skeleton= 0x00020004  → groupe 2, collisionne avec groupe 4 (personne)
```

Les segments du squelette ne se collisionnent qu'avec le sol, jamais entre eux. Après avoir augmenté le damping (linéaire 4.0, angulaire 8.0) et la restitution à 0.0, le squelette tombe et reste immobile.

Note : modifier le sol dans `PhysicsWorld.ts` avec les groupes de collision faisait passer le personnage à travers — seul `Segment.ts` a été modifié.

### Skeleton.ts

Assemblage complet : positions calculées par offset depuis la hanche (segment racine), joints Rapier créés selon le type (fixed, revolute, spherical).

### Système de démos

**Décision : dossier `demos/` avec switcher URL**

Plutôt qu'un seul `main.ts` à écraser à chaque démo, on crée un fichier par démo dans `src/demos/` et un switcher via `?demo=XX` dans l'URL.

```
http://localhost:5173?demo=01  → balles physique
http://localhost:5173?demo=02  → squelette
```

### Résultats

- 13 segments, 12 joints, ~22 degrés de liberté
- Squelette tombe et s'immobilise proprement sur le sol
- Visualisation debug avec capsules colorées

### Sources

- [Rapier — Collision groups documentation](https://rapier.rs/docs/user_guides/javascript/colliders#collision-groups-and-solver-groups)
- [Rapier — Joints documentation](https://rapier.rs/docs/user_guides/javascript/joints)
- [Anatomie humaine — degrés de liberté articulaires](https://en.wikipedia.org/wiki/Degrees_of_freedom_(mechanics))

---

## 7. Session 6 — Étape 3 : Muscles & Énergie

### Ce qu'on a fait

Système musculaire complet : 16 actionneurs, système d'énergie avec récupération, démo interactive avec boutons pour activer chaque muscle manuellement.

### EnergySystem.ts

Réservoir d'énergie E_max calculé depuis la morphologie :

```
E_max = Poids × k_poids + Muscle × k_muscle
Récup/s = E_max × r
Dépense/s = Σ(activation × muscle × k_depense)
```

**Difficulté : test de récupération circulaire**

Le test `se recharge quand activation = 0` vérifiait qu'après un effort l'énergie remontait. Mais avec `recoveryRate` par défaut à 0.15, la récupération compensait exactement la dépense en 1 update → `afterWork` était déjà à E_max. Résolu en forçant `recoveryRate: 0` pour l'effort, puis en utilisant un second objet avec `recoveryRate: 0.5` pour tester la récupération.

### Muscle.ts

Actionneur avec rampe de force (vitesse de contraction) — la force n'est pas instantanée, elle monte progressivement selon `contractionSpeed`. Applique un couple via `configureMotorVelocity` sur le joint Rapier.

### MuscleSystem.ts

Orchestre les 16 actionneurs et l'énergie. La méthode `setActivations(signals)` reçoit un dictionnaire `{ muscleName: signal }` — interface prévue pour l'algo génétique.

### Démo interactive — boutons muscles

**Gravité désactivée** pour voir les mouvements sans que le personnage tombe immédiatement. Boutons `mousedown/mouseup/touchstart/touchend` pour activer chaque muscle tant qu'on appuie. Visual feedback : bouton bleu = actif, gris = inactif.

```typescript
const world = await PhysicsWorld.create({ gravity: { x: 0, y: 0, z: 0 } })
```

### Sources

- [Rapier — Motor on revolute joint](https://rapier.rs/docs/user_guides/javascript/joints#motors)
- [Oscillateur rythmique pour locomotion évolutive](https://www.karlsims.com/papers/siggraph94.pdf)

---

## 8. Session 7 — Étape 4 : Morphologie T/P/M

### Ce qu'on a fait

Formalisation et validation des contraintes entre Taille, Poids et Muscle. `validateMorphology()` garantit qu'aucune combinaison impossible ne peut exister. Démo avec 3 personnages côte à côte aux morphologies différentes.

### MorphologyConfig.ts

Contraintes physiques réalistes :

```
P_min = T × 25 + M × 20     (muscle a une masse)
P_max = T × 40 + M × 35
M_max = (P - T × 20) / 20   (poids faible plafonne le muscle)
```

La fonction `getArchetype()` détecte automatiquement le profil du personnage (Sprinteur élancé, Tank musclé, Petit vif, Géant lent, Athlète équilibré) depuis les valeurs validées.

**Difficulté majeure : contrainte circulaire T/P/M**

Problème : muscle élevé → poids minimum élevé → poids corrigé vers le haut → M_max remonté → muscle non plafonné.

Tentative 1 : calculer M_max après correction du poids → circulaire, ne fonctionne pas.

**Solution** : calculer M_max sur le poids **demandé** (avant correction), pas sur le poids final :

```typescript
const mMaxFromWeight = (weightRequested - height * 20) / 20
const muscle = clamp(muscleMin, min(muscleMax, mMaxFromWeight), input.muscle)
const pMin   = height * 25 + muscle * 20   // muscle validé
const weight = clamp(pMin, pMax, weightRequested)
```

L'ordre compte : muscle d'abord (sur poids demandé), puis poids (sur muscle validé).

**Difficulté : test en contradiction avec la contrainte**

Le test `muscle élevé force un poids minimum plus élevé` calculait `pMin = T * 25 + 2.0 * 20 = 83.75` mais avec `weight=40` le muscle est plafonné à 0.5, donc le vrai pMin est bien plus bas. Test corrigé pour utiliser `cfg.muscle` (muscle validé) plutôt que le muscle demandé.

### Démo 3 personnages

Labels HTML positionnés en coordonnées écran via `THREE.Vector3.project(camera)` pour suivre les personnages pendant la simulation. Labels masqués en mode free cam.

### Sources

- [Three.js — world to screen coordinates](https://threejs.org/docs/#api/en/math/Vector3.project)

---

## 9. Session 8 — Free Camera & Tentative Mii

### Free Camera

**Ce qu'on a fait** : classe `FreeCamera.ts` activée/désactivée avec `F`, navigation ZQSD + souris via `PointerLock API`, montée/descente avec Espace/Shift.

Hint visuel en bas à droite qui passe en vert quand la free cam est active. Labels des personnages masqués en mode free cam (ils ne suivent pas la caméra).

Intégré dans toutes les démos via un helper partagé `setupFreeCamera()`.

### Tentative intégration Mii — chronologie des échecs

**Tentative 1 : mii-js (PretendoNetwork)**

`mii-js` est une librairie Node.js pure qui utilise `Buffer` — indisponible dans le navigateur. L'installation d'un polyfill (`vite-plugin-node-polyfills`) n'a pas suffi car `mii-js` utilise `Buffer` profondément dans ses setters de propriétés.

Erreur caractéristique : `RangeError: offset is out of bounds`

**Tentative 2 : encodage FFSD manuel**

Tentative d'encoder le format binaire FFSD (96 bytes) manuellement en Uint8Array, sans dépendance externe. Les offsets et bits du format FFSD sont complexes — le buffer généré était invalide (erreur 500 de l'API).

**Tentative 3 : FFL.js (ariankordi)**

`FFL.js` est la librairie JavaScript officielle utilisant le décompilateur FFL du Wii U via WebAssembly. C'est l'approche correcte pour un vrai rendu 3D Mii.

Problème : Vite 8 bloque l'import car le `package.json` de `ffl.js` n'a pas les conditions d'export `browser`/`module` attendues par Vite 8.

```json
// ffl.js package.json — trop minimal
"exports": { ".": "./ffl.js" }
```

Tentatives de résolution :
- Alias Vite → doublement du chemin `/ffl.js/ffl.js`
- Plugin custom `resolveId` → Vite résout avant les plugins
- Modification directe du `package.json` de ffl.js → cache Vite 8 trop agressif
- `--legacy-peer-deps` pour compatibilité → erreur ERESOLVE

**Décision finale** : abandonner pour cette session. Le problème est lié à une incompatibilité Vite 8 / FFL.js qui nécessite une investigation côté build de FFL.js (regarder comment `mii-creator` de datkat21 l'intègre dans son propre build Bun).

### Pistes pour débloquer FFL.js

- Regarder `build.ts` dans [mii-creator (datkat21)](https://github.com/datkat21/mii-creator) — il utilise FFL.js en production
- Regarder les exemples dans `node_modules/ffl.js/examples/` (fichiers HTML standalone)
- Contacter [ariankordi sur GitHub](https://github.com/ariankordi) — très actif sur son projet
- Alternative : utiliser `ffl.js` en mode script tag `<script>` plutôt qu'import ESM, et exposer via `window`

### Sources

- [FFL.js — GitHub](https://github.com/ariankordi/FFL.js)
- [FFL-Testing — renderer server](https://github.com/ariankordi/FFL-Testing)
- [mii-creator (datkat21)](https://github.com/datkat21/mii-creator)
- [mii-js (PretendoNetwork)](https://github.com/PretendoNetwork/mii-js)
- [mii-unsecure.ariankordi.net — Swagger API](https://mii-unsecure.ariankordi.net/swagger/index.html)
- [MiiJS — alternative plus récente](https://github.com/Stewared/MiiJS)
- [AFLResHigh_2_3.dat — Archive.org](https://web.archive.org/web/20180502054513/http://download-cdn.miitomo.com/native/20180125111639/android/v2/asset_model_character_mii_AFLResHigh_2_3_dat.zip)
- [PointerLock API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)

---

## 10. Bilan & Prochaines étapes

### État du projet au dernier commit

```
✅ Étape 0 — Monorepo npm workspaces, Docker Compose, TypeScript, Vitest
✅ Étape 1 — Clock, PhysicsWorld (Rapier WASM), Renderer (Three.js)
✅ Étape 2 — Squelette 13 segments, 12 joints, groupes de collision
✅ Étape 3 — 16 actionneurs musculaires, système d'énergie avec récupération
✅ Étape 4 — Contraintes morphologiques T/P/M, validation, 3 archétypes
✅ Free cam — Touche F, ZQSD, souris, Espace/Shift
⏸ Étape 5 — Intégration Mii 3D (FFL.js bloqué sur Vite 8)
⬜ Étape 6 — Simulation runner (boucle headless, contrôleur manuel)
⬜ Phase 2 — Algorithme génétique complet
```

### Tests unitaires en place

| Fichier | Tests |
|---|---|
| `Clock.test.ts` | 5 tests — boucle temporelle, spiral of death |
| `PhysicsWorld.test.ts` | 6 tests — gravité, sol, collision |
| `SkeletonConfig.test.ts` | 7 tests — proportions, contraintes |
| `Skeleton.test.ts` | 6 tests — segments, joints, gravité |
| `EnergySystem.test.ts` | 8 tests — E_max, récupération, épuisement |
| `MuscleSystem.test.ts` | 6 tests — actionneurs, énergie |
| `MorphologyConfig.test.ts` | 10 tests — contraintes T/P/M |
| **Total** | **48 tests** |

### Démos visuelles créées

| URL | Contenu |
|---|---|
| `?demo=01` | 5 balles colorées — test gravité et rendu |
| `?demo=02` | Squelette humanoïde qui s'effondre |
| `?demo=03` | Muscles interactifs (boutons), gravité désactivée |
| `?demo=04` | 3 personnages côte à côte (morphologies différentes) |

### Leçons apprises

- **Tester tôt les dépendances tierces** : FFL.js aurait dû être testé dès le début pour détecter l'incompatibilité Vite 8
- **Prisma trop tôt** : la BDD n'était pas nécessaire pour le moteur physique — reportée à la Phase 2
- **Groupes de collision Rapier** : indispensables pour les squelettes articulés, à documenter dès le départ
- **Contraintes circulaires** : les dépendances bidirectionnelles entre stats nécessitent un ordre de calcul précis

### Prochaines étapes

1. **Débloquer FFL.js** — Étudier l'intégration dans mii-creator ou passer par un `<script>` tag
2. **Étape 5 — Track** — Piste 100m avec couloirs, lignes, départ/arrivée
3. **Étape 6 — SimulationRunner** — Boucle headless, contrôleur manuel de test
4. **Phase 2 — Algorithme génétique** — Individual, Population, GeneticAlgorithm, Fitness

---

*DevLog — Projet Mii Genetic Runner*
*Dernière mise à jour : Session 8*
