# TDD & Guide Entraîneur — Module Exercices (Types 1 à 16)

> **Version du document** : `1.1.0` | **Version DAME-PWA** : `1.13.11` | **Dernière mise à jour** : `2026-11-21`

Ce document consigne la logique complète du module d'exercices de **DAME-PWA** (`pwa/src/views/learning/ContenuPage.vue`, `types/Type*.vue`, `viewers/*.vue` et `utils/parsers/*.ts`).  
Il sert à la fois de **spécification technique de vérification (TDD)** pour le développement et de **guide de rédaction FEN / PGN** pour les entraîneurs.

---

## 1. Architecture Transverse & Conventions Globales

### 1.1 Conteneur Unifié (`ContenuPage.vue`)
Tous les exercices (`roi_exercice`, types `1` à `16`) partagent la même coquille :
- **Header (`ContentHeader.vue` via `useExerciseHeader`)** : affiche le titre, le label du type, le chapitre/niveau, la **consigne** dynamique de l'étape active et le **badge d'étape** (`Carte X / N`, `Étape X / N`, etc.).
- **Corps scrollable (`<ion-content>`)** : réinitialisé automatiquement en haut (`scrollToTop(0)`) lors des transitions.
- **Footer persistant (`SeriesCardFooter.vue`)** : téléporté dans `<ion-footer>`. Affiche :
  - le feedback de réponse (`success` vert / `danger` rouge / `warning`),
  - l'indice d'attente (`pendingHint`) tant que l'étape n'est pas résolue,
  - le bouton de progression (`Suivant`, `Étape suivante`, `Carte suivante` ou `Terminer l'exercice`).

### 1.2 Conventions PGN, FEN & Annotations Graphiques (`chessNotation.ts`, `fenUtils.ts`)
- **Orientation par défaut** : sauf indication explicite (`couleur_joueur`), l'orientation de l'échiquier est déduite du **trait de la FEN** (`w` → Blancs en bas, `b` → Noirs en bas).
- **Codes couleur Lichess / PGN** (`PGN_BRUSH_MAP`) :
  - `G` / `g` / `C` / `c` → **Vert** (`green`)
  - `R` / `r` → **Rouge** (`red`)
  - `B` / `b` → **Bleu** (`blue`)
  - `Y` / `y` / `O` / `o` → **Jaune** (`yellow`)
- **Syntaxes supportées dans les commentaires PGN `{...}`** :
  - Cercles sur cases : `[%csl Ye4,Gd5]` ou `[%cpl ...]`
  - Flèches : `[%cal Ge2e4,Rc1f4]`
  - Les balises `[%...]` sont automatiquement extraites et retirées du texte affiché à l'élève.
- **Notation des coups** : les parseurs acceptent le SAN international (`K, Q, R, B, N`) et affichent à l'élève les libellés traduits en français (`R, D, T, F, C`).

---

## 2. Spécification Détaillée par Type d'Exercice

---

### Type 1 — Les 100 Commandements (`Type100Commandements.vue` → `QcmViewer.vue`)

- **Rôle** : Série de QCM textuels ou accompagnés d'un diagramme fixe.
- **Position initiale affichée** :
  - Si `fen` est fournie (sur la carte `qcms[i].fen` ou au niveau racine `config.fen`), l'échiquier affiche **exactement cette FEN** (en lecture seule, `view-only`).
  - Si aucune `fen` n'est fournie, **aucun échiquier n'est affiché**.
- **Affiché vs Caché** :
  - **Affiché** : Échiquier (si FEN présente) avec ses `shapes` éventuelles, liste des boutons de choix.
  - **Caché** : La question dans la carte QCM est masquée (`:hideQuestion="true"`) car elle est déjà portée par la consigne du `ContentHeader` (`Question X / N`).
- **Changement de vue** : Aucun changement de vue interne à la carte ; le passage à la carte suivante (`qcmIndex++`) démonte et remonte `QcmViewer` (`:key="qcmIndex"`).
- **Après une réponse** :
  - **Mauvaise réponse** : Le bouton cliqué reste cliquable (les autres aussi), feedback rouge `"Mauvaise réponse, essaie encore !"` dans le footer.
  - **Bonne réponse** : Les boutons sont désactivés (`repondu = true`), le bon bouton passe en vert (`success`), les autres en gris (`medium`) ou rouge si sélectionné avant. Feedback vert dans le footer. L'élève clique sur **Suivant / Terminer** dans `SeriesCardFooter` pour passer au QCM suivant ou clôturer l'exercice.
- **Rédaction Entraîneur** :
  - Fournir `qcms[]` avec `question` (ou `consigne`), `reponses[]`, `bonne_reponse` (index base 0), et optionnellement `fen` + `shapes`.

---

### Type 2 — Pop'Échecs (`TypePopEchecs.vue` → `PlacementViewer.vue`)

- **Rôle** : Trouver la case cible où replacer une pièce retirée du diagramme.
- **Position initiale affichée** :
  - **FEN modifiée** : le composant recherche dans `shapes` un **cercle bleu** (`brush: 'blue' | 'b'`), identifie la pièce située sur cette case dans la FEN d'origine, puis **retire cette pièce de la FEN** avant affichage (`fenDepart`).
  - L'échiquier est orienté selon le trait de la FEN.
- **Affiché vs Caché** :
  - **Affiché** : Échiquier avec la pièce cible retirée, uniquement les **shapes jaunes** (`filterYellowShapes`), et une puce sous l'échiquier indiquant la **pièce à placer** (icône + nom français accordé, ex. *Dame blanche*).
  - **Caché** : Le cercle bleu cible et toutes les autres shapes non jaunes (vertes, rouges, flèches) sont cachés pendant la recherche.
- **Changement de vue** : Aucun changement de vue de phase ; au clic sur une case (`@square-click`), la pièce est posée visuellement sur la case cliquée.
- **Après une réponse** :
  - **Mauvaise case** : La pièce apparaît brièvement sur la case cliquée, feedback rouge `"Ce n'est pas la bonne case ! Réessayez."`, puis après **800 ms** la position est réinitialisée (`fenDepart` + shapes jaunes uniquement) et l'erreur s'efface.
  - **Bonne case** : Feedback vert `"Parfait ! Bonne case trouvée."`, la FEN complète d'origine et **toutes les shapes** (y compris le cercle bleu et les flèches) sont révélées sur l'échiquier. L'élève passe à la carte suivante via `SeriesCardFooter`.
- **Rédaction Entraîneur** :
  - Fournir pour chaque carte une `fen` complète **contenant la pièce déjà posée sur sa case solution**, et placer un **cercle bleu** (`[%csl Be4]`) sur cette case dans `shapes`.
  - Les éventuels indices visuels permanents doivent être **jaunes** (`Y`).

---

### Type 3 — ABCDaire Tactique (`TypeABCDaire.vue` → `ABCDaireTactiqueViewer.vue`)

- **Rôle** : Série de problèmes tactiques en 2 phases par carte : jeu interactif puis relecture commentée du PGN.
- **Position initiale affichée** :
  - **Phase `playing`** : Affiche la **FEN de départ** du PGN (`[FEN "..."]`, sinon position standard), orientée selon le trait de la FEN.
- **Affiché vs Caché** :
  - **Phase `playing`** : Échiquier interactif (`mode="game"`) + uniquement les **cercles jaunes** extraits du commentaire racine du PGN (`filterYellowShapes`). Les commentaires texte et flèches/cercles d'autres couleurs sont cachés.
  - **Phase `recap`** : Remplacement complet de la vue par `PgnViewer` (boutons Début/Précédent/Suivant + zone de commentaires, bouton Fin masqué via `:hideEndButton="true"`).
- **Changement de vue** :
  - Jouer toute la séquence de la ligne principale du PGN (coups du joueur + réponses automatiques de l'ordinateur après **500 ms**) bascule automatiquement de `playing` vers `recap`.
- **Après une réponse** :
  - **Mauvais coup** : Le coup est annulé (`undoLastMove()`), les cercles jaunes sont restaurés, feedback rouge `"Ce n'est pas le bon coup ! Cherchez encore."` pendant **2000 ms**.
  - **Bon coup intermédiaire** : L'ordinateur joue sa réponse après 500 ms.
  - **Dernier coup de la séquence** : Passage immédiat en mode `recap` avec feedback `"Bravo ! Coup correct."`. **Attention** : le bouton Suivant du `SeriesCardFooter` reste désactivé (`disabled="!isPgnFinished"`) tant que l'élève n'a pas déroulé tous les coups du `PgnViewer` jusqu'à la fin (`"Visionnez tous les coups du PGN pour continuer"`). Une fois le PGN terminé, feedback `"Bravo ! Exercice réussi."` et déblocage du bouton Suivant.
- **Rédaction Entraîneur** :
  - Écrire un PGN par carte avec `[FEN "..."]` (trait au camp qui doit jouer).
  - Placer les indices initiaux éventuels en **cercles jaunes** `{[%csl Ye4]}` avant le 1er coup.
  - Ajouter les explications pédagogiques en commentaires `{...}` sur les coups pour la phase de récapitulatif.

---

### Type 4 — La Partie du Héros (`TypePartieHeros.vue` + `partieHerosParser.ts`)

- **Rôle** : Parcours guidé d'une partie complète alternant séquences de visionnage PGN (`pgn`) et embranchements interactifs QCM (`qcm`).
- **Position initiale affichée** :
  - **Étape `pgn`** : Affiche `stage.fenDepart` (position avant les coups de la séquence, ou position **après** le coup validé du QCM précédent pour les séquences suivantes).
  - **Étape `qcm`** : Affiche la FEN exacte au nœud d'embranchement (avant le choix du coup).
  - Orientation : déduite du trait de la FEN initiale de la partie.
- **Affiché vs Caché** :
  - **Étape `pgn`** : Échiquier en lecture seule, boutons `Début / Précédent / Suivant` (pas de bouton Fin), zone de commentaire sous l'échiquier (`💬 ...`), et shapes du coup courant (ou `startingShapes` au départ).
  - **Étape `qcm`** : Échiquier en lecture seule avec les **shapes du nœud parent** (flèches de couleur), barre fixe `"Trouve le coup suivant"`, et **boutons de choix mélangés** (`shuffleChoices`). Les coups du PGN suivant sont cachés tant que le QCM n'est pas résolu.
- **Condition stricte de création d'une étape QCM (`hasValidQcmArrows`)** :
  - Le parser ne crée un embranchement `qcm` que si **les 2 conditions** sont réunies sur le nœud :
    1. Le nœud possède **plus d'un coup enfant** (`node.children.length > 1` : ligne principale + variantes).
    2. Le commentaire du nœud parent contient **au moins 3 flèches de couleurs distinctes** (`[%cal ...]`), **chacune partant d'une case occupée par une pièce** sur la position courante (`hasValidQcmArrows`).
  - *Sinon*, les variantes sont ignorées et la ligne principale continue en mode `pgn` normal.
- **Changement de vue** :
  - Clic sur `Étape suivante` dans `SeriesCardFooter` une fois l'étape courante résolue (dernier coup atteint en `pgn`, ou bonne réponse trouvée en `qcm`).
- **Après une réponse (en étape `qcm`)** :
  - **Mauvais choix** : Bouton en rouge (`danger`), feedback rouge avec le commentaire de la variante (ou `"Mauvais choix ! Cherchez encore."`). L'élève peut cliquer sur un autre choix.
  - **Bon choix** : Bouton en vert (`success`), tous les boutons sont désactivés, **le coup est joué/animé sur l'échiquier** (`qcmBoardApi.move(choice.san)`), feedback vert avec le commentaire du coup principal (ou `"Bravo ! C'est le meilleur coup."`).
  - L'élève clique sur `Étape suivante` pour passer à la séquence `pgn` suivante (qui démarre **après** le coup joué, avec son commentaire comme commentaire de départ).
- **Rédaction Entraîneur** :
  - Fournir un PGN complet avec `[FEN "..."]` si différent de la position initiale.
  - À chaque point de décision QCM, créer la ligne principale (bonne réponse) + au moins 2 variantes entre `(...)`, **et impérativement annoter la position juste avant l'embranchement avec 3 flèches de 3 couleurs différentes** partant chacune d'une pièce (ex. `{[%cal Ge2e4,Rd2d4,Bc2c4]}`).
  - Commenter chaque coup candidat `{Explication...}` : ces commentaires servent de feedback immédiat lors du clic !

---

### Type 5 — Posi'Plan (`TypePosiPlan.vue` + `posiPlanParser.ts`)

- **Rôle** : Évaluation stratégique en 3 modes : choix initial du plan (1 branche principale + variantes explorables), exploration libre des mauvaises variantes, puis déroulement de la branche principale (PGN + QCM).
- **Position initiale affichée** :
  - **Mode `initial_choice`** : Affiche `initialFen` (header `[FEN "..."]` ou position standard) avec `initialShapes`, orienté selon le trait de `initialFen`.
  - **Mode `variant_view`** : Affiche la position **après le 1er coup de la variante sélectionnée** (`currentVariantMoveIndex = 0`).
  - **Mode `main_branch`** : Démarre **après le 1er coup de la branche principale** (joué lors du choix initial) et enchaîne les sous-étapes `pgn` et `qcm` extraites de la suite.
- **Affiché vs Caché** :
  - **Mode `initial_choice`** : Échiquier `view-only`, barre `"Trouve le bon plan"`, boutons correspondant aux coups candidats à la racine du PGN (`root.children`, non mélangés : principale + variantes).
  - **Mode `variant_view`** : Bandeau jaune/warning `"Variante alternative : ..."`, bouton `"Choix initial"`, échiquier `view-only`, contrôles `Début / Précédent / Suivant`, zone de commentaire, et bouton `"Retourner au choix initial"` en fin de variante.
  - **Mode `main_branch`** : Alternance `pgn` (contrôles + commentaires) et `qcm` (barre `"Trouve le coup suivant"` + choix mélangés).
- **Changement de vue** :
  - Clic sur une **variante alternative** au choix initial → bascule immédiate en `variant_view`.
  - Clic sur `"Choix initial"` ou `"Retourner au choix initial"` → retour en `initial_choice`.
  - Clic sur le **bon plan initial** puis clic sur `Étape suivante` dans `SeriesCardFooter` → bascule en `main_branch`.
- **Après une réponse** :
  - **Choix initial correct** : Bouton en vert, coup joué sur l'échiquier, feedback vert (`explanation`), déblocage du bouton `Étape suivante` dans le footer.
  - **Sous-étape QCM dans `main_branch`** : Identique au Type 4 (mauvais choix → rouge + explication ; bon choix → vert + coup joué sur l'échiquier + déblocage de `Étape suivante`).
- **Rédaction Entraîneur** :
  - Rédiger un PGN dont le **1er coup** comporte la branche principale (bon plan) et 1 ou plusieurs variantes `(...)` (plans alternatifs à explorer).
  - Dans la suite de la branche principale, tout embranchement (`node.children.length > 1`) génère automatiquement un sous-QCM (sans contrainte des 3 flèches contrairement au Type 4).

---

### Type 6 — Associ'Plan (`TypeAssociPlan.vue` + `associPlanParser.ts` + `MatchingViewer.vue` + `PgnViewer.vue`)

- **Rôle** : Associer 4 diagrammes à leurs 4 descriptions textuelles (Carte 1), puis visionner les 4 PGN correspondants (Cartes 2 à 5).
- **Position initiale affichée** :
  - **Carte 1 (`MatchingViewer`)** : 4 mini-échiquiers affichant chacun la `fen` de départ de son PGN (mélangés aléatoirement), avec les shapes du commentaire initial.
  - **Cartes 2 à 5 (`PgnViewer`)** : Affiche le PGN complet de chacune des 4 paires dans l'ordre d'origine (`mode="study"`).
- **Affiché vs Caché** :
  - **Carte 1** : Colonne gauche = 4 mini-échiquiers mélangés (sans coordonnées) ; colonne droite = 4 descriptions fixes (`Option A` à `D`, couleurs bleu/violet/orange/rose). Bouton `"Valider mes choix"` affiché uniquement lorsque les 4 liaisons sont effectuées.
  - **Cartes 2 à 5** : `PgnViewer` complet (contrôles Début/Précédent/Suivant/Fin + commentaires).
- **Changement de vue** :
  - **Carte 1 → Carte 2** : Après validation réussie des 4 associations, clic sur `Position suivante` dans `SeriesCardFooter`.
  - **Cartes 2 → 5** : Clic sur `Position suivante` / `Terminer l'exercice` une fois le PGN déroulé jusqu'au bout (`onPgnFinished`).
- **Après une réponse (Carte 1)** :
  - Clic sur `"Valider mes choix"` : les paires correctes sont **verrouillées en vert** (`✓ Correct`), les paires erronées sont **supprimées** pour correction immédiate, feedback rouge `"Certaines associations sont incorrectes, réessayez !"`.
  - Si 4/4 correctes : feedback vert `"Bravo ! Toutes les correspondances sont trouvées."`, déblocage du footer.
- **Rédaction Entraîneur** :
  - Fournir 4 PGN (`paires[0..3]`).
  - Pour chaque PGN : définir `[FEN "..."]` et placer **la description du plan dans le commentaire initial avant le 1er coup** `{Description du plan...}` (avec d'éventuels `[%csl]` / `[%cal]`).

---

### Type 7 — La Marche du Héros (`TypeMarcheHeros.vue` + `PuzzleViewer.vue`)

- **Rôle** : Reconstituer chronologiquement 3 séries de 5 diagrammes (`3x5`) ou 5 séries de 3 diagrammes (`5x3`), issues de parties PGN, puis trouver le coup décisif final de chaque série.
- **Extraction des diagrammes depuis les PGN** :
  - Pour chaque série (`config.series`), le code lit le PGN à partir de `[FEN "..."]`.
  - Si le camp à jouer (`orientation`) n'est pas celui du trait initial de la FEN, le **1er coup du PGN est joué automatiquement** avant de capturer le diagramme 0.
  - Les diagrammes suivants sont capturés tous les **2 demi-coups** (un tour complet).
  - Le dernier coup restant constitue le puzzle final (`solution: [dernierCoup]`) avec `lastMoveHighlight` sur le coup précédent.
- **Position initiale affichée & Affiché vs Caché selon les 3 sous-étapes** :
  1. **`selection`** : Grille 2 colonnes de tous les mini-diagrammes restants dans la banque (mélangés), avec coche de sélection.
  2. **`ordonnancement`** : Grille 2 colonnes des 3 ou 5 diagrammes de la série choisie (mélangés), numérotés `1..N`, avec bandeau `"Touchez deux cartes pour permuter leur position chronologique."` (mode *Tap & Swap*).
  3. **`resolution`** : Grand échiquier `PuzzleViewer` sur la position finale de la série (avec `shapes` et `lastMoveHighlight`).
- **Changement de vue** :
  - `selection` → `ordonnancement` : Lorsque les N cartes sélectionnées appartiennent toutes à la même partie, clic sur `Classer la série` dans `SeriesCardFooter`.
  - `ordonnancement` → `resolution` : Lorsque l'ordre `0..N-1` est exact, clic sur `Coup suivant`.
  - `resolution` → Série suivante : Lorsque le coup décisif est joué, clic sur `Série suivante` (ou `Terminer l'exercice`). *Optimisation* : pour la **dernière série**, comme il ne reste que ses cartes dans la banque, la phase `selection` est sautée et l'élève passe directement en `ordonnancement`.
- **Après une réponse** :
  - `selection` : Si N cartes sélectionnées de parties différentes → feedback rouge immédiat ; si même partie → feedback vert + bouton `Classer la série`.
  - `ordonnancement` : Dès que l'ordre est exact → feedback vert `"Chronologie exacte ! Bravo."` + bouton `Coup suivant`.
  - `resolution` : Mauvais coup → annulé + feedback rouge `"Mauvais coup, cherchez encore !"` (2500 ms). Bon coup → feedback vert `"Coup décisif trouvé !"` + bouton `Série suivante`.
- **Rédaction Entraîneur** :
  - Choisir le `mode` (`3x5` ou `5x3`) et fournir 3 ou 5 `series` avec `pgn_data`, `couleur_joueur`, et optionnellement `shapes`.
  - Chaque PGN doit contenir **au moins `(nbDiagrammes - 1) * 2 + 1` demi-coups** (soit min 9 demi-coups pour `3x5`, 5 demi-coups pour `5x3`) afin de générer tous les diagrammes + le coup final à trouver.

---

### Type 8 — Vision'Échecs (`TypeVisionChecs.vue` → `VisionViewer.vue`)

- **Rôle** : Visualisation mentale sans pièces sur l'échiquier : lire la liste des pièces et trouver le coup cible à l'aveugle.
- **Position initiale affichée** :
  - **Phase `reflexion`** : L'échiquier affiché est **complètement VIDE** (`8/8/8/8/8/8/8/8 w/b - - 0 1`), orienté selon le trait de la FEN.
- **Affiché vs Caché** :
  - **Phase `reflexion`** : Panneau latéral/supérieur `"Pièces sur l'échiquier"` listant toutes les pièces extraites de la FEN (icône + case, ex. `e4`). L'échiquier est vide (`view-only`, cliquable par case). Les shapes d'origine sont cachées ; seul un **cercle bleu** s'affiche sur la case de départ cliquée.
  - **Phase `revelation`** : **La FEN complète est révélée** sur l'échiquier avec toutes les `shapes` du diagramme.
- **Changement de vue** :
  - Le joueur clique sur la **case de départ** (cercle bleu affiché), puis sur la **case d'arrivée**. Si la paire `(orig, dest)` correspond à la **flèche bleue** (`brush: 'blue'`) du diagramme, passage immédiat en phase `revelation`.
- **Après une réponse** :
  - **Mauvais couple de cases** : Feedback rouge `"Ce n'est pas le bon coup ! Réessayez."` (effacé après 2000 ms), sélection réinitialisée.
  - **Bon couple de cases** : La position réelle apparaît, feedback vert `"Bravo ! Bon coup trouvé."`, puis après **400 ms**, le coup trouvé est **animé sur l'échiquier** (`boardApi.move({ from, to })`). L'élève clique sur `SeriesCardFooter` pour passer au diagramme suivant.
- **Rédaction Entraîneur** :
  - Fournir une liste de `diagrammes[]` avec `fen` complète et une **flèche bleue** (`[%cal Be2e4]`) dans `shapes` indiquant le coup à trouver.

---

### Type 9 — Parcours (`TypeParcours.vue` + `ParcoursViewer.vue` + `parcoursVariants.ts`)

- **Rôle** : Déplacer une pièce sur l'échiquier (ou identifier la pièce d'après ses traces) selon 5 variantes.
- **Variantes et logique** :

  1. **Variante `standard` (Parcours classique)** :
     - **Position affichée** : `fen_depart`, **en retirant automatiquement la pièce éventuellement présente sur `case_arrivee`** (cible verte) tant que non résolu.
     - **Affiché vs Caché** : Cercle bleu sur `case_depart`, cercle vert sur `case_arrivee`, cases rouges (`red`/`r`) interdites. **Toutes les flèches (`dest` différent de `orig`) sont cachées** au départ et révélées uniquement une fois résolu.
     - **Validation** : Interdit de poser la pièce sur une case rouge (`"Case interdite !"`). Gagné dès que `to === case_arrivee`.

  2. **Variante `pacman` (Gourmand)** :
     - **Position affichée** : `fen_depart` complète (avec toutes les pièces adverses à capturer).
     - **Affiché vs Caché** : Toutes les `shapes` configurées + cercles bleu/vert.
     - **Validation** : Interdit sur case rouge. Si la pièce atteint `case_arrivee` alors qu'il reste au moins une pièce adverse sur l'échiquier → erreur `"Il reste des pièces à manger !"`. Gagné quand toutes les pièces adverses sont capturées et `to === case_arrivee`.

  3. **Variante `stealth` (Pas vu, pas pris)** :
     - **Sous-mode Cible** (`case_arrivee` fournie et différente de `case_depart`) : `fen_depart` avec pièce retirée sur `case_arrivee` si présente ; flèches cachées jusqu'à résolution.
     - **Sous-mode Boucle (`isLoop`)** (`case_arrivee` absente ou égale à `case_depart`) : `fen_depart` intacte. Utilise `LoopTracker` (suivi angulaire autour de la pièce adverse extraite de la FEN, 4 quadrants + rotation ≥ 95 % + retour à `case_depart` en ≥ 4 coups).
     - **Validation** : Interdit sur case rouge (`"Case interdite !"`) et interdit sur toute case attaquée par l'adversaire (`isSquareAttacked` → `"Vous avez été repéré !"`).

  4. **Variante `traces` (Qui a laissé ces traces ?)** :
     - **Position affichée** : **Échiquier VIDE** (`8/8/8/8/8/8/8/8 w - - 0 1`), `view-only`.
     - **Affiché vs Caché** : Toutes les `shapes` (traces/flèches) sont affichées sur l'échiquier vide + palette des 6 pièces blanches (`Roi, Dame, Tour, Fou, Cavalier, Pion`) sous l'échiquier.
     - **Validation** : Clic sur la pièce attendue (`piece_attendue`, sinon 1ère pièce trouvée dans `fen_depart`).

  5. **Variante `developpement` (Destination cachée — dérivée de `stealth`)** :
     - **Position affichée** : `fen_depart` intacte (la destination finale est toujours libre).
     - **Affiché vs Caché** : Toutes les flèches et la case cible (**cercle vert** ou **cercle bleu cible** au format alternatif sans cercle vert) sont **cachées** au départ. Seules d'éventuelles cases rouges interdites et l'éventuel cercle bleu de départ (`case_depart`) restent visibles.
     - **Résolution de la cible (`extractDeveloppementTargetSquare`)** : Priorité à `case_arrivee`, sinon cercle vert dans `shapes`, sinon cercle bleu dans `shapes` différent de `case_depart`. Jamais en mode boucle (`isLoop = false`).
     - **Validation** : Mêmes contraintes que `stealth` : interdit sur case rouge (`"Case interdite !"`) et sur toute case attaquée par l'adversaire (`isSquareAttacked` → `"Vous avez été repéré !"`). Gagné dès que la pièce atteint la case cible par **n'importe quel chemin légal** sûr.

- **Après une réponse (toutes variantes de déplacement)** :
  - **Coup invalide** : Feedback rouge + réinitialisation complète de la position (`resetPosition()`) après **400 ms**.
  - **Coup valide intermédiaire** : Efface le feedback éventuel, le joueur continue à déplacer sa pièce (`setSoloMode(true)`).
  - **Parcours réussi** : Feedback vert, échiquier verrouillé (`isSolved`), révélation de `fen_depart` et de toutes les `shapes` (dont les flèches et cibles cachées en `standard`/`stealth`/`developpement`). Passage au parcours suivant via `SeriesCardFooter`.
- **Rédaction Entraîneur** :
  - Définir `series[]` avec `variante` (`standard`, `pacman`, `stealth`, `traces`, `developpement`), `fen_depart`, `couleur_joueur`, `case_depart`, `case_arrivee` (ou vide pour boucle `stealth`, ou déduit des `shapes` pour `developpement`), `piece_attendue` (pour `traces`), et `shapes` (cases rouges interdites, traces, flèches/cercles).

---

### Type 10 — Échec & Éval (`TypeEchecEval.vue` → `EvalViewer.vue`)

- **Rôle** : Exercice en 3 phases séquentielles : évaluation positionnelle (QCM), résolution tactique, puis explication PGN.
- **Position initiale affichée & Phases** :
  1. **Phase `questions`** : Échiquier `view-only` sur `fenDepart` avec `shapes`, carte de question (`type_reponse: 'yesno'` → Oui/Non, ou `'evaluation'` → Bonne/Neutre/Mauvaise). Header : `Question X / N`.
  2. **Phase `tactique`** : `PuzzleViewer` sur `fenDepart` avec `solutionMoves` et `shapes`. Header : `Tactique`.
  3. **Phase `solution`** : `PgnViewer` avec `pgnExplication`. Header : `Explication` / `Solution`.
- **Changement de vue** :
  - Toutes les questions validées → bascule automatique vers `tactique`.
  - Séquence tactique résolue → bascule automatique vers `solution`.
- **Après une réponse** :
  - En `questions` : Toast succès/erreur (2000 ms / 3500 ms avec `explication`).
  - En `tactique` : Toast `PuzzleViewer` par défaut.
  - En `solution` : `SeriesCardFooter` passe à `isSolved = true` (`"Séquence résolue !"`) avec bouton `Terminer l'exercice`.
- **Rédaction Entraîneur** :
  - Fournir `fen_depart` (ou `fen`), `couleur_joueur`, `shapes`, `theme`, `questions[]` (`texte`, `type_reponse`, `reponse_attendue`, `explication`), `solution_moves[]` (coups SAN), et `pgn_explication`.

---

### Type 11 — Class'Échecs (`TypeClassEchecs.vue` → `OrderViewer.vue`)

- **Rôle** : Classer une liste de diagrammes (3 ou 5) dans l'ordre exact attendu (ex. du plus faible au plus fort).
- **Position initiale affichée** :
  - Colonne gauche `"À trier"` : tous les diagrammes mélangés (`shuffleArray`), rendus par `DiagramViewer` (`view-only`).
  - Colonne droite `"Classement final"` : emplacements vides numérotés `1..N`.
- **Affiché vs Caché** : Aucune flèche/shape particulière, uniquement les positions FEN et leur orientation.
- **Changement de vue** : Aucun changement de vue ; interaction *Tap & Tap* (clic banque → clic emplacement pour placer ; clic emplacement occupé → retour en banque).
- **Après une réponse** :
  - Clic sur `"Valider l'ordre"` (dans `SeriesCardFooter`, actif dès que la banque est vide) :
    - **Erreur** : Tous les diagrammes mal placés sont **renvoyés automatiquement dans la banque** ; les bien placés restent en place. Feedback rouge `"L'ordre est incorrect. Observez bien les positions !"`.
    - **Succès** : Feedback vert `"Bravo ! L'ordre est exact."`, `isSolved = true`, bouton `Terminer l'exercice`.
- **Rédaction Entraîneur** :
  - Fournir `positions[]` **dans l'ordre exact attendu** (le composant mélange automatiquement au chargement) avec `fen`, `couleur_joueur`, `shapes`.

---

### Type 12 — Qui suis-je ? (`TypeQuiSuisJe.vue` → `QuiSuisJeViewer.vue`)

- **Rôle** : Deviner une pièce ou une case à partir d'indices textuels.
- **Variantes** :
  1. **Variante `pieces`** (défaut) :
     - **Position / Visuel** : Aucun échiquier affiché. Encart d'indices (`Indices & Affirmations`) + palette des 6 pièces blanches (`Roi, Dame, Tour, Fou, Cavalier, Pion`).
     - **Après une réponse** : Erreur → feedback rouge `"Ce n'est pas le/la [Pièce], réessaie !"`. Succès → feedback vert + bouton Suivant dans `SeriesCardFooter`.
  2. **Variante `cases`** (`variante: 'cases' | 'case' | 'square'`) :
     - **Position / Visuel** : Encart d'indices + **échiquier VIDE** (`8/8/8/8/8/8/8/8 w - - 0 1`), orientation blanche, `view-only`, cliquable par case.
     - **Après une réponse** : Erreur → feedback rouge `"La case X n'est pas la bonne réponse, réessaie !"`. Succès → **cercle vert** affiché sur la case trouvée, feedback vert, échiquier verrouillé, bouton Suivant dans `SeriesCardFooter`.
- **Rédaction Entraîneur** :
  - Choisir `variante` (`pieces` ou `cases`) et fournir `series[]` avec `indices`, et soit `piece` / `piece_attendue` (`R, D, T, F, C, P` ou `K, Q, R, B, N, P`), soit `case_attendue` / `reponse_case` (ou un cercle vert dans `shapes`).

---

### Type 13 — Ouvre'Boîte (`TypeOuvreBoite.vue` → `OuvreBoiteViewer.vue` + `ouvreBoiteParser.ts`)

- **Rôle** : Choisir le meilleur coup d'ouverture parmi 3 propositions (en cliquant sur un bouton ou en jouant directement le coup sur l'échiquier).
- **Position initiale affichée** :
  - Affiche `fenDepart` extraite du mini-PGN (`[FEN "..."]`, sinon position standard), orientée selon le trait de la FEN.
- **Affiché vs Caché** :
  - **Pendant la recherche** : Échiquier interactif avec toutes les shapes extraites (si aucune shape `[%cal]` n'est fournie dans le PGN, le parser génère automatiquement des **flèches colorées** `green, yellow, blue, red` pour chaque coup proposé). Sous l'échiquier : carte `"Quel coup choisissez-vous ?"` avec les boutons mélangés (libellés en français, ex. `"Fou f1 en c4"`).
  - **Une fois résolu** : La carte de choix est **remplacée** par un encart `LearningFeedbackCallout` `"Explication"` affichant le commentaire du bon coup.
- **Changement de vue** : Substitution de la carte des choix par l'encart d'explication dès que le bon coup est choisi ou joué.
- **Après une réponse** :
  - **Coup incorrect (bouton)** : Bouton en rouge, encart d'explication rouge sous les choix avec le commentaire de la variante, feedback rouge dans le footer.
  - **Coup incorrect (sur l'échiquier)** : Si le coup fait partie des variantes, même feedback + réinitialisation de la position sur `fenDepart` après **1200 ms**. S'il ne fait pas partie des choix proposés, warning + réinitialisation après **800 ms**.
  - **Bon coup** : Si cliqué via bouton, le coup est **joué sur l'échiquier** (`boardApi.move`). Encart d'explication vert, feedback vert `"Excellent coup !"`, déblocage du bouton Suivant dans `SeriesCardFooter`.
- **Rédaction Entraîneur** :
  - Fournir `exercices[]` contenant chacun un mini-PGN :
    - `[FEN "..."]` (optionnel si début de partie)
    - 1er coup = bonne réponse `{Explication...}` + variantes entre `(...)` = mauvaises réponses `{Explication...}`.
    - Ajouter `[%cal ...]` pour personnaliser les flèches (sinon générées automatiquement).

---

### Type 14 — Cap ou pas Cap ? (`TypeCapOuPasCap.vue` → `CapOuPasCapViewer.vue`)

- **Rôle** : Type polyvalent à **6 variantes** configurables via `variante` (ou `type_reponse`).
- **Règle commune d'affichage initial** :
  - **Shapes** : Tant que la carte n'est pas résolue (`!isCardSolved`), **seuls les cercles jaunes** (`filterYellowShapes`) sont affichés sur l'échiquier ; toutes les autres shapes (vertes, rouges, bleues, flèches) sont **cachées** et révélées uniquement après résolution.
  - **Animation d'un coup PGN au démarrage** : Pour les variantes `qcm_multiple`, `qcm_oui_non` et `notation`, si le mini-PGN contient un coup (`moves.length > 0`), l'échiquier affiche d'abord la `fen` de départ puis **joue automatiquement le 1er coup après 300 ms** (`triggerDelayedMove`). Ce n'est pas le cas pour `move`, `setup` et `clic`.

- **Détail des 6 variantes** :

  1. **`qcm_oui_non` (ou `qcm`)** :
     - **Affiché** : Échiquier `view-only` + question commune + boutons d'options (`OUI`/`NON` ou `options_reponse`).
     - **Après réponse** : Si correct et qu'une explication existe (`comment` PGN ou `move_explication`), le panneau de choix est **remplacé** par l'encart `"Explication"`, les shapes complètes sont révélées, et le footer passe au vert.

  2. **`qcm_multiple`** :
     - **Affiché** : Échiquier `view-only` + liste de `propositions[]`, chacune avec ses boutons `options_reponse`.
     - **Après réponse** : Vérification déclenchée dès que **toutes** les propositions ont une sélection. Si tout est bon, remplacement par l'encart `"Explication"`, révélation des shapes, footer vert.

  3. **`move` (Coup unique ou Multi-coups)** :
     - **Position** : `fen` de départ, échiquier interactif (`view-only = false`).
     - **Sous-mode Coup unique** (1 coup attendu via `move_san` ou ligne principale) : Bon coup → feedback vert + révélation des shapes. Mauvais coup → annulé (`undoLastMove`) + feedback rouge.
     - **Sous-mode Multi-coups** (si plusieurs coups candidats à la racine du PGN) : Affiche un compteur `"Trouvés : X / N"` et des puces des coups trouvés. À chaque coup valide intermédiaire, feedback vert `"Coup trouvé (X/N) !"` et **réinitialisation de l'échiquier sur `fen` après 700 ms** pour chercher les autres coups. Quand `X === N`, résolu + révélation des shapes.

  4. **`notation`** :
     - **Position** : `fen` de départ (ou après 1er coup PGN après 300 ms), échiquier `view-only`.
     - **Affiché** : Liste de toutes les pièces présentes dans la `fen` (triées Blancs puis Noirs, Roi→Pion) avec un champ texte par pièce pour saisir sa notation française (ex. `Ce4`, `e4`, `Dd1`).
     - **Après réponse** : Validation en temps réel par ligne (`✓` / `✗`). Quand toutes les cases sont remplies et exactes → résolu + révélation des shapes.

  5. **`clic` (3 sous-modes via `mode_clic`)** :
     - **Sous-mode `cibles`** (défaut) : L'élève clique sur les cases cibles (cercles non jaunes/oranges dans le PGN). Chaque clic ajoute/retire un cercle rouge temporaire. Quand le nombre de clics = nombre de cibles et toutes trouvées → résolu + révélation des shapes.
     - **Sous-mode `materiel`** : L'élève doit entourer les pièces en excès matériel (calculé automatiquement entre Blancs et Noirs), OU cliquer sur `"⚖️ Pas de différence de matériel"` si le matériel est égal.
     - **Sous-mode `prises_meilleur_coup` (2 phases)** :
       - *Phase `clic` (1/2)* : Échiquier `view-only`, l'élève clique sur toutes les pièces attaquées (cercles non jaunes).
       - *Phase `move` (2/2)* : Dès que toutes les cibles sont trouvées, `clicPhase` passe à `'move'`, l'échiquier devient interactif et l'élève doit jouer la meilleure prise (cercle vert `[%csl G...]` en priorité, sinon `move_san`, flèche verte ou coup PGN).

  6. **`setup` (Reconstitution d'échiquier, 2 sous-modes via `mode_setup`)** :
     - **Sous-mode `memoire`** :
       - *Phase `memorize`* : Affiche la `fen` complète (avec `conseil` éventuel) et bouton `"J'ai mémorisé !"`.
       - *Phase `reconstruct`* : Au premier passage, l'échiquier est **vidé** (`8/8/8/8/8/8/8/8`) et `shapes` cachées. Affiche la palette des 12 pièces + gomme (`❌`) et un bouton `"👁️ Revoir la position"` pour rebasculer temporairement en `memorize` (en conservant les pièces déjà posées au retour).
     - **Sous-mode `texte`** :
       - Démarre directement en `reconstruct` sur un **échiquier VIDE**, avec la description textuelle générée automatiquement (`Blancs : Rg1, Dd1... — Noirs : ...`).
     - **Validation** : Vérifiée automatiquement à chaque pose/retrait de pièce. Dès que toutes les pièces de la `fen` sont exactement à leur place → résolu + révélation des shapes.

- **Rédaction Entraîneur** :
  - Toujours fournir `variante` (+ `mode_clic` ou `mode_setup` si applicable) et `exercices[]`.
  - Dans les PGN : utiliser des **cercles jaunes** `[%csl Y...]` pour les repères visibles avant résolution, et d'autres couleurs (`G, R, B`) pour les cibles à cliquer ou à révéler après résolution.
  - Pour `move` multi-coups : lister tous les coups valides en variantes au 1er coup du PGN.

---

### Type 15 — Le Jugement Final (`TypeJugementFinal.vue` → `JugementFinalViewer.vue`)

- **Rôle** : Observer 3 plans animés en boucle sur des mini-échiquiers, choisir le meilleur plan, puis consulter l'explication PGN.
- **Position initiale affichée** :
  - **Phase `observation`** : Grand échiquier fixe sur `fenDepart` (`"Position de départ"`), plus **3 mini-échiquiers** (`Plan 1`, `Plan 2`, `Plan 3`) qui démarrent sur `fenDepart` puis **jouent en boucle** les coups de leur PGN (`1 coup / 1000 ms`, pause `2500 ms` à la fin, puis retour sur `fenDepart`).
  - **Phase `explication`** : `PgnViewer` complet affichant `pgnExplication`.
- **Affiché vs Caché** :
  - **Phase `observation`** : Les commentaires des scénarios et `is_correct` sont cachés ; seul le titre `Plan X` et `"Toucher pour choisir"` sont affichés.
  - **Phase `explication`** : Remplace toute la vue d'observation par le `PgnViewer`.
- **Changement de vue** :
  - Clic sur le scénario marqué `is_correct: true` → arrêt de tous les timers d'animation, bascule vers `explication`.
- **Après une réponse** :
  - **Mauvais plan** : Toast erreur `"Ce n'est pas le meilleur plan, observez encore !"`, l'élève reste en phase `observation`.
  - **Bon plan** : Toast succès `"Excellente analyse ! Voici l'explication détaillée."` + passage en `explication` (`SeriesCardFooter` à l'étape `2 / 2` avec bouton `Terminer l'exercice`).
- **Rédaction Entraîneur** :
  - Fournir `fen_depart` (ou `fen`), `couleur_joueur`, 3 `scenarios[]` (`pgn` + `is_correct: boolean`) et `pgn_explication`.

---

### Type 16 — Destination Finale (`TypeDestinationFinale.vue` → `TextOrderViewer.vue`)

- **Rôle** : Remettre dans le bon ordre chronologique ou logique une liste d'étapes textuelles, puis visionner l'explication PGN.
- **Position initiale affichée** :
  - **Phase `order`** : Échiquier `view-only` sur `fenDepart`, orienté selon `couleurJoueur`.
  - **Phase `solution`** : `PgnViewer` complet affichant `pgnExplication`.
- **Affiché vs Caché** :
  - **Phase `order`** : Échiquier fixe + liste réordonnable (`ion-reorder-group`) des étapes textuelles mélangées (`etapes_texte`).
  - **Phase `solution`** : Remplace l'échiquier et la liste par `PgnViewer`.
- **Changement de vue** :
  - Clic sur `"Valider l'ordre"` dans `SeriesCardFooter` lorsque l'ordre est exact → bascule vers `solution`.
- **Après une réponse** :
  - **Ordre incorrect** : Toast erreur `"L'ordre des étapes n'est pas correct, réessayez !"`, l'élève reste en phase `order`.
  - **Ordre exact** : Toast succès `"Excellente réponse ! L'ordre des étapes est parfait."`, passage en phase `solution` (`SeriesCardFooter` étape `2 / 2` avec bouton `Terminer l'exercice`).
- **Rédaction Entraîneur** :
  - Fournir `fen_depart` (ou `fen`), `couleur_joueur`, `etapes_texte[]` **dans l'ordre exact attendu** (mélangées automatiquement au chargement), et `pgn_explication`.

---

## 3. Historique des révisions

| Version doc | Version DAME-PWA | Date | Modifications |
| :--- | :--- | :--- | :--- |
| `1.0.0` | `1.13.11` | `2026-11-21` | Rédaction initiale des spécifications TDD & Guide Entraîneur pour les Types 1 à 16. |
| `1.1.0` | `1.13.11` | `2026-11-21` | **Type 9 (Parcours)** : ajout de la 5ᵉ variante `developpement` (dérivée de `stealth` à destination cachée, support double format Bleu+Vert et Cercle Bleu seul). |
