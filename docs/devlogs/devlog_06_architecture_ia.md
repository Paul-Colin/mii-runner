# Mii Genetic Runner — Devlog #6 : Choix d'architecture IA

## Contexte

Avec le ragdoll fonctionnel (MiiSkeleton + MiiMuscles + Demo 10), la question fondamentale est : **comment les Miis apprennent-ils à marcher et à courir le plus vite possible ?**

---

## Le problème : deux niveaux d'optimisation

Le projet combine deux sous-problèmes distincts :

**Niveau 1 — Contrôleur** : comment le Mii pilote ses muscles à chaque frame
**Niveau 2 — Morphologie** : quelles stats Mii (taille, corpulence...) courent le plus vite

---

## Options évaluées

### Option A — Reinforcement Learning pur (PPO, SAC)
Un NN entraîné par rétropropagation avec une reward function.
- Avantage : très efficace en échantillons
- **Rejeté** : infrastructure lourde (replay buffer, gradients, env Gym-like), difficile dans un browser. N'optimise pas la morphologie simultanément.

### Option B — Neuroévolution + co-évolution morphologique ✓ retenu
Chaque individu du GA = **stats Mii + poids NN**. Pas de backprop — on simule, on score, on sélectionne, on mute.

### Option C — Séparation RL (contrôleur) + GA (morphologie)
RL pour apprendre à marcher, puis GA sur la morphologie avec le contrôleur figé.
**Rejeté** : trop complexe, inefficace pour ce projet.

---

## Architecture retenue : GA à topologie fixe

### Pourquoi pas NEAT ?

**Neuroévolution** = terme générique (utiliser un algo évolutionnaire pour optimiser un NN).
**NEAT** = une implémentation spécifique qui fait évoluer simultanément les poids ET la topologie du réseau (ajout de neurones/connexions).

NEAT est utile quand on ne sait pas quelle taille de réseau est nécessaire. Ici, la structure est naturelle (11 muscles, ~20 observations) → **topologie fixe suffisante**. On pourra passer à NEAT ou CMA-ES si les résultats stagnent.

### Structure d'un individu

```ts
Individu = {
  miiData:   MiiData          // morphologie (height, build, ...)
  nnWeights: Float32Array     // poids du réseau, topologie fixe
}
```

### Architecture du NN

```
Entrées (~20 valeurs)
  - Orientation du torse (quaternion ou euler)
  - Vélocité linéaire du torse
  - Angles des joints actifs (11 muscles)
  - Contact pieds / sol (booléens)

→ Couche cachée : 32–64 neurones, activation tanh

Sorties (11 valeurs, tanh → [-1, 1])
  - Directement appliquées à muscles.setActions()
```

### Boucle d'évaluation

```
Pour chaque individu k :
  1. Créer MiiSkeleton depuis miiData
  2. Créer MiiMuscles
  3. Simuler T secondes (boucle physique 60 Hz)
     - Chaque frame : observation → NN → muscles.setActions()
  4. Fitness = distance_X + bonus_debout - malus_chute
```

### GA

- Sélection par tournoi
- Croisement uniforme sur miiData ET nnWeights
- Mutation gaussienne sur les poids NN
- Mutation discrète sur les stats Mii (height, build, etc.)

### Parallélisation

Chaque évaluation est indépendante → **Web Workers** pour simuler N individus en parallèle.

---

## Prochaines étapes concrètes

1. Définir le vecteur d'observation complet (inputs NN)
2. Coder le NN feedforward (forward pass uniquement, pas de backprop)
3. Coder le GA (population, fitness, sélection, croisement, mutation)
4. Paralléliser via Web Workers
5. Construire la scène de simulation (couloir 100 m, caméra de suivi)
