# Environnement 3D — Wuhu Island Athletics
## Mii Genetic Runner — Spécifications visuelles & intégration

> Ce document couvre l'intégration de l'île Wuhu comme décor 3D, la création de la piste d'athlétisme, les éléments de décor, les effets visuels et le cycle jour/nuit. Il est organisé par **phases de complexité croissante**, du socle fonctionnel aux améliorations cosmétiques.

---

## Priorités

| Priorité | Phase | Description |
|---|---|---|
| 🔴 Obligatoire | Phase A | Piste fonctionnelle avec collision |
| 🟠 Important | Phase B | Île Wuhu en décor de fond |
| 🟡 Confort | Phase C | Éléments de décor détaillés |
| 🟢 Cosmétique | Phase D | Shaders, supporters, cycle jour/nuit |

---

## Phase A — Piste d'athlétisme fonctionnelle

> Objectif : une piste jouable dans Three.js avec physique correcte. C'est le prérequis absolu avant tout décor.

### A.1 — Modélisation dans Blender

**Géométrie de base :**
- Piste de 100 mètres, orientée axe Z (cohérent avec les specs simulation)
- Largeur totale : 9 couloirs × 1.22 m = ~11 m
- Surface : tartan (rouge-orange) avec texture plate

**Éléments géométriques à créer dans Blender :**
- Plan de piste principale (rectangle 100 × 11 m)
- Lignes de couloirs : bandes blanches légèrement surélevées (~1 cm) pour les rendre visibles
- Ligne de départ : bande blanche épaisse à Z = 0
- Ligne d'arrivée : bande blanche + bande jaune à Z = 100
- Repères de 10m : tirets blancs au sol tous les 10 mètres
- Zone de dégagement : herbe verte autour de la piste (50 m de chaque côté)

**Export Blender :**
```
Format : glTF 2.0 (.glb)
Inclure : géométries, UV maps, matériaux PBR
Exclure : armatures, animations (inutiles pour le décor)
Fichier : assets/models/track.glb
```

### A.2 — Intégration Three.js (`Track.ts`)

```typescript
// Chargement du modèle piste
const loader = new GLTFLoader()
const gltf = await loader.loadAsync('/assets/models/track.glb')
scene.add(gltf.scene)

// Matériaux recommandés (MeshStandardMaterial remplace MeshLambertMaterial)
// Le glTF exporté depuis Blender utilisera automatiquement MeshStandardMaterial
```

### A.3 — Collider physique (Rapier.js)

La piste est **physiquement un plan plat** — pas besoin de trimesh sur la totalité du modèle.

```typescript
// PhysicsWorld.ts — sol de piste
// ColliderDesc.cuboid() suffit : la piste est plate
const trackCollider = RAPIER.ColliderDesc
  .cuboid(55, 0.1, 6)          // 110m de long, 12m de large, 20cm d'épaisseur
  .setTranslation(50, -0.1, 0) // centré sur la piste
  .setFriction(0.8)             // tartan = bonne adhérence

world.createCollider(trackCollider)
```

> ⚠️ Le reste de l'île Wuhu sera **purement visuel** — aucun collider dessus. Les Mii ne peuvent tomber que de la piste elle-même.

---

## Phase B — Intégration de l'île Wuhu

> Objectif : l'île Wuhu sert de décor de fond immersif. Elle est chargée comme un modèle 3D passif, sans physique.

### B.1 — Préparation du modèle dans Blender

**Source :** [Wuhu Island — Sketchfab](https://sketchfab.com/3d-models/wuhu-island-wii-sports-resort-68d83db076c944fdb5e1273f95b4fc7d)

**Étapes de préparation dans Blender :**

1. **Import** du modèle (OBJ/FBX/GLB selon le format disponible)
2. **Identifier une zone plate** sur l'île pour positionner la piste (la plaine centrale est idéale)
3. **Sculpt léger** : aplatir la zone de pose de piste avec le Flatten Brush si nécessaire
4. **Intégrer la piste** : coller l'objet piste sur la surface aplanie (Snap to Face)
5. **Optimisation polycount** :
   - Appliquer un Decimate Modifier sur les zones éloignées de la caméra
   - Objectif : < 200k triangles pour l'île entière
6. **Export séparé** de l'île et de la piste pour pouvoir les charger indépendamment

```
assets/models/wuhu_island.glb   ← décor uniquement, pas de collider
assets/models/track.glb         ← piste avec collider
```

### B.2 — Chargement dans Three.js

```typescript
// Renderer.ts
async loadEnvironment(): Promise<void> {
  const loader = new GLTFLoader()
  
  // Île Wuhu — décor de fond, pas de physique
  const island = await loader.loadAsync('/assets/models/wuhu_island.glb')
  island.scene.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.receiveShadow = true
      obj.castShadow = false  // optimisation : l'île ne projette pas d'ombre sur elle-même
    }
  })
  this.scene.add(island.scene)

  // Piste — objet de jeu, collider associé côté Rapier
  const track = await loader.loadAsync('/assets/models/track.glb')
  track.scene.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.receiveShadow = true
      obj.castShadow = false
    }
  })
  this.scene.add(track.scene)
}
```

### B.3 — Positionnement et échelle

```typescript
// Ajuster selon les coordonnées réelles après import Blender
island.scene.position.set(0, 0, 0)
island.scene.scale.setScalar(1.0)  // à calibrer selon l'échelle du modèle

// La piste doit être légèrement au-dessus du sol de l'île pour éviter le Z-fighting
track.scene.position.set(0, 0.01, 0)
```

---

## Phase C — Éléments de décor détaillés

> Objectif : enrichir visuellement l'environnement autour de la piste. Tous ces éléments sont **purement visuels** (pas de physique).

### C.1 — Tribunes et supporters

**Tribunes (à modéliser dans Blender) :**
- Structure : deux tribunes latérales de part et d'autre de la piste (côtés ±Z)
- Longueur : 100 m (toute la longueur de la piste)
- Hauteur : 4 gradins, ~8 m de haut
- Style : courbé, inspiré Wii Sports Resort (couleurs vives, aspect cartoon)

**Supporters (Mii dans les tribunes) :**

Les supporters peuvent être des Miis générés avec le même pipeline que les coureurs, mais en statique.

```typescript
// Charger des Miis supporters en arrière-plan
// Utiliser loadCoherent() pour les générer rapidement
// Les placer sur des rangées de gradins
const ROWS = 4
const SEATS_PER_ROW = 30  // par tribune

for (let row = 0; row < ROWS; row++) {
  for (let seat = 0; seat < SEATS_PER_ROW; seat++) {
    const pos = new THREE.Vector3(
      seat * 1.2 - 18,     // espacement entre sièges
      row * 1.5 + 1,       // hauteur de la rangée
      55 + row * 0.3       // profondeur de la tribune
    )
    const supporter = await miiLoader.loadCoherent('random', pos)
    supporter.group.rotation.y = Math.PI  // face à la piste
  }
}
```

> 💡 **Optimisation** : les supporters peuvent être des billboards (plans 2D toujours face à la caméra) plutôt que des Miis complets, pour économiser du GPU.

**Animations supporters (optionnel) :**
- Animation simple "wave" : oscillation verticale des bras, synchronisée par vague
- Déclenchée à l'arrivée du premier Mii à la ligne d'arrivée

### C.2 — Éléments de stade

**Ligne d'arrivée :**
- Ruban de finish tendu entre deux poteaux (géométrie tube)
- Matériau légèrement émissif pour bien le voir

**Panneaux d'affichage :**
- Grand panneau en fond de piste (arrière de la ligne d'arrivée)
- Texture canvas HTML2D mise à jour avec les stats de génération :
  - Génération actuelle / max
  - Meilleur temps de la génération
  - Individu en tête

```typescript
// Texture dynamique sur un plane 3D
const canvas = document.createElement('canvas')
canvas.width = 1024
canvas.height = 256
const texture = new THREE.CanvasTexture(canvas)

// Mise à jour chaque frame ou sur événement WebSocket
function updateScoreboard(gen: number, bestTime: number) {
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 1024, 256)
  ctx.fillStyle = '#001133'
  ctx.fillRect(0, 0, 1024, 256)
  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 80px Arial'
  ctx.fillText(`GEN ${gen}`, 50, 140)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '60px Arial'
  ctx.fillText(`BEST: ${bestTime.toFixed(2)}s`, 400, 140)
  texture.needsUpdate = true
}
```

**Drapeaux et bannières :**
- Drapeaux sur les poteaux des tribunes
- Animation shader simple : ondulation sinusoïdale (vertex shader, ~10 lignes)

**Ligne de caméra :**
- Pylônes de caméra TV le long de la piste (décor, non interactif)
- Positionnés tous les 20 m côté spectateur

### C.3 — Sol et végétation

**Herbe autour de la piste :**
- Zone verte plate (plan simple) au-delà du tartan
- Texture herbe avec normal map pour donner du relief sans geometry

**Océan (si île Wuhu utilisée) :**
- Plan d'eau animé en dehors de l'île
- Shader eau basique : oscillation vertex + couleur bleue avec reflets
- Voir Phase D pour le shader complet

---

## Phase D — Effets visuels & Cycle Jour/Nuit

> Objectif : polish visuel. Tout ce qui suit est **du confort** — à implémenter après que la simulation tourne correctement.

### D.1 — Upgrade matériaux (`Renderer.ts`)

Remplacer `MeshLambertMaterial` par `MeshStandardMaterial` sur tous les objets.

```typescript
// Avant (actuel)
const mat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 })

// Après
const mat = new THREE.MeshStandardMaterial({
  color: 0x4a7c59,
  roughness: 0.8,
  metalness: 0.0,
})
```

| Surface | `roughness` | `metalness` |
|---|---|---|
| Tartan piste | 0.9 | 0.0 |
| Herbe | 0.95 | 0.0 |
| Béton tribunes | 0.85 | 0.0 |
| Métal poteaux | 0.4 | 0.8 |
| Eau | 0.1 | 0.0 |

### D.2 — Cycle Jour/Nuit

Le cycle jour/nuit anime 4 variables dans la boucle de rendu : position du soleil, intensité lumineuse, couleur du ciel, couleur ambiante.

**Implémentation dans `Renderer.ts` :**

```typescript
interface DayNightConfig {
  enabled: boolean
  cycleDurationMs: number  // durée d'un cycle complet (défaut: 60000 = 1 min)
  startPhase: number       // 0 = aube, 0.25 = midi, 0.5 = crépuscule, 0.75 = nuit
}

class DayNightCycle {
  private sun: THREE.DirectionalLight
  private ambient: THREE.AmbientLight
  private scene: THREE.Scene
  private config: DayNightConfig

  // Palette de couleurs par phase
  private readonly colors = {
    dawn:    { sky: new THREE.Color(0xFF7043), ambient: new THREE.Color(0xFF8A65) },
    day:     { sky: new THREE.Color(0x87CEEB), ambient: new THREE.Color(0xFFFFFF) },
    dusk:    { sky: new THREE.Color(0xFF5722), ambient: new THREE.Color(0xFF7043) },
    night:   { sky: new THREE.Color(0x0D1B2A), ambient: new THREE.Color(0x1A237E) },
  }

  update(nowMs: number): void {
    if (!this.config.enabled) return

    const t = ((nowMs / this.config.cycleDurationMs) + this.config.startPhase) % 1

    // Position du soleil (orbite autour de la scène)
    const sunAngle = t * Math.PI * 2
    this.sun.position.set(
      Math.cos(sunAngle) * 150,
      Math.sin(sunAngle) * 100,
      50
    )

    // Intensité : plein jour = 1.2, nuit = 0.05
    const elevation = Math.sin(sunAngle)  // -1 à +1
    this.sun.intensity = Math.max(0.05, (elevation + 1) / 2 * 1.2)

    // Couleur du ciel par interpolation
    this.scene.background = this.getSkyColor(t)
    this.scene.fog!.color.copy(this.scene.background as THREE.Color)
    this.ambient.color.copy(this.getAmbientColor(t))
  }

  private getSkyColor(t: number): THREE.Color {
    // t: 0=aube, 0.25=midi, 0.5=crépuscule, 0.75=nuit
    const c = this.colors
    if (t < 0.1)  return c.dawn.sky.clone().lerp(c.day.sky, t / 0.1)
    if (t < 0.4)  return c.day.sky
    if (t < 0.55) return c.day.sky.clone().lerp(c.dusk.sky, (t - 0.4) / 0.15)
    if (t < 0.65) return c.dusk.sky.clone().lerp(c.night.sky, (t - 0.55) / 0.1)
    if (t < 0.9)  return c.night.sky
    return c.night.sky.clone().lerp(c.dawn.sky, (t - 0.9) / 0.1)
  }

  private getAmbientColor(t: number): THREE.Color {
    // Même logique que getSkyColor mais avec les couleurs ambient
    // ...
    return new THREE.Color()
  }
}
```

**Intégration dans la boucle de rendu :**
```typescript
// Clock.ts ou Renderer.ts
function animate(nowMs: number) {
  requestAnimationFrame(animate)
  clock.tick(nowMs, dt => world.step(dt))
  dayNightCycle.update(nowMs)   // ← ajout ici
  updateCharacters()
  renderer.render()
}
```

### D.3 — Éclairage nocturne

Pour que la piste reste visible la nuit, ajouter des projecteurs de stade.

```typescript
// 4 projecteurs, un à chaque coin de la piste
const spotPositions = [
  { x: -10, z: -5 }, { x: -10, z: 105 },
  { x: 20,  z: -5 }, { x: 20,  z: 105 },
]

spotPositions.forEach(({ x, z }) => {
  const spot = new THREE.SpotLight(0xFFEECC, 0, 200, Math.PI / 6, 0.3, 1)
  spot.position.set(x, 25, z)
  spot.target.position.set(5, 0, 50)  // vise le centre de la piste
  spot.castShadow = true
  scene.add(spot, spot.target)

  // Intensité inversement proportionnelle à la lumière du jour
  // Mise à jour dans DayNightCycle.update()
})
```

### D.4 — Shader eau (île Wuhu)

Si l'île Wuhu est utilisée, l'océan peut avoir un shader animé simple.

```typescript
// WaterMaterial — ShaderMaterial custom
const waterMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime:      { value: 0 },
    uColor:     { value: new THREE.Color(0x006994) },
    uSkyColor:  { value: new THREE.Color(0x87CEEB) },
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;
      vec3 pos = position;
      // Vagues douces : deux sinusoïdes combinées
      pos.y += sin(pos.x * 0.1 + uTime * 0.5) * 0.3
             + sin(pos.z * 0.08 + uTime * 0.3) * 0.2;
      vElevation = pos.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uSkyColor;
    varying float vElevation;

    void main() {
      // Crêtes de vague légèrement plus claires
      float mixFactor = (vElevation + 0.5) * 0.4;
      vec3 color = mix(uColor, uSkyColor * 0.5, mixFactor);
      gl_FragColor = vec4(color, 0.85);
    }
  `,
  transparent: true,
})

// Mise à jour dans la boucle
waterMaterial.uniforms.uTime.value += deltaTime
```

### D.5 — Post-processing (optionnel, basse priorité)

Via `three/addons/postprocessing` :

```typescript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

// Bloom léger pour les lumières de stade la nuit
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4,   // strength — léger
  0.4,   // radius
  0.85   // threshold
)
composer.addPass(bloom)

// Dans animate() : remplacer renderer.render() par composer.render()
```

> ⚠️ Le post-processing a un coût GPU non négligeable. À n'activer qu'en mode "spectateur" si la simulation tourne en headless.

---

## Intégration dans l'architecture existante

### Fichiers à créer / modifier

```
packages/simulation/src/engine/
├── Renderer.ts          ← modifier : MeshStandardMaterial + loadEnvironment()
├── Track.ts             ← modifier : charger track.glb au lieu de géométrie procédurale
├── DayNightCycle.ts     ← créer (Phase D)
└── WaterShader.ts       ← créer (Phase D)

assets/
├── models/
│   ├── wuhu_island.glb  ← à créer via Blender
│   └── track.glb        ← à créer via Blender
└── textures/
    ├── tartan.jpg        ← texture tartan athlétisme
    ├── grass.jpg         ← texture herbe
    └── concrete.jpg      ← texture béton tribunes
```

### Flag d'activation

Pour garder la simulation performante, les effets visuels peuvent être activés/désactivés via la config :

```typescript
// RestApi.ts ou config JSON
interface RendererConfig {
  quality: 'low' | 'medium' | 'high'
  // low    → MeshLambertMaterial, pas de shadows, pas de cycle J/N
  // medium → MeshStandardMaterial, shadows simples, cycle J/N
  // high   → tout activé, bloom, eau animée
  dayNightCycle: boolean
  bloomEffect: boolean
  waterShader: boolean
  crowdMiis: boolean
}
```

---

## Ordre d'implémentation recommandé

```
[A] Piste track.glb dans Blender
    ↓
[A] Charger track.glb dans Track.ts + collider Rapier
    ↓
[B] Préparer wuhu_island.glb dans Blender
    ↓
[B] Charger wuhu_island.glb dans Renderer.ts (sans physique)
    ↓
[C] Panneau d'affichage dynamique (CanvasTexture)
    ↓
[C] Tribunes géométriques (Blender)
    ↓
[C] Supporters Mii statiques dans les tribunes
    ↓
[D] Upgrade MeshLambertMaterial → MeshStandardMaterial
    ↓
[D] Cycle jour/nuit (DayNightCycle.ts)
    ↓
[D] Projecteurs de stade nocturnes
    ↓
[D] Shader eau
    ↓
[D] Bloom post-processing
```

---

*Document maintenu en parallèle de `MII_GENETIC_RUNNER_SPECS.md`*
*Dernière mise à jour : Mars 2026*
