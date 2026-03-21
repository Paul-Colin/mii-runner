# 🏃 Mii Genetic Runner — Spécifications Générales du Projet

> Simulation d'un algorithme génétique appliqué à l'apprentissage de la marche/course pour des personnages Mii humanoïdes en 3D, dans un environnement de type 100 mètres.

---

## Sommaire

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Phase 1 — Moteur de simulation](#2-phase-1--moteur-de-simulation)
   - [Étape 1 — Moteur 3D](#étape-1--moteur-3d)
   - [Étape 2 — Squelette & Articulations](#étape-2--squelette--articulations)
   - [Étape 3 — Système musculaire](#étape-3--système-musculaire)
   - [Étape 4 — Stats & Paramétrage du personnage](#étape-4--stats--paramétrage-du-personnage)
   - [Étape 5 — Personnalisation & Intégration Mii](#étape-5--personnalisation--intégration-mii)
3. [Phase 2 — Algorithme Génétique](#3-phase-2--algorithme-génétique)
   - [Génome & Population](#génome--population)
   - [Simulation & Évaluation](#simulation--évaluation)
   - [Sélection, Croisement, Mutation](#sélection-croisement-mutation)
   - [Statistiques & Interface](#statistiques--interface)
4. [Règles générales & Contraintes transversales](#4-règles-générales--contraintes-transversales)
5. [Glossaire](#5-glossaire)

---

## 1. Vue d'ensemble du projet

### Concept

Mii Genetic Runner est une simulation évolutive dans laquelle des personnages humanoïdes de type Mii (Nintendo Wii) apprennent à courir un 100 mètres le plus rapidement possible. L'apprentissage est piloté par un **algorithme génétique** qui fait évoluer à la fois la **morphologie** des personnages (taille, poids, force musculaire) et leur **comportement moteur** (coordination, timing des mouvements).

### Objectifs principaux

- Construire un moteur de simulation physique 3D léger, dédié à la simulation bipède
- Modéliser un personnage humanoïde simplifié mais crédible (squelette + muscles + enveloppe visuelle Mii)
- Implémenter un algorithme génétique capable de faire évoluer simultanément la morphologie et le comportement
- Offrir une visualisation immersive et lisible de l'évolution au fil des générations

### Deux grandes phases

| Phase | Contenu | Livrable |
|---|---|---|
| Phase 1 | Moteur 3D + modèle physique du personnage | Environnement de simulation stable |
| Phase 2 | Algorithme génétique + interface de suivi | Simulation évolutive fonctionnelle |

---

## 2. Phase 1 — Moteur de simulation

### Étape 1 — Moteur 3D

#### Environnement

- Scène 3D avec **piste plate de 100 mètres**, orientée sur l'axe Z
- Sol infini pour éviter les chutes hors-limites ; la piste est délimitée visuellement par des lignes et des couloirs (un par concurrent)
- Ligne de départ et ligne d'arrivée clairement matérialisées
- Ciel, ambiance visuelle simple de type stade ou terrain sportif

#### Caméra

- Mode **vue de côté** (par défaut) pour observer la posture et le style de course
- Mode **vue de dessus** pour observer le peloton complet
- Mode **caméra libre** (optionnel) : orbite autour d'un personnage sélectionné
- Option de **zoom** et de **défilement** pour suivre la progression sur les 100 mètres

#### Lumière

- Lumière directionnelle principale (soleil) avec ombres portées simples
- Lumière ambiante pour éviter les zones noires
- Pas de calcul de lumière temps réel complexe (performance prioritaire)

#### Physique

- **Gravité constante** : force vers le bas appliquée en permanence sur chaque corps rigide
- **Détection de collision sol uniquement** : le sol est un plan horizontal, les pieds ne passent pas à travers
- **Pas de collision entre personnages** : les Mii se traversent (simplification délibérée pour la simulation)
- Pas de simulation fluide, pas de vent, pas de friction autre que sur le contact pied/sol
- Fréquence de simulation : définie et fixe (ex. 60 pas de simulation par seconde), découplée du rendu visuel

#### Équilibre & Gravité — défi central de la simulation

Le squelette et les muscles sont **entièrement soumis à la gravité**. Un personnage sans activation musculaire s'effondre immédiatement. Maintenir l'équilibre bipède est donc un **prérequis implicite** à la course — l'algorithme génétique doit d'abord apprendre à tenir debout avant d'apprendre à avancer.

Ce comportement émergent est intentionnel et constitue le cœur du projet :
- **Générations 1–5** : les Mii tombent quasi immédiatement, dans toutes les directions
- **Générations ~10–20** : certains individus trouvent des postures stables ou un équilibre précaire
- **Générations ~30–50** : émergence de la marche, puis de schémas de course

Pour favoriser la convergence sans contourner la difficulté, deux mécanismes sont prévus :

**1. Récompense d'équilibre dans la fitness**
```
Fitness += Temps_debout × W_equilibre
```
Les premières générations sont ainsi récompensées pour tenir debout, même sans avancer. Cela crée un tremplin évolutif vers la locomotion.

**2. Surface de contact pied élargie**
Les pieds sont des **segments avec une surface d'appui** (et non un simple point). Cela donne une stabilité passive qui accélère la convergence sans éliminer la difficulté de l'équilibre dynamique pendant la course.

#### Performance

- La simulation physique doit pouvoir tourner en **accéléré** (x2, x5, x10) pour accélérer les générations
- En mode accéléré, le rendu visuel peut être réduit ou désactivé

---

### Étape 2 — Squelette & Articulations

#### Philosophie

Le squelette est simplifié : **14 articulations** offrant un bon compromis entre réalisme biomécanique et légèreté de simulation. Chaque articulation est un **pivot** avec des angles min/max définis (contraintes anatomiques).

#### Liste des articulations (14)

| # | Articulation | Degrés de liberté | Remarques |
|---|---|---|---|
| 1 | Hanche gauche | 3 (flexion, abduction, rotation) | Liaison entre torse et cuisse gauche |
| 2 | Hanche droite | 3 | Liaison entre torse et cuisse droite |
| 3 | Genou gauche | 1 (flexion) | Pivot simple, pas d'hyperextension |
| 4 | Genou droit | 1 | |
| 5 | Cheville gauche | 2 (flexion, latérale) | Permet poussée et amortissement |
| 6 | Cheville droite | 2 | |
| 7 | Épaule gauche | 3 | Balancement des bras |
| 8 | Épaule droite | 3 | |
| 9 | Coude gauche | 1 (flexion) | |
| 10 | Coude droit | 1 | |
| 11 | Colonne (bas) | 2 (flexion av/arr, latérale) | Liaison entre bassin et torse |
| 12 | Colonne (haut) | 1 (flexion légère) | Inclinaison du buste |
| 13 | Nuque | 1 | Orientation de la tête (cosmétique) |
| 14 | Bassin | — | Nœud central, référentiel du squelette |

**Total : ~22 degrés de liberté**

#### Contraintes anatomiques

Chaque articulation a des **plages angulaires min/max** qui empêchent les postures impossibles (genou qui s'ouvre vers l'avant, hanche qui tourne à 180°, etc.). Ces contraintes sont fixes, non modifiables par l'algo génétique.

#### Segments osseux (reliant les articulations)

- Tête, Torse (haut + bas), Bassin
- Cuisse G/D, Tibia G/D, Pied G/D
- Bras G/D, Avant-bras G/D

Chaque segment a une **longueur** et une **masse** qui dérivent des stats du personnage (voir Étape 4).

---

### Étape 3 — Système musculaire

#### Définition d'un muscle

Un muscle est un **actionneur** relié à une articulation. Il génère une **force de rotation** (couple) sur l'articulation pour la faire bouger. Dans la simulation, chaque muscle contrôlable de l'algo génétique est modélisé par :

| Propriété | Description |
|---|---|
| Articulation cible | Sur quelle articulation il agit |
| Direction | Flexion ou extension (un muscle = une direction) |
| Force max (Fmax) | Couple maximal qu'il peut exercer (en N·m) |
| Vitesse de contraction (Vc) | Rapidité avec laquelle il atteint sa force max (en degrés/s) |
| Signal d'activation | Valeur entre 0 et 1, fournie par le contrôleur de l'algo génétique |

#### Muscles modélisés (actionneurs simulés)

- Flexion/extension hanche G et D
- Flexion/extension genou G et D
- Flexion/extension cheville G et D
- Flexion/extension épaule G et D
- Flexion coude G et D
- Flexion/extension colonne basse

**Total : ~16 actionneurs musculaires**

#### Fatigue & Endurance (système de réservoir avec récupération)

Chaque personnage dispose d'un **réservoir d'énergie (E)** exprimé en unités arbitraires, qui se vide et se recharge en permanence pendant la course.

##### Capacité maximale (E_max) — liée à la morphologie

```
E_max = (Poids × k_poids) + (Muscle × k_muscle)
```

| Constante | Valeur indicative | Rôle |
|---|---|---|
| k_poids | 8 | Contribution du poids corporel à l'endurance |
| k_muscle | 15 | Contribution de la masse musculaire à l'endurance |

Un Mii lourd et musclé a donc un réservoir bien plus grand qu'un Mii léger. Cette dépendance morphologique est essentielle : elle crée un vrai compromis entre puissance et endurance selon le profil du personnage.

##### Récupération constante

L'énergie se régénère en permanence, **même pendant l'effort** :

```
Récup/s = E_max × r
```

- `r` = taux de récupération (ex. 0.15, soit 15% de E_max par seconde)
- La récupération est **proportionnelle à E_max** : un grand réservoir récupère plus vite en valeur absolue, mais le ratio reste identique
- Le réservoir ne peut pas dépasser E_max

##### Dépense énergétique

```
Dépense/s = Σ (Signal_activation_i × Fmax_i × M × k_depense)
```

- La dépense est proportionnelle à l'intensité d'activation de chaque muscle et au coefficient musculaire M
- `k_depense` est une constante de calibration (à régler pendant les tests)
- Un muscle relâché (signal = 0) ne consomme pas d'énergie

##### Équilibre et stratégie émergente

Le taux `r` est la **variable d'équilibre centrale** du système. Il est calibré pour que :
- Un sprint musculaire à pleine puissance en continu épuise le réservoir en ~15–20 secondes
- Des phases de relâchement musculaire permettent une récupération partielle significative
- Ni le repos complet ni le sprint permanent ne soit la stratégie optimale

L'algorithme génétique est ainsi incité à découvrir des **patterns d'activation rythmiques** : alternance tension/relâchement, gestion de l'énergie sur la durée — comportement naturellement proche d'un vrai sprinter.

##### Épuisement

Quand E atteint 0 :
- La force maximale de tous les muscles est réduite par un facteur de pénalité (÷ 3)
- La récupération continue, permettant un retour progressif à la normale
- Pas d'arrêt brutal : dégradation puis remontée lente — le Mii continue mais très affaibli

#### Impact visuel des muscles

- Les **bras et jambes** du Mii ont une épaisseur visuelle proportionnelle à la force musculaire du personnage
- Un personnage très musclé est visuellement plus épais/trapu
- Un personnage léger est plus fin/élancé

---

### Étape 4 — Stats & Paramétrage du personnage

#### Les 3 stats fondamentales

Ces stats définissent l'ensemble de la morphologie et des capacités physiques d'un personnage. Elles sont à la fois **héritées génétiquement** et **contraintes par des relations physiques réalistes**.

---

##### 🔵 TAILLE (T)
*Plage : 1.40 m — 2.00 m*

| Impact | Règle |
|---|---|
| Longueur des segments | Proportionnelle à T (jambes, bras, torse) |
| Amplitude du pas | Plus T est grand, plus la foulée est longue |
| Vitesse de rotation des articulations | Inversement proportionnel à T (grandes jambes = plus lentes à animer) |
| Temps de contact au sol | Augmente légèrement avec T |

**Règle clé** : un personnage grand peut faire des foulées plus longues mais ses membres sont plus longs à déplacer. L'avantage de la taille n'est pas automatique — la coordination doit s'adapter.

---

##### 🔴 POIDS (P)
*Plage : 40 kg — 120 kg*

| Impact | Règle |
|---|---|
| Résistance à la gravité | Plus P est élevé, plus la force pour maintenir la posture debout est importante |
| Énergie de réservoir | Contribue à E_max via `P × k_poids` |
| Inertie des membres | Plus P est élevé, plus les membres ont de l'inertie (résistance au changement de mouvement) |
| Masse corporelle | Le poids inclut la masse musculaire — augmenter M augmente mécaniquement P |

**Relation Poids ↔ Taille** : contrainte souple basse — `P ≥ T × 25` (ex. 1.80 m → minimum 45 kg).

**Relation Poids ↔ Muscle (bidirectionnelle)** : c'est la contrainte clé qui empêche l'algo génétique d'exploiter M sans coût.

```
P_min = T × 25 + M × 20      ← le muscle a une masse, il alourdit
P_max = T × 40 + M × 35      ← plafond cohérent avec la morphologie
```

Conséquence : un gène M élevé **force** un P minimum plus élevé. Un Mii avec M = 2.0 et T = 1.70 m devra peser au minimum `1.70 × 25 + 2.0 × 20 = 82.5 kg`. Il ne peut pas être léger ET très musclé. Après mutation génétique, si P sort de la plage `[P_min, P_max]`, il est recadré automatiquement.

---

##### 🟢 MUSCLE (M)
*Plage : 0.5 — 2.0 (coefficient multiplicateur)*

M est un coefficient global appliqué à tous les paramètres musculaires du personnage :

| Paramètre | Formule |
|---|---|
| Force max de chaque actionneur | `Fmax_i = Fmax_base × M` |
| Vitesse de contraction | `Vc_i = Vc_base × M^0.5` (racine pour limiter l'avantage) |
| Dépense énergétique | `Dépense = activité × M × k_depense` (plus musclé = dépense plus vite) |
| Masse ajoutée au poids | `+M × 20 kg` intégré dans le calcul de P_min |

**Plafond de M selon le poids** : un personnage léger ne peut pas porter de gros muscles. Contrainte haute : `M ≤ (P - T × 20) / 20`. Cela empêche un individu mince d'avoir M = 2.0 — le génome est corrigé après mutation si nécessaire.

**Résumé du système de contraintes T / P / M** :

```
P_min = T × 25 + M × 20
P_max = T × 40 + M × 35
M_max = (P - T × 20) / 20

→ Augmenter M sans augmenter P est impossible
→ Être léger plafonne M
→ L'algo doit trouver un équilibre, pas maximiser toutes les stats
```

---

#### Tableau récapitulatif des interactions

| Stat ↓ / Effet → | Longueur des membres | Énergie (E_max) | Force musculaire | Vitesse de mouvement | Poids minimum |
|---|---|---|---|---|---|
| Taille (T ↑) | ↑ | neutre | neutre | ↓ (inertie) | ↑ |
| Poids (P ↑) | neutre | ↑ | ↑ (plafond M) | ↓ (masse à déplacer) | — |
| Muscle (M ↑) | neutre | ↑ (dépense ↑↑) | ↑↑ | ↑ | ↑ (masse musculaire) |

**Règle d'or** : il est impossible de maximiser M sans payer en poids. L'algorithme génétique est contraint de trouver un équilibre entre puissance, endurance et mobilité.

---

#### Archétypes naturels émergents

Ces archétypes ne sont pas imposés — ils émergent naturellement des contraintes :

| Archétype | T | P | M | Profil |
|---|---|---|---|---|
| Sprinteur élancé | Haut | Moyen | Moyen | Longue foulée, bon équilibre endurance |
| Tank musclé | Moyen | Élevé | Élevé | Très puissant, s'épuise vite |
| Petit vif | Bas | Faible | Moyen | Mouvement rapide, faible énergie |
| Géant lent | Très haut | Élevé | Faible | Grande foulée mais coordination difficile |

---

### Étape 5 — Personnalisation & Intégration Mii

#### Apparence du personnage Mii

- Chaque individu de la simulation est **associé à un Mii** généré aléatoirement ou hérité de parents
- L'apparence Mii (visage, couleur de peau, style de cheveux, couleur des yeux, etc.) est **cosmétique uniquement** et n'affecte pas la simulation
- Le Mii est **habillé sur le squelette** : la tête, le torse, les bras et les jambes suivent les segments osseux
- L'épaisseur des membres visuels s'adapte au coefficient musculaire M

#### Génération de Mii

- Utilisation du projet [mii-creator (datkat21)](https://github.com/datkat21/mii-creator) pour générer des Mii aléatoires
- Chaque individu de la génération 1 reçoit un Mii **entièrement aléatoire**
- À partir de la génération 2, les descendants peuvent avoir un Mii **issu du mélange des traits parentaux** (voir section Croisement)

#### Héritage visuel (Mii crossover)

Lors d'un croisement entre deux parents A et B, le Mii enfant est construit en mélangeant aléatoirement les traits :

| Trait | Héritage |
|---|---|
| Forme du visage | Parent A ou B (50/50) |
| Couleur de peau | Interpolation légère entre A et B |
| Yeux (forme) | Parent A ou B |
| Yeux (couleur) | Parent A ou B |
| Nez, bouche | Parent A ou B |
| Cheveux (style) | Parent A ou B |
| Cheveux (couleur) | Parent A ou B ou mutation aléatoire (5%) |

Une **mutation visuelle** (5% de probabilité) peut altérer aléatoirement un trait pour introduire de la diversité apparente.

#### Piste & Environnement

- Piste de 100 mètres avec **N couloirs** (N = taille de la population simultanée visible)
- Marquage au sol : lignes de 10m, lignes de départ/arrivée
- Panneau d'affichage en arrière-plan (optionnel) pour les stats en temps réel
- Import possible d'une texture de carte / décor de fond (stade, paysage)

---

## 3. Phase 2 — Algorithme Génétique

### Génome & Population

#### Structure du génome

Chaque individu est représenté par un **génome** composé de deux parties :

**Partie 1 — Gènes morphologiques** (3 gènes)

| Gène | Type | Plage |
|---|---|---|
| Taille (T) | Float | [1.40, 2.00] |
| Poids (P) | Float | [40, 120] |
| Muscle (M) | Float | [0.5, 2.0] |

**Partie 2 — Gènes comportementaux / contrôleur moteur**

Le contrôleur moteur définit **comment** activer les muscles au fil du temps. Il est représenté par une séquence de paramètres définissant un **oscillateur rythmique** pour chaque actionneur :

| Gène par actionneur | Description |
|---|---|
| Phase (φ) | Décalage temporel de l'activation dans le cycle |
| Amplitude (A) | Intensité maximale de l'activation (0 à 1) |
| Fréquence (f) | Vitesse du cycle d'oscillation |
| Offset (O) | Valeur de base (activation au repos) |

Avec 16 actionneurs × 4 paramètres = **64 gènes comportementaux**.

**Total du génome : 3 + 64 = 67 valeurs réelles.**

#### Population

| Paramètre | Valeur suggérée | Remarque |
|---|---|---|
| Taille de population | 50 — 200 individus | Configurable |
| Individus simulés simultanément | 10 — 20 | Limité par les performances visuelles |
| Individus simulés en parallèle (non visuels) | Jusqu'à N total | En mode accéléré |
| Génération 1 | Entièrement aléatoire | Dans les plages valides |

---

### Simulation & Évaluation

#### Déroulement d'une course

1. Les Mii sont placés sur la ligne de départ (positions côte à côte, un par couloir)
2. Le signal de départ est donné
3. La simulation physique tourne pendant un **temps maximum T_max** (ex. 60 secondes)
4. La course se termine pour un individu quand :
   - Il franchit la ligne d'arrivée (100 m)
   - Il chute (centre de masse sous un seuil de hauteur)
   - Le temps T_max est atteint

#### Détection de chute

Un personnage est considéré comme **tombé** si son centre de masse descend sous `h_min = taille × 0.4`. Il est alors **disqualifié** pour cette génération (fitness très pénalisée).

#### Fonction d'évaluation (Fitness)

La fitness est une valeur unique qui reflète la performance globale :

```
Fitness = Distance_parcourue × W1
        - Temps_mis × W2
        + Bonus_arrivée × W3
        - Pénalité_chute × W4
        - Énergie_résiduelle_non_utilisée × W5
        + Temps_debout × W6
```

| Composante | Poids (Wi) | Description |
|---|---|---|
| Distance parcourue | W1 = 10 | En mètres |
| Temps mis | W2 = 0.5 | En secondes (pénalise la lenteur) |
| Bonus arrivée | W3 = 500 | Accordé si les 100 m sont franchis |
| Pénalité chute | W4 = 200 | Malus si le personnage tombe |
| Énergie non utilisée | W5 = 0.1 | Encourage à dépenser son énergie intelligemment |
| Temps debout | W6 = 2.0 | Récompense l'équilibre — crucial pour les premières générations |

*Les poids Wi sont configurables et peuvent être ajustés entre les runs.*

---

### Sélection, Croisement, Mutation

#### Sélection

- **Tri par fitness** : les individus sont classés du meilleur au moins bon
- **Élitisme** : les K meilleurs individus (ex. K=5) passent directement à la génération suivante sans modification
- **Sélection par tournoi** ou **roulette proportionnelle** pour les autres parents

#### Croisement (Crossover)

Deux parents A et B produisent un ou deux enfants :

- **Gènes morphologiques** : croisement en point unique ou uniforme sur les 3 gènes
- **Gènes comportementaux** : croisement par actionneur entier (on prend l'oscillateur complet d'un parent ou de l'autre pour chaque actionneur)
- **Mii visuel** : croisement trait par trait (voir Étape 5)

#### Mutation

Chaque gène subit une mutation avec une probabilité P_mut (ex. 5%) :

| Type de gène | Type de mutation |
|---|---|
| Morphologique | Perturbation gaussienne centrée sur la valeur actuelle |
| Comportemental | Perturbation gaussienne sur chaque paramètre oscillatoire |
| Contrainte | Après mutation, les gènes sont recadrés dans leurs plages valides |

Un taux de mutation adaptatif peut être envisagé : si la population stagne (fitness moyenne stable sur N générations), le taux de mutation augmente temporairement.

---

### Statistiques & Interface

#### Panneau de statistiques en temps réel

| Catégorie | Donnée affichée |
|---|---|
| Simulation | Génération actuelle, Nombre d'individus vivants, Temps écoulé dans la course |
| Performance | Record absolu (meilleur temps tout génération confondu), Meilleur de la génération, Moyenne de la génération |
| Morphologie | Taille moyenne, Poids moyen, Muscle moyen de la génération |
| Diversité | Variance génétique (indicateur de diversité de la population) |
| Énergie | Énergie moyenne restante à l'arrivée / à la chute |

#### Vue individuelle

En cliquant sur un Mii, affichage de sa **fiche personnelle** :
- Son génome sous forme de jauges visuelles (T, P, M)
- Son Mii en vue 3D tournante
- Ses performances historiques (si plusieurs générations)
- Ses parents directs (avec lien vers leurs fiches)

#### Arbre généalogique

- Visualisation **intergenérationnelle** : on peut remonter l'arbre d'un champion pour voir ses ancêtres
- Profondeur affichée : configurable (ex. 5 dernières générations)
- Les individus élites sont mis en évidence dans l'arbre
- Les croisements qui ont produit un saut de performance sont signalés

#### Graphiques d'évolution (au fil des générations)

- Courbe de la meilleure fitness par génération
- Courbe de la fitness moyenne par génération
- Évolution de la taille, poids, muscle moyens
- Histogramme de la distribution des temps à la fin de chaque génération

---

## 4. Règles générales & Contraintes transversales

### Principes de conception

- **Simulation avant rendu** : la cohérence physique prime sur le réalisme visuel
- **Scalabilité** : la taille de la population et la résolution de la simulation doivent être ajustables
- **Reproductibilité** : une graine aléatoire (seed) doit permettre de rejouer exactement une simulation
- **Sauvegarde** : état complet de la simulation (génome de toute la population + génération + stats) exportable et rechargeable
- **Modularité** : le moteur physique, le rendu 3D et l'algo génétique doivent être des composants indépendants

### Limites & Simplifications acceptées

- Pas de simulation de l'air, du vent, de la friction complexe
- Pas de collision entre personnages
- Squelette sans mains ni pieds détaillés (pieds = segment simple)
- Pas de simulation musculo-squelettique anatomiquement correcte (actionneurs = oscillateurs paramétriques)
- Les Mii ne sont pas des modèles Nintendo officiels (génération procédurale)

### Paramètres globaux configurables

| Paramètre | Description |
|---|---|
| Taille de population | Nombre d'individus par génération |
| N simultané (visuel) | Nombre de Mii visibles en même temps sur la piste |
| T_max | Temps maximum d'une course (en secondes) |
| Taux de mutation | Probabilité de mutation par gène |
| Taux d'élitisme | Proportion d'individus conservés sans modification |
| Vitesse de simulation | Facteur d'accélération (x1, x2, x5, x10) |
| Seed aléatoire | Pour reproductibilité |
| Poids de fitness (W1..W6) | Ajustement de la fonction d'évaluation |
| Taux de récupération (r) | Pourcentage de E_max récupéré par seconde |
| k_poids, k_muscle | Constantes de calcul de E_max selon la morphologie |

---

## 5. Glossaire

| Terme | Définition |
|---|---|
| **Actionneur** | Muscle simulé : génère une force de rotation sur une articulation |
| **Articulation** | Point de jonction entre deux segments osseux, avec contraintes angulaires |
| **Degré de liberté (DDL)** | Axe de rotation possible d'une articulation |
| **E_max** | Capacité maximale du réservoir d'énergie, dérivée de la morphologie (poids + muscle) |
| **Élitisme** | Copie directe des meilleurs individus dans la génération suivante |
| **Fitness** | Score numérique évaluant la performance d'un individu |
| **Génome** | Ensemble des gènes d'un individu (morphologie + comportement) |
| **Gène morphologique** | Gène définissant la taille, le poids ou le muscle |
| **Gène comportemental** | Gène définissant les paramètres d'un oscillateur musculaire |
| **Oscillateur rythmique** | Signal périodique qui pilote l'activation d'un muscle dans le temps |
| **Réservoir d'énergie** | Réserve d'endurance du personnage, se vidant à l'effort et se rechargeant en permanence |
| **Taux de récupération (r)** | Fraction de E_max récupérée par seconde, indépendamment de l'effort |
| **Segment osseux** | Partie rigide du corps entre deux articulations |
| **Seed** | Graine aléatoire permettant de reproduire une simulation à l'identique |
| **T_max** | Temps maximum d'une course avant disqualification automatique |
| **W_equilibre (W6)** | Poids de fitness récompensant le temps passé debout sans tomber |

---

*Document de spécifications — Version 1.2 — Projet Mii Genetic Runner*
