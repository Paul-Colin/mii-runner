# Mii Genetic Runner — Architecture Technique

> Ce document décrit les choix technologiques, le schéma de base de données, l'architecture Docker et la structure du projet. Il est complémentaire aux spécifications générales (`SPECS.md`) et évolue au fil du développement.

---

## Sommaire

1. [Stack technologique](#1-stack-technologique)
2. [Architecture des services](#2-architecture-des-services)
3. [Structure du projet](#3-structure-du-projet)
4. [Base de données](#4-base-de-données)
5. [Architecture Docker](#5-architecture-docker)
6. [Communication entre services](#6-communication-entre-services)
7. [Décisions techniques notables](#7-décisions-techniques-notables)

---

## 1. Stack technologique

### Vue d'ensemble

| Couche | Technologie | Version cible | Rôle |
|---|---|---|---|
| Langage principal | TypeScript | 5.x | Typage fort, OOP pour le moteur et l'algo |
| Rendu 3D | Three.js | r165+ | Scène 3D, caméra, lumières, import glTF |
| Moteur physique | Rapier.js | 0.12+ | Gravité, joints articulés, collision sol |
| Algo génétique | TypeScript OOP | — | Classes `Individual`, `Population`, `GeneticAlgorithm` |
| Communication temps réel | WebSocket (`ws`) | 8.x | Flux live simulation → dashboard |
| Interface dashboard | React | 18.x | Stats, graphiques, arbre généalogique |
| Graphiques | Recharts | 2.x | Courbes évolution, histogrammes |
| Base de données | PostgreSQL | 16.x | Persistance historique complet |
| ORM | Prisma | 5.x | Schéma typé, migrations, requêtes |
| Build / Dev | Vite | 5.x | Hot reload, bundling rapide |
| Runtime | Node.js | 20 LTS | Serveur simulation + API |
| Conteneurisation | Docker + Compose | 24.x / 2.x | Orchestration des services |

### Justifications des choix clés

#### Rapier.js plutôt que Cannon.js ou Ammo.js
- Écrit en Rust et compilé en WASM — performances quasi-natives dans le navigateur
- Support natif des **joints articulés** (revolute, spherical, fixed) indispensables pour le squelette
- **Déterministe par conception** : même seed → même simulation sur toute machine, critique pour la reproductibilité de l'algo génétique
- API TypeScript propre, bien documentée

#### PostgreSQL + JSONB plutôt que NoSQL
- Les données sont naturellement relationnelles : simulation → générations → individus → parents
- `JSONB` pour stocker le génome comportemental (64 valeurs) et l'apparence Mii sans créer des dizaines de colonnes
- Agrégations SQL natives pour toutes les stats (moyennes, max, variance par génération)
- Requêtes récursives (`WITH RECURSIVE`) pour l'arbre généalogique

#### Prisma plutôt que Drizzle ou requêtes brutes
- Migrations versionnées automatiques
- Types TypeScript générés depuis le schéma — cohérence totale entre BDD et code
- Client performant avec connection pooling

---

## 2. Architecture des services

Le projet est découpé en **3 services** orchestrés par Docker Compose, communicant via un réseau interne partagé.

```
┌─────────────────────────────────────────────────────┐
│                  docker compose                      │
│                                                     │
│  ┌──────────────┐   WS    ┌──────────────┐         │
│  │  simulation  │ ──────► │  dashboard   │         │
│  │  (Node.js)   │         │  (React)     │         │
│  │  port 3000   │         │  port 5173   │         │
│  └──────┬───────┘         └──────┬───────┘         │
│         │ SQL (Prisma)           │ REST (fetch)     │
│         └──────────┬─────────────┘                 │
│                    ▼                                │
│           ┌─────────────────┐                      │
│           │    postgres     │                      │
│           │  PostgreSQL 16  │                      │
│           │   port 5432     │                      │
│           └─────────────────┘                      │
└─────────────────────────────────────────────────────┘
```

### Service `simulation`

- Moteur Three.js + Rapier.js pour le rendu et la physique
- Logique de l'algo génétique (TypeScript OOP)
- Serveur WebSocket pour diffuser l'état en temps réel au dashboard
- API REST minimale pour démarrer/stopper/configurer une simulation
- Écrit les résultats dans PostgreSQL via Prisma à chaque fin de génération

### Service `dashboard`

- Application React (Vite) servie en développement ou en production (build statique)
- Reçoit les events WebSocket du service `simulation` pour l'affichage temps réel
- Interroge PostgreSQL via une API REST du service `simulation` pour les données historiques
- Pas d'accès direct à la base de données (tout passe par le service `simulation`)

### Service `postgres`

- Image officielle PostgreSQL 16
- Données persistées dans un volume Docker dédié
- Initialisé automatiquement par les migrations Prisma au premier démarrage

---

## 3. Structure du projet

```
mii-genetic-runner/
│
├── docker-compose.yml
├── docker-compose.dev.yml          # overrides dev (hot reload, ports exposés)
├── .env.example
├── README.md
│
├── packages/
│   │
│   ├── simulation/                 # Service simulation (Node.js + Three.js)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.ts             # Point d'entrée, init Three.js + serveur WS
│   │       │
│   │       ├── engine/             # Moteur physique et rendu
│   │       │   ├── PhysicsWorld.ts     # Wrapper Rapier.js (gravité, sol, joints)
│   │       │   ├── Renderer.ts         # Scène Three.js, caméras, lumières
│   │       │   ├── Track.ts            # Piste 100m, couloirs, lignes
│   │       │   └── Clock.ts            # Boucle de simulation découplée du rendu
│   │       │
│   │       ├── character/          # Modèle physique du personnage
│   │       │   ├── Skeleton.ts         # 14 articulations, segments osseux
│   │       │   ├── Joint.ts            # Articulation avec contraintes angulaires
│   │       │   ├── Muscle.ts           # Actionneur (force, vitesse, énergie)
│   │       │   ├── EnergySystem.ts     # Réservoir E_max, récupération, épuisement
│   │       │   └── MiiMesh.ts          # Enveloppe visuelle Three.js (glTF + skinning)
│   │       │
│   │       ├── genetics/           # Algorithme génétique
│   │       │   ├── Genome.ts           # Structure du génome (morpho + comportement)
│   │       │   ├── Individual.ts       # Un individu : génome + squelette + fitness
│   │       │   ├── Population.ts       # Ensemble d'individus, gestion génération
│   │       │   ├── GeneticAlgorithm.ts # Sélection, croisement, mutation
│   │       │   ├── FitnessEvaluator.ts # Calcul fitness (W1..W6)
│   │       │   └── MiiCrossover.ts     # Héritage visuel des traits Mii
│   │       │
│   │       ├── server/             # Serveur Node.js
│   │       │   ├── WebSocketServer.ts  # Diffusion état temps réel
│   │       │   ├── RestApi.ts          # Endpoints config/contrôle simulation
│   │       │   └── DbWriter.ts         # Sauvegarde résultats via Prisma
│   │       │
│   │       └── utils/
│   │           ├── SeededRandom.ts     # PRNG déterministe (seed reproductible)
│   │           └── MorphologyConstraints.ts  # Validation T/P/M
│   │
│   ├── dashboard/                  # Service dashboard (React)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       │
│   │       ├── components/
│   │       │   ├── SimulationView.tsx      # Canvas Three.js embarqué (optionnel)
│   │       │   ├── GenerationChart.tsx     # Courbe fitness par génération
│   │       │   ├── MorphologyChart.tsx     # Évolution T/P/M moyens
│   │       │   ├── IndividualCard.tsx      # Fiche d'un Mii (stats + Mii 3D)
│   │       │   ├── FamilyTree.tsx          # Arbre généalogique interactif
│   │       │   ├── LiveStats.tsx           # Panneau stats temps réel (WS)
│   │       │   └── RaceLeaderboard.tsx     # Classement course en cours
│   │       │
│   │       ├── hooks/
│   │       │   ├── useWebSocket.ts         # Connexion WS + état temps réel
│   │       │   └── useSimulationHistory.ts # Fetch données historiques
│   │       │
│   │       └── api/
│   │           └── simulationApi.ts        # Appels REST vers service simulation
│   │
│   └── database/                   # Schéma et migrations Prisma
│       ├── schema.prisma
│       └── migrations/
│
└── assets/
    ├── models/                     # Modèles glTF Mii générés
    └── textures/                   # Textures piste, environnement
```

---

## 4. Base de données

### Schéma Prisma

```prisma
// packages/database/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Simulation {
  id              String       @id @default(uuid())
  name            String
  seed            BigInt
  populationSize  Int
  maxGenerations  Int
  mutationRate    Float
  eliteRatio      Float
  tMaxSeconds     Int
  fitnessWeights  Json         // { w1, w2, w3, w4, w5, w6 }
  physicsConfig   Json         // { gravity, recoveryRate, kPoids, kMuscle, ... }
  status          SimStatus    @default(PENDING)
  createdAt       DateTime     @default(now())
  generations     Generation[]
  individuals     Individual[]
}

model Generation {
  id               String      @id @default(uuid())
  simulationId     String
  generationNumber Int
  bestFitness      Float
  avgFitness       Float
  worstFitness     Float
  avgHeight        Float
  avgWeight        Float
  avgMuscle        Float
  geneticVariance  Float
  survivorsCount   Int
  bestTimeSeconds  Float?
  simulatedAt      DateTime    @default(now())
  simulation       Simulation  @relation(fields: [simulationId], references: [id])
  individuals      Individual[]
}

model Individual {
  id               String      @id @default(uuid())
  simulationId     String
  generationId     String
  parentAId        String?
  parentBId        String?
  generationNumber Int
  isElite          Boolean     @default(false)

  // Gènes morphologiques
  height           Float
  weight           Float
  muscleCoef       Float

  // Gènes comportementaux (64 valeurs oscillateurs)
  genomeBehavior   Json

  // Apparence Mii
  miiAppearance    Json

  // Résultats de course
  fitness          Float
  distanceM        Float
  timeSeconds      Float?
  timeUprightS     Float
  energyUsed       Float
  finishedRace     Boolean     @default(false)
  fell             Boolean     @default(false)

  createdAt        DateTime    @default(now())

  simulation       Simulation  @relation(fields: [simulationId], references: [id])
  generation       Generation  @relation(fields: [generationId], references: [id])
  parentA          Individual? @relation("ParentA", fields: [parentAId], references: [id])
  parentB          Individual? @relation("ParentB", fields: [parentBId], references: [id])
  childrenA        Individual[] @relation("ParentA")
  childrenB        Individual[] @relation("ParentB")
  runStats         RunStats?
}

model RunStats {
  id               String      @id @default(uuid())
  individualId     String      @unique
  generationId     String
  energyCurve      Json        // tableau { t: float, e: float }[]
  positionSnapshots Json       // tableau { t: float, x: float, z: float }[]
  maxSpeedMs       Float
  avgStrideLength  Float
  fallTimeMs       Int?
  individual       Individual  @relation(fields: [individualId], references: [id])
}

enum SimStatus {
  PENDING
  RUNNING
  PAUSED
  COMPLETED
  ABORTED
}
```

### Requêtes types utiles

```sql
-- Évolution de la fitness sur toutes les générations d'une simulation
SELECT generation_number, best_fitness, avg_fitness, avg_height, avg_weight, avg_muscle
FROM generations
WHERE simulation_id = $1
ORDER BY generation_number;

-- Top 10 individus d'une simulation (tous temps)
SELECT id, generation_number, height, weight, muscle_coef, fitness, time_seconds
FROM individuals
WHERE simulation_id = $1 AND finished_race = true
ORDER BY time_seconds ASC
LIMIT 10;

-- Arbre généalogique d'un individu (5 générations en arrière)
WITH RECURSIVE ancestors AS (
  SELECT id, parent_a_id, parent_b_id, generation_number, fitness, 0 AS depth
  FROM individuals WHERE id = $1
  UNION ALL
  SELECT i.id, i.parent_a_id, i.parent_b_id, i.generation_number, i.fitness, a.depth + 1
  FROM individuals i
  JOIN ancestors a ON i.id = a.parent_a_id OR i.id = a.parent_b_id
  WHERE a.depth < 5
)
SELECT * FROM ancestors ORDER BY depth, generation_number;
```

---

## 5. Architecture Docker

### `docker-compose.yml` (production)

```yaml
services:
  simulation:
    build: ./packages/simulation
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://mii:mii@postgres:5432/miidb
      - WS_PORT=3001
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./assets:/app/assets:ro
      - saves:/app/saves

  dashboard:
    build: ./packages/dashboard
    ports:
      - "5173:5173"
    environment:
      - VITE_WS_URL=ws://localhost:3001
      - VITE_API_URL=http://localhost:3000
    depends_on:
      - simulation

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: mii
      POSTGRES_PASSWORD: mii
      POSTGRES_DB: miidb
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mii -d miidb"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pg_data:
  saves:
```

### `docker-compose.dev.yml` (développement)

```yaml
# Usage : docker compose -f docker-compose.yml -f docker-compose.dev.yml up
services:
  simulation:
    build:
      context: ./packages/simulation
      target: dev
    command: npm run dev
    volumes:
      - ./packages/simulation/src:/app/src   # hot reload
      - ./assets:/app/assets
    environment:
      - NODE_ENV=development

  dashboard:
    build:
      context: ./packages/dashboard
      target: dev
    command: npm run dev
    volumes:
      - ./packages/dashboard/src:/app/src    # hot reload Vite

  postgres:
    ports:
      - "5432:5432"   # exposé en dev pour inspection directe (DBeaver, etc.)
```

### Dockerfile type (service `simulation`)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS dev
CMD ["npm", "run", "dev"]

FROM base AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
CMD ["node", "dist/main.js"]
```

### Commandes courantes

```bash
# Démarrage environnement de développement
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Démarrage production
docker compose up -d

# Appliquer les migrations Prisma
docker compose exec simulation npx prisma migrate deploy

# Accéder à la base de données
docker compose exec postgres psql -U mii -d miidb

# Logs d'un service
docker compose logs -f simulation

# Rebuild d'un service après modification
docker compose build simulation && docker compose up -d simulation

# Reset complet (supprime les volumes — PERD LES DONNÉES)
docker compose down -v
```

---

## 6. Communication entre services

### WebSocket (simulation → dashboard, temps réel)

Le service `simulation` émet des événements à chaque tick de rendu ou à chaque étape clé :

```typescript
// Types d'événements WebSocket
type WsEvent =
  | { type: 'TICK'; data: TickData }           // chaque frame : positions, énergie
  | { type: 'GENERATION_END'; data: GenData }  // fin de génération : stats agrégées
  | { type: 'INDIVIDUAL_FELL'; data: { id: string } }
  | { type: 'INDIVIDUAL_FINISHED'; data: { id: string; time: number } }
  | { type: 'SIMULATION_STATUS'; data: { status: SimStatus } }

type TickData = {
  tick: number
  individuals: Array<{
    id: string
    position: { x: number; z: number }
    energy: number          // 0..1 (fraction de E_max)
    isUpright: boolean
  }>
}
```

### API REST (dashboard → simulation)

```
GET  /api/simulations               Liste des simulations
GET  /api/simulations/:id           Détail d'une simulation
POST /api/simulations               Créer et démarrer une simulation
POST /api/simulations/:id/pause     Mettre en pause
POST /api/simulations/:id/resume    Reprendre
POST /api/simulations/:id/stop      Arrêter

GET  /api/simulations/:id/generations         Stats par génération
GET  /api/simulations/:id/individuals         Individus (paginé, filtrable)
GET  /api/simulations/:id/individuals/:iid    Détail + ancêtres d'un individu
GET  /api/simulations/:id/leaderboard         Top performers
```

---

## 7. Décisions techniques notables

### Simulation headless (sans rendu)

En mode accéléré (x5, x10), Three.js peut être désactivé. Rapier.js tourne seul dans Node.js — pas besoin d'un navigateur. Cela permet de laisser tourner des simulations overnight sur serveur.

```typescript
// Exemple : lancer en mode headless
const engine = new SimulationEngine({ headless: true, speedMultiplier: 10 })
engine.run()
```

### Seed et reproductibilité

Rapier.js est déterministe par nature. Le PRNG maison (`SeededRandom`) remplace `Math.random()` partout dans l'algo génétique. La seed complète (Rapier + PRNG) est stockée en base pour permettre de rejouer n'importe quelle simulation à l'identique.

### Monorepo avec workspaces npm

Les packages `simulation`, `dashboard` et `database` partagent les types TypeScript via le package `database` (schéma Prisma → types générés). Pas de duplication de types entre services.

### JSONB pour le génome

Le génome comportemental (64 oscillateurs × 4 paramètres) est stocké en JSONB PostgreSQL. Structure :

```json
{
  "oscillators": [
    { "joint": "hip_left_flex",  "phase": 0.12, "amplitude": 0.85, "frequency": 1.4, "offset": 0.1 },
    { "joint": "hip_left_ext",   "phase": 0.62, "amplitude": 0.80, "frequency": 1.4, "offset": 0.1 },
    ...
  ]
}
```

Cela permet d'évoluer la structure du génome sans migration de schéma, tout en gardant un index GIN pour des recherches si nécessaire.

---

*Document d'architecture — Version 1.0 — Projet Mii Genetic Runner*
