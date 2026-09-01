# Changelog
Tous les changements notables apportés à ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Ajouté & Amélioré
- **Adaptation Dynamique en Hauteur (Viewport Height `vh` / `clamp`) & Raccourcis d'Accueil** (`variables.css`, `TabsPage.vue`, `PublicHomePage.vue`, `USING.md`, `README.md`) :
  - **Typographie Fluide Indexée sur la Hauteur (`clamp(16px, 0.92rem + 0.35vh, 18px)`)** : Adaptation proportionnelle à la hauteur d'écran pour compenser la très haute résolution des dalles modernes allongées (Google Pixel 9, Samsung S24+ / Ultra, iPhone Pro Max) sans jamais tasser les écrans plus compacts.
  - **Variables de Mise en Page Dynamiques** : Introduction de `--app-section-gap`, `--app-item-min-height`, `--app-card-padding` et `--app-thumbnail-size` calculés en `vh` / `clamp` pour un étirement naturel et harmonieux de l'ensemble des blocs de l'application.
  - **Barre d'Onglets Tactile Redimensionnée (`TabsPage.vue`)** : Hauteur portée à `clamp(56px, 6.5vh, 64px)`, icônes à `clamp(24px, 3vh, 28px)` et labels à `clamp(11.5px, 1.4vh, 13px)` en graisse `600`.
  - **Tuiles de Raccourcis d'Accès Rapide (`PublicHomePage.vue`)** : Rangée de 3 cartes interactives sous la préinscription (🏆 *Tournois*, ♟️ *Jeu & Cours*, 📅 *Calendrier*) enrichissant la page d'accueil et occupant 100 % de l'espace vertical disponible.

## [1.2.7] - 2026-08-31

### Ajouté & Amélioré
- **Montée de Version Majeure Ionic 9 (`@ionic/vue` & `@ionic/vue-router` v9.0.1)** (`package.json`, `package-lock.json`, `README.md`) :
  - **Mise à niveau du socle applicatif** : Migration de `@ionic/vue` et `@ionic/vue-router` de la v8.8 vers la v9.0.1.
  - **Compatibilité pleine et entière avec Vue 3.5, Vue Router 5 et Capacitor 8** : Aucun breaking change sur les formulaires, composants d'échiquier personnalisés et cycle de vie des modales.
  - **Préservation stricte de l'écosystème WordPress / React 18** : Maintien intact des overrides et dépendances React 18 pour l'outillage de build Gutenberg (`@wordpress/scripts`).

### Corrigé & Amélioré
- **Unification du Mode iOS et Optimisation Typographique Android Haute Densité (Pixel 9, S24, POCO, iPhone)** (`main.ts`, `variables.css`, `TabsPage.vue`, `PublicHomePage.vue`) :
  - **Unification globale du mode de rendu (`IonicVue { mode: 'ios' }`)** : Application uniforme du thème `ios` sur tous les appareils et navigateurs, éliminant les disparités de densité et de compacité du thème Material Design (`md`) sur les terminaux Android Stock haute résolution (Google Pixel 9).
  - **Base Typographique Fluide (`font-size: 100%`)** : Définition d'une base fluide compatible avec le moteur *Non-Linear Font Scaling* d'Android 14 et 15.
  - **Nettoyage des micro-polices et ergonomie d'onglets** : Suppression des tailles en dur restrictives (`9px`) dans la barre de navigation inférieure au profit des standards Ionic harmonisés (`11px` / `22px` pour les icônes).
  - **Équilibrage de la Page d'Accueil (`PublicHomePage.vue`)** : Rehaussement des métas/descriptions (`0.95rem`), augmentation des vignettes d'actualités (`64px`) et passage de l'affichage des actualités et événements récents à 4 entrées pour une occupation visuelle naturelle sur les écrans modernes longs (20:9).
- **Normalisation & Stabilité Dimensionnelle des Échiquiers (`shared-components.scss`, `TypePartieHeros.vue`, `PlacementViewer.vue`, `ABCDaireTactiqueViewer.vue`)** :
  - **Verrouillage contre le rétrécissement Flexbox (`flex-shrink: 0`)** : Empêche la compression verticale et horizontale de l'échiquier lors de l'apparition dynamique de blocs sous-jacents (commentaires de coup PGN, cartes ou boutons de choix QCM).
  - **Standardisation de la taille maximale (`max-width: 500px`)** : Suppression de la contrainte variable `min(500px, 60vh)` dans la classe globale `.chessboard-container` au profit d'une taille constante sur un appareil donné.
  - **Suppression des surcharges CSS locales `scoped`** : Nettoyage des redéfinitions locales redondantes dans `TypePartieHeros.vue`, `PlacementViewer.vue` et `ABCDaireTactiqueViewer.vue` assurant une continuité visuelle parfaite lors de la transition entre étapes PGN, FEN et QCM.

### Ajouté & Amélioré
- **Navigation PGN & Pédagogie Pas-à-Pas (`PgnViewer.vue`, `ABCDaireTactiqueViewer.vue`, `TypePartieHeros.vue`)** :
  - **Suppression de l'Avance Rapide en Fin de PGN (Exercices Type 3 & 4)** : Retrait du bouton d'accès direct à la fin du PGN dans le lecteur de récapitulation du Type 3 (ABCDaire) et dans les étapes PGN du Type 4 (Partie du Héros). L'apprenant doit obligatoirement parcourir la séquence coup par coup avec le bouton *Suivant* afin de lire l'ensemble des commentaires, explications et annotations tactiques.

- **Chronométrage & Cycle de Vie des Exercices (`ContenuPage.vue`, `apprentissage.ts`, composants `Type*.vue`)** :
  - **Mesure Centralisée du Temps Passé** : Démarrage d'un chronomètre à l'affichage de chaque leçon ou exercice dans `ContenuPage.vue` et transmission de la durée exacte (`time_spent`) en secondes lors de la validation via l'API REST ROI (`validerElement(id, timeSpentSeconds, attemptsCount)`).
  - **Délégation Événementielle Unifiée** : Suppression des appels prématurés ou redondants à `store.validerElement(id)` dans l'ensemble des sous-composants d'exercices (`TypePopEchecs.vue`, `TypePosiPlan.vue`, `Type100Commandements.vue`, `TypeABCDaire.vue`, `TypeAssociPlan.vue`, `TypeCapOuPasCap.vue`, `TypeDestinationFinale.vue`, `TypeEchecEval.vue`, `TypeJugementFinal.vue`, `TypeOuvreBoite.vue`, `TypePartieHeros.vue`). Les composants émettent désormais exclusivement l'événement `@success` vers le parent `ContenuPage.vue` qui assure la persistance atomique du temps.

- **Fourniture du Web Worker Stockfish (`Plugin.php`)** :
  - Enregistrement du filtre WordPress `dame_pwa_stockfish_worker_url` et de la méthode `get_stockfish_worker_url()` permettant aux plugins de l'écosystème (comme ROI) d'accéder directement au binaire Stockfish mutualisé dans la PWA sans duplication de fichiers.

## [1.2.6] - 2026-08-30

### Corrigé & Amélioré
- **Exercices Type 3 ABCDaire Tactique (`ABCDaireTactiqueViewer.vue`)** :
  - **Prise en charge des FEN partielles sans Roi (`PositionError: ERR_KINGS`)** : Sécurisation du décodage de la position initiale (`Chess.fromSetup()`) sans appel bloquant à `.unwrap()`.
  - **Extraction directe des coups PGN pour positions pédagogiques** : Conservation immédiate des coups et variantes textuels (`san` brut, ex: `1. Nd6+`) même lorsque la FEN initiale décrit une position incomplète ne répondant pas aux règles FIDE complètes.
  - **Validation fluide des déplacements** : Les coups attendus sont désormais fidèlement reconnus et validés sur l'échiquier interactif sur toutes les positions d'exercices d'entraînement.

## [1.2.5] - 2026-08-27

### Ajouté & Amélioré
- **Refonte de l'Exercice Type 4 : La Partie dont tu es le Héros (`TypePartieHeros.vue`, `partieHerosParser.ts`)** :
  - **Découpage Dynamique d'Étude PGN** : Parsing complet d'un PGN d'étude d'échecs (`chessops`) découpant automatiquement la partie en séquences de défilement PGN et en embranchements QCM interactifs.
  - **Détection Automatique des Choix QCM** : Identification des points de décision via les 3 flèches indicatrices `[%cal ...]` et les 2 variantes associées au coup principal.
  - **Feedbacks Contextuels Différenciés** : Affichage des explications de l'auteur directement dans le feedback de `SeriesCardFooter` (explication de la variante en rouge en cas d'erreur, explication de la ligne principale en vert en cas de réussite).
  - **Expérience Utilisateur Unifiée** : Navigation avec défilement pas-à-pas commenté, `ExerciseHeader` dynamique et `SeriesCardFooter` réservant sa zone de feedback pour une stabilité visuelle optimale.
  - **Rétrocompatibilité Totale** : Prise en charge automatique des anciens formats JSON multi-étapes.

- **Refonte de l'Exercice Type 3 ABCDaire Tactique (`ABCDaireTactiqueViewer.vue`, `TypeABCDaire.vue`)** :
  - **Exécution Runtime d'une Série de 4 Mini-PGN** : Interprétation client autonome des 4 positions tactiques configurées sous format standard PGN.
  - **Orientation Dynamique selon le Trait** : Détection du camp au trait dans la FEN de départ et orientation automatique de l'échiquier (trait aux noirs -> noirs en bas).
  - **Boucle Interactive Joueur / Ordinateur** : Masquage total des formes/shapes durant la phase de jeu, annulation automatique en cas d'erreur sans limite d'essais, réplique automatique de l'ordinateur après un délai naturel de 500ms jusqu'au coup final du PGN.
  - **Mode Révélation & Relecture PGN (`PgnViewer.vue`)** : Une fois la variante résolue, transition instantanée vers le visualiseur PGN pas-à-pas avec restitution immédiate des commentaires et des formes/shapes (`[%csl ...]`, `[%cal ...]`) sur la position de départ (`ply 0`) et tout au long de la séquence de coups.
  - **Fiabilisation des watchers d'Échiquier (`Chessboard.vue`)** : Calcul conditionnel de `normalizedDiagram` évitant toute réinitialisation intempestive des formes lors de l'instanciation de visualiseurs autonomes.
  - **Intégration d'En-tête et Pied de Série Unifiés** : Utilisation des composants transverses `ExerciseHeader` (consigne et badge `Carte X / 4`) et `SeriesCardFooter` (feedback fixe et passage à la carte suivante).
  - **Rétrocompatibilité Totale** : Prise en charge automatique des anciens enregistrements d'exercices à FEN unique (`fen`, `solution`).

## [1.2.4] - 2026-08-25

### Ajouté & Amélioré
- **Assistance et Suggestions Stockfish dans la Partie (`PlayPage.vue`, `usePlayGame.ts`)** :
  - **Déclenchement du calcul dès le 1er coup** : Initialisation et lancement explicite de l'analyse Stockfish lors de l'activation du bouton « Aide » au coup 0 (`toggleHint`), garantissant l'apparition de la flèche de suggestion verte sans nécessiter de coup préalable.
  - **Maintien de la flèche d'aide lors des interactions manuelles (`@shapes-change`)** : Écoute de l'événement de modification des formes de l'échiquier pour redessiner automatiquement la flèche verte du meilleur coup (`lastSuggestedMove`) si une pièce est saisie puis relâchée/désélectionnée sur le plateau.
  - **Cycle de vie propre de la suggestion** : Persistance de `lastSuggestedMove` durant toute la phase de réflexion du joueur et réinitialisation ciblée dès qu'un coup est validé sur l'échiquier.
  - **Optimisation de la réinitialisation de partie** : Élimination de l'appel `resetBoard()` redondant lors du démarrage d'une nouvelle partie pour laisser le cycle de rendu Vue réinstancier l'échiquier de façon parfaitement synchronisée.

### Modifié & Amélioré
- **Ergonomie & Design de l'Écran Profil (`ProfilePage.vue`, `ChessThemeCustomizer.vue`, `USING.md`)** :
  - **Panneau Accordéon Dépliable** : Mise en place d'un panneau accordéon pour la personnalisation de l'échiquier. En état replié par défaut, un résumé compact du style actif est affiché (*« Style actif : Pièces • Fond »*) avec un chevron rotatif, évitant l'encombrement vertical de l'écran.
  - **Désactivation des interactions sur la prévisualisation** : Figeage complet des pièces de l'échiquier de prévisualisation (`:board-config="{ viewOnly: true }"`, `pointer-events: none` et `user-select: none`) pour éviter tout déplacement accidentel.
  - **Harmonisation visuelle des cartes & contrastes** : Unification des styles de cartes (`border-radius: 14px`, `padding: 16px`, bordure fine `1px solid var(--ion-color-step-150)` et ombre douce). Adoucissement de l'Espace Administration et bascule du bouton de déconnexion en style `outline` rouge pour un meilleur équilibre visuel.
  - **Standardisation de la hauteur des boutons** : Calibrage ergonomique unifié (`--min-height: 48px`, `--border-radius: 10px`, `font-size: 15px`, `font-weight: 600`) pour tous les boutons d'action du profil (Accès Administration, Changement d'identité, Enregistrement des styles, Déconnexion).

## [1.2.3] - 2026-08-25

### Modifié & Amélioré
- **Actualisation des Jeux de Pièces & Thèmes d'Échiquier (`chessPreferences.ts`, `ChessThemeCustomizer.vue`, `USING.md`, `README.md`)** :
  - **Jeux de pièces vectoriels (10 styles)** : Mise à disposition de la liste complète (`cburnett`, `merida`, `alpha`, `cardinal`, `dubrovny`, `fantasy`, `firi`, `maestro`, `tatiana`, `staunty`) avec `CBurnett` en style par défaut et confirmation du retrait définitif de l'ancien style `staunton`.
  - **Thèmes de fond d'échiquier (9 palettes)** : Intégration de `wood3` (*Bois Veiné HD*) aux côtés des 8 autres textures/couleurs (`brown`, `blue`, `green`, `ic`, `grey`, `purple`, `wood`, `maple`), avec `Brown (Bois)` en thème par défaut.
  - **Interface Profil & Customizer** : Mise à jour du libellé d'action pour rétablir les préférences par défaut (*CBurnett & Brown*).
  - **Synchronisation documentaire** : Mise à jour conjointe de `README.md` et `USING.md`.

## [1.2.2] - 2026-08-25

### Ajouté & Amélioré
- **Standardisation des Thèmes & Jeux de Pièces (`chessPreferences.ts`, `ChessThemeCustomizer.vue`, `VisionViewer.vue`, `QuiSuisJeViewer.vue`)** :
  - **Jeu de pièces par défaut (`cburnett`)** : Alignement sur le standard Lichess / Chess.com et retrait du jeu doublon obsolète `staunton` conformément à `eg-chessboard` 1.6.4.
  - **Actualisation des options de personnalisation** : Liste des jeux vectoriels disponible enrichie (`cburnett`, `merida`, `alpha`, `cardinal`, `dubrovny`, `maestro`, `staunty`, `fantasy`, `tatiana`).
  - **Mise à jour de la documentation** : Actualisation de `USING.md` pour refléter la combinaison par défaut *Cburnett* & *Bois Classique*.
- **Harmonisation des Feedbacks & Navigation par Cartes (`PlacementViewer.vue`, `VisionViewer.vue`)** :
  - **Suppression des toasts redondants** : Élimination des appels superflus à `useFeedback` (`showSuccess`/`showError`) dans `PlacementViewer.vue` pour centraliser l'information visuelle uniquement sur `SeriesCardFooter`.
  - **Indicateur d'étape dynamique (`VisionViewer.vue`)** : Ajout du badge d'étape `Carte X / 4` dans `ExerciseHeader` pour harmoniser l'expérience avec `PlacementViewer`.
- **Support des Exercices Pop'Echecs (Type 2) en Série de 4 Diagrammes (`PlacementViewer.vue`, `TypePopEchecs.vue`, `fenUtils.ts`)** :
  - **Moteur d'interprétation client** : Détection automatique de la pièce cible à partir du cercle bleu (`brush: 'blue'`), extraction de la position initiale sans la pièce (`removePieceFromFen`) et orientation dynamique selon le trait de la FEN (`getActiveColorFromFen` : Noirs en bas si le trait est aux Noirs).
  - **Masquage et révélation des annotations** : Les formes et flèches (`shapes`) sont masquées pendant la phase de réflexion, puis entièrement révélées sur l'échiquier dès que l'apprenant clique sur la bonne case cible.
  - **Gestion de la série interactive** : Intégration d'un en-tête `ExerciseHeader` synchronisé avec la consigne spécifique du diagramme actif et du pied de série `SeriesCardFooter` avec feedback visuel et validation à l'issue des 4 cartes.
  - **Utilitaires et tests unitaires** : Ajout des fonctions d'analyse FEN/Shapes dans `fenUtils.ts` et couverture de test complète dans `TypePopEchecs.spec.ts`.

## [1.2.1] - 2026-08-25

### Ajouté & Amélioré
- **Centralisation et normalisation des styles SCSS/CSS récurrents (Étape 3 du plan de refactorisation)** :
  - **Enrichissement de `pwa/src/theme/shared-components.scss`** : Centralisation modulaire des styles transverses par familles d'éléments (Layouts, Échiquiers, Cartes & En-têtes, Choix QCM, Palettes & Pièces, Bannières & Actions).
  - **Nomenclature canonique stricte et épurée** :
    - Layouts : `.exercise-viewer-layout`, `.exercise-stage`.
    - Échiquiers : `.chessboard-container`, `.chessboard-container--mini` (320px pour appariement et choix de scénarios), `.chessboard-container--small`.
    - Cartes : `.exercise-card`, `.exercise-card-header`.
    - QCM : `.qcm-choices`, `.choice-btn`, `.choice-btn--centered` (avec gestion du retour à la ligne natif Ionic via `&::part(native)`).
    - Palettes & Pièces : `.piece-palette`, `.piece-btn`, `.piece-icon-box` (unification des sélecteurs de pièces vectorielles via `:is(piece, .piece)` et neutralisation du damier d'arrière-plan).
    - Actions & Feedback : `.feedback-banner`, `.feedback-text`, `.exercise-action-btn`.
  - **Nettoyage massif des styles scoped redondants** : Élimination totale des blocs `<style scoped>` dupliqués dans l'ensemble des Viewers d'exercices (`PlacementViewer`, `CapOuPasCapViewer`, `PuzzleViewer`, `ParcoursViewer`, `QcmViewer`, `TextOrderViewer`, `InteractiveQcmViewer`, `QuiSuisJeViewer`, `JugementFinalViewer`, `VisionViewer`, `MatchingViewer`, `PgnViewer`, `EvalViewer`).
  - **Documentation technique et directives agent à jour** : Tableau exhaustif des classes par famille dans `README.md` et mise à jour des règles projet dans `pwa/AGENTS.md`.
- **Harmonisation complète des Viewers d'Exercices (Étape 2 du plan de refactorisation)** :
  - **Migration vers le composant unifié `<Chessboard>`** : Intégration systématique du wrapper standardisé dans `PuzzleViewer.vue`, `QcmViewer.vue`, `ParcoursViewer.vue`, `VisionViewer.vue`, `CapOuPasCapViewer.vue`, `InteractiveQcmViewer.vue`, `MatchingViewer.vue`, `EvalViewer.vue`, `JugementFinalViewer.vue`, `DiagramViewer.vue` et `PgnViewer.vue`.
  - **Standardisation des retours utilisateurs via `useFeedback`** : Remplacement des appels directs à `toastController` par les méthodes réactives et typées `showSuccess()` et `showError()` dans tous les viewers d'apprentissage.
  - **Gestion propre du cycle de vie des échiquiers** : Destruction et nettoyage systématique des instances mémoires des échiquiers à l'unmount des composants.
- **Indicateur visuel d'état de connexion sur l'onglet Profil (`TabsPage.vue`)** :
  - Remplacement de l'icône statique par un affichage dynamique et réactif selon l'état d'authentification (`authStore.isAuthenticated`).
  - **Connecté** : Icône `personCircle` (icône pleine d'utilisateur) et libellé personnalisé avec le prénom de l'adhérent (ou `Profil`).
  - **Déconnecté** : Icône `logInOutline` (porte de connexion avec flèche entrante) et libellé `Connexion` pour inciter visuellement à l'authentification.
- **Gestion optimisée du cycle de vie des sessions et renouvellement transparent (`stores/auth.ts`, `utils/safeFetch.ts`)** :
  - **Verrou de concurrence (Mutex)** : Mise en place d'un singleton de promesse (`activeRefreshPromise`) empêchant les requêtes concurrentes de consommer plusieurs fois le `refresh_token` à usage unique lors des retours d'inactivité ou des événements multiples.
  - **Anti-rebond de validation** : Débouncing sur `validateSession()` pour harmoniser les déclenchements entre `document.visibilitychange` et `App.appStateChange`.

### Corrigé & Fiabilisé
- **Gestion des séquences et transitions dans les exercices interactifs** :
  - **Détection de fin de défilement PGN (`PgnViewer.vue`)** : Détection fiable du dernier coup par stabilisation du ply (`beforePly === afterPly`), assurant le déclenchement de l'événement `@finished` et la transition automatique vers les étapes de résolution interactive (ex: QCM / Puzzle dans `TypePartieHeros.vue`).
  - **Verrouillage des coups automatiques de l'ordinateur (`PuzzleViewer.vue`)** : Mise en place d'un verrou (`isComputerPlaying`) évitant que le coup automatique joué par l'ordinateur ne soit réinterprété comme un coup du joueur dans la séquence multi-coups (résolution de l'erreur `reading 'from'` sur les exercices de type T10 Échec & Éval et les puzzles tactiques).
  - **Activation des coordonnées par défaut sur `<Chessboard>` (`Chessboard.vue`)** : Affichage par défaut des repères de colonnes (a-h) et rangées (1-8) sur l'ensemble des échiquiers du module apprentissage (Vision'Checs, Partie du Héros, PosiPlan, etc.), tout en préservant la possibilité de les masquer sur les mini-diagrammes (`MatchingViewer.vue`).
  - **Harmonisation UI/UX de `InteractiveQcmViewer` et `TypePosiPlan` (`InteractiveQcmViewer.vue`, `TypePosiPlan.vue`)** :
    - Alignement complet sur la présentation de `QcmViewer` (largeur de carte, typographie et disposition des boutons de choix).
    - Intégration de la barre de feedback unifiée `SeriesCardFooter` affichant les explications de chaque choix.
    - Synchronisation dynamique de la consigne et du badge d'étape dans l'en-tête `ExerciseHeader`.
- **Prise en charge des coups tactiques et préservation des shapes (`TypePartieHeros.vue`, `PuzzleViewer.vue`)** :
  - **Support du type `puzzle`/`move` dans `TypePartieHeros.vue`** : Prise en charge des étapes nécessitant un déplacement de pièces sur l'échiquier (en plus des étapes PGN et QCM).
  - **Tolérance & normalisation des coups dans `PuzzleViewer.vue`** : Prise en charge des formats SAN (`Nf3`, `exd5`), LAN (`e2e4`, `g1f3`) et sans ponctuation (`#`, `+`, `=`), évitant tout blocage lorsque le coup attendu est au format UCI ou SAN simplifié.
  - **Persistance et réaffichage immédiat des shapes sur coup incorrect** : Réapplication automatique des flèches et cercles d'aide (`setShapes`) lors de l'annulation (`undoLastMove`) d'un coup erroné.
  - **Priorisation et persistance du `refresh_token` (`stores/auth.ts`)** : Prise en charge native du `refresh_token` émis par le plugin WordPress *Simple JWT Login v4*, assurant le maintien transparent de la session même après plusieurs jours d'inactivité.
  - **Purge de session expirée (`stores/auth.ts`)** : Ajout d'une vérification proactive d'expiration JWT (`isTokenExpired`) et déconnexion systématique (`logout()`) lorsque le rafraîchissement échoue définitivement, empêchant la persistance d'une session fantôme et l'envoi répété de tokens invalides.
  - **Interception HTTP 400 dans `safeFetch` (`utils/safeFetch.ts`)** : Prise en charge des rejets HTTP 400 émis par le plugin WordPress *Simple JWT Login* sur les requêtes avec en-tête `Authorization`, déclenchant immédiatement le rafraîchissement transparent du jeton et le rejeu de la requête.
  - **Repli automatique de l'Agenda (`stores/agenda.ts`)** : Extension du repli gracieux aux erreurs HTTP 400 (en plus de 401/403) pour basculer automatiquement en requête publique sans en-tête d'autorisation et garantir l'affichage des événements même en cas d'anomalie de token.
  - **Validation des coups suggérés sur l'Échiquier (`composables/play/usePlayGame.ts`)** : Contrôle du format des cases UCI (`/^[a-h][1-8]$/`) pour éliminer l'erreur SVG `<line> attribute NaN` lors des coups spéciaux ou de fin de partie Stockfish (`bestmove (none)`).
  - **Correction du badge d'étape des 100 Commandements (`views/types/Type100Commandements.vue`)** : Transmission de la prop `stepBadgeText` au composant `ExerciseHeader` pour l'affichage correct du compteur de questions.

## [1.2.0] - 2026-08-23

### Ajouté & Amélioré
- **Optimisation de l'affichage Échiquier sur iPad et Tablettes en mode Paysage** :
  - **Partie d'Échecs (`PlayPage.vue`)** : Levée de la contrainte globale de largeur `max-width: 600px` en mode paysage via la classe dynamique `landscape-wrapper`, permettant à l'échiquier d'occuper harmonieusement l'écran (`width: min(75vh, 50vw)`) avec centrage vertical et disposition aérée des commandes de jeu.
  - **Analyse de partie (`AnalysisPage.vue`)** : Suppression du bridage de largeur en mode paysage, garantissant l'alignement responsive parfait entre le plateau et le panneau latéral de défilement de l'historique des coups.
- **Affichage Split-View (Master-Detail 1/3 - 2/3) en mode Paysage sur Tablette & Ordinateur** :
  - Conditionnement de la media query (`min-width: 1024px` ou `min-width: 768px and min-height: 600px in landscape`) pour réserver le Split-View aux véritables tablettes et ordinateurs, tout en préservant la vue pleine largeur naturelle sur iPhone et smartphones en mode paysage.
  - **Actualités (`ActualitesSegmentView.vue`)** : Allègement des cartes de la liste latérale (suppression des extraits de texte verbeux, vignettes compactes et titres percutants) permettant d'afficher 3 à 4 articles simultanément.
  - **Tournois (`TournoisSegmentView.vue`)** : Remplacement des grandes cartes génériques par une liste compacte et dense d'éléments avec icône trophée, titre et statut.
  - **Agenda Liste (`AgendaSegmentView.vue`)** : Colonne 1/3 liste des événements chronologiques, colonne 2/3 affichage détaillé (`AgendaDetailContent.vue`) avec bouton GPS/carte et actions. Sélection intelligente de l'événement courant/à venir par défaut.
  - **Bénévolat (`BenevolatSegmentView.vue`)** : Colonne 1/3 liste des appels en cours et terminés, colonne 2/3 panneau d'inscription et de vote des créneaux (`BenevolatDetailContent.vue`).
  - **Extraction et mutualisation des vues de détail** : Refactorisation de `NewsDetailPage.vue`, `AgendaDetailPage.vue`, `GenericPage.vue`, `BenevolatDetailPage.vue` et `BenevolatVotePage.vue` pour déléguer leur rendu aux composants purs de contenu sans aucune duplication de code.
- **Affichage iPad et Écrans larges en Mode Paysage pour l'Agenda (`AgendaCalendarView.vue`)** :
  - Mise en place d'une disposition responsive en deux colonnes (50% / 50%) sur tablettes et écrans larges en mode paysage (`@media (min-width: 768px), (orientation: landscape) and (min-width: 640px)`).
  - La moitié gauche accueille le calendrier du mois (en-tête mois, jours de la semaine et grille mensuelle) dimensionné pour être intégralement visible sans aucun défilement vertical de la page.
  - La moitié droite accueille la liste des événements du jour sélectionné avec son propre défilement interne (`overflow-y: auto`).
- **Navigation fluide dans le Calendrier de l'Agenda (`AgendaCalendarView.vue`)** :
  - Clic sur un jour hors du mois courant (jours du mois précédent ou suivant affichés pour compléter les semaines) : bascule automatiquement la vue sur le mois ciblé, charge ses événements et sélectionne la date cliquée.
- **Recentrage automatique & Synchronisation de l'Agenda (`LeClubPage.vue`)** :
  - Déclenchement systématique de `agendaStore.fetchAgenda()` et `scrollToCurrentEvent()` lors de l'accès à l'onglet Agenda ou du changement de segment pour garantir le rafraîchissement complet des événements sans dépendre d'un passage préalable par l'accueil.
  - Déclenchement automatique de `scrollToCurrentEvent()` lors du basculement en vue Liste (`changeAgendaViewMode`).
  - Fiabilisation du scroll (`behavior: 'smooth', block: 'start'`) vers l'événement du jour ou le prochain événement à venir.

### Corrigé & Fiabilisé
- **Fiabilisation du chargement de l'Agenda (`stores/agenda.ts`, `LeClubPage.vue`)** :
  - Découplage de l'indicateur d'état `isLoading` et du verrou interne de requête (`isFetchingAgenda`) pour éviter l'annulation prématurée de `fetchAgenda()` lors de l'initialisation de la vue.
  - Nettoyage du hook `onIonViewWillEnter` pour garantir le chargement systématique et fluide des événements sans collision d'état.

## [1.1.1] - 2026-08-23

### Corrigé & Fiabilisé
- **Fiabilisation des mises à jour PWA & Persistance de session** :
  - Invalidation automatique du cache persistant TanStack Query (`DAME_QUERY_CACHE`) lors de la détection d'une nouvelle version de bundle applicatif sans déconnecter l'utilisateur ni effacer son token de session.
  - Découplage du jeton JWT brut dans les clés de cache de l'Agenda (`stores/agenda.ts`) au profit d'un état discriminant `'auth' | 'public'` pour éviter les duplications et désynchronisations lors du renouvellement de token ou au retour d'arrière-plan.
  - Nettoyage et sécurisation de la session (`stores/auth.ts`) : déconnexion systématique en cas d'échec de renouvellement de jeton JWT (`tryRefreshToken`), en préservant uniquement la session lors des coupures réseau temporaires.
  - Repli gracieux automatique en mode public lors des erreurs 401/403 de l'Agenda afin d'assurer l'affichage des événements sans blocage.
  - Correction de l'emplacement du composant `ion-refresher` (Pull-to-refresh) en enfant direct de `ion-content` sur la page d'accueil publique (`PublicHomePage.vue`).
  - Dynamisation de la date du jour `todayStr` via un `computed()` réactif (`agendaStore.getTodayLocal()`) pour fiabiliser le filtrage des événements à venir sur l'accueil public.
  - Ajout d'un bouton explicite "Actualiser l'agenda" dans la vue de l'agenda (`AgendaSegmentView.vue`).
  - Augmentation du timeout réseau de 4s à 8s sur les requêtes d'agenda pour sécuriser les connexions mobiles lentes.

## [1.1.0] - 2026-08-21

### Ajouté
- **Personnalisation globale du thème de fond et du jeu de pièces de l'échiquier** :
  - Création du store Pinia persistant `useChessPreferencesStore` (`pwa/src/stores/chessPreferences.ts`) mémorisant les choix `pieceSet` et `boardTheme`.
  - Intégration des 8 jeux de pièces vectoriels (`staunton`, `merida`, `cburnett`, `alpha`, `cardinal`, `dubrovny`, `maestro`, `staunty`) et des 8 thèmes de plateau (`brown`, `blue`, `green`, `ic`, `grey`, `purple`, `wood`, `maple`) d'`eg-chessboard`.
  - Composant interactif compact `ChessThemeCustomizer.vue` (`pwa/src/components/profile/ChessThemeCustomizer.vue`) avec double rouleau rotatif inline direct (`wheel-picker`), prévisualisation en direct de l'échiquier en position initiale, bouton d'enregistrement avec toast de confirmation et bouton de rétablissement des valeurs par défaut.
  - Intégration directe dans le profil adhérent (`pwa/src/views/ProfilePage.vue`).
  - Propagation globale et réactive des préférences sur l'ensemble des 16 composants et viewers d'échiquier de la PWA (`PlayPage`, `AnalysisPage`, `PuzzleViewer`, `DiagramViewer`, `CapOuPasCapViewer`, `EvalViewer`, `InteractiveQcmViewer`, `JugementFinalViewer`, `MatchingViewer`, `ParcoursViewer`, `PgnViewer`, `PlacementViewer`, `QcmViewer`, `QuiSuisJeViewer`, `TextOrderViewer`, `VisionViewer`).

### Amélioré & Sécurisé
- **Typage strict TypeScript & Éradication intégrale des `any` (`pwa/src/`)** :
  - Remplacement de plus d'une vingtaine d'occurrences de types `any` dans les composants, vues, stores, composables et utilitaires du frontend PWA.
  - Création de l'interface transverse WordPress (`pwa/src/types/wp.ts` : `WpPage`, `WpUser`, `WpFeaturedMedia`).
  - Typage strict des instances de l'échiquier `eg-chessboard` (`BoardCore`, `DrawShape`, `Move`, `Key`).
  - Typage strict des gestionnaires d'événements Ionic (`RefresherCustomEvent`, `InfiniteScrollCustomEvent`, `ItemReorderCustomEvent`).
  - Typage précis des stores (`BenevolatDay`, `BenevolatTimeSlot`, `MessageRecipient`, `Identity`, `AssociatedMember`).
  - Activation de la règle ESLint `@typescript-eslint/no-explicit-any: 'error'` dans `eslint.config.js` pour verrouiller définitivement l'interdiction de tout `any` explicite.

### Amélioré
- **Centralisation de `playerColor` via l'état `BoardCoreState` (`eg-chessboard`)** :
  - Mise à jour des utilitaires `undoMove` et `getMaterialDiffDisplay` (`pwa/src/utils/boardApiWrapper.ts`) pour lire automatiquement la couleur du joueur depuis l'état de l'échiquier (`boardApi.getState().playerColor`).
  - Typage strict du composable `usePlayGame.ts` avec `BoardCore` et allègement de l'appel d'annulation de coup (`undoMove`).

## [1.0.3] - 2026-08-18

### Ajouté & Amélioré
- **Synchronisation réactive du tour de jeu (`PlayPage.vue`, `usePlayGame.ts`)** :
  - Intégration d'`eg-chessboard` v1.5.0 avec écoute de l'événement natif `@turn-change` pour actualiser instantanément l'indicateur et le message du tour (*"C'est au tour des Blancs / Noirs"*).
  - Introduction d'une référence réactive `turnColor` dans le composable `usePlayGame` mise à jour sur chaque action (coup, annulation, reset).
- **Mise en cache & Lazy Loading des sous-vues du club (`LeClubPage.vue`)** :
  - Chargement asynchrone (`defineAsyncComponent`) des composants d'onglets (`ActualitesSegmentView`, `AgendaSegmentView`, `TournoisSegmentView`, `BenevolatSegmentView`).
  - Préservation de l'état des segments avec `<KeepAlive>` lors de la navigation entre onglets.

### Optimisé
- **Lazy loading complet du routeur & Code Splitting (`pwa/src/router/index.ts`)** :
  - Remplacement de tous les imports statiques de vues (`TabsPage`, `LoginPage`, `MembersPage`, `ContactsPage`, `LeClubPage`, `BenevolatPage`, `MessagesPage`, `AdminLayout`) par des imports dynamiques asynchrones (`() => import(...)`).
  - Réduction de la taille du chunk initial `index-[hash].js` pour les visiteurs et adhérents non-administrateurs, avec mise en cache partagée du composant réutilisable `BenevolatPage` entre les routes publiques et d'administration.

### Corrigé
- **Optimisation du stockage local & Suppression de la double persistance (`pwa/src/stores/agenda.ts`)** :
  - Suppression de l'option `persist: true` du store Pinia Agenda afin d'éviter la duplication du tableau des événements dans le `localStorage`. La persistance hors-ligne reste intégralement gérée par TanStack Query (`queryClient.ts` / `DAME_QUERY_CACHE`), éliminant les risques d'engorgement du quota `localStorage` (5-10 Mo) et les blocages au démarrage.

## [1.0.2] - 2026-08-15

### Ajouté
- **Hub Apprentissage & Pratique (`ApprentissageHubPage.vue`)** :
  - Accueil à deux panneaux séparant l'accès aux cours théoriques et l'accès à l'échiquier de jeu.
  - Ruban diagonal **"En dev"** sur le panneau des cours théoriques avec accès réservé aux profils autorisés (administrateurs, entraîneurs) pendant la phase de conception.
- **Intégration du moteur Stockfish 18 WebAssembly** :
  - Déploiement des binaires `stockfish.js` et `stockfish.wasm` dans `pwa/public/stockfish/`.
  - Configuration du type MIME `application/wasm` via `.htaccess` et secours PHP dans `Plugin.php`.
  - Gestion du temps de réflexion dynamique de l'IA calculé selon le niveau Elo (`Elo * 1.4 ms`).
  - Mémorisation locale (`localStorage`) du niveau d'Elo choisi pour les prochaines sessions.
- **Vue d'analyse de partie (`AnalysisPage.vue`)** :
  - Enregistrement de la route `/analysis` et reconnexion au bouton "Analyser" de la barre d'actions.
  - Revue coup par coup, tableau structuré des coups joués et navigation (`Premier`, `Précédent`, `Suivant`, `Dernier`).

### Modifié & Harmonisé
- **Refonte et harmonisation visuelle de l'Espace de Jeu (`PlayPage.vue`, `PlayInfoBar.vue`, `PlayActionsPanel.vue`)** :
  - Épuration complète de l'échiquier : suppression des barres superflues ("Adversaire" / "Toi"), du matériel et des pendules / chronomètres.
  - En-tête blanc/neutre iOS standard avec bouton `< Back` bleu.
  - Carte d'information méta style "Exercice" avec typographie soignée et badge d'Elo.
  - Marges latérales et espacements aérés calés sur le standard de l'application (`max-width: 600px`, `class="ion-padding"`).
  - Barre d'actions avec boutons épurés `outline`, icônes modernes et badges de compteurs discrets.
- **Harmonisation visuelle de l'Analyse (`AnalysisPage.vue`)** :
  - En-tête blanc/neutre iOS standard, carte méta récapitulative du nombre de coups, échiquier aéré avec coins arrondis et ombre douce.

### Corrigé
- **Gestion de fin de partie et échec et mat (`PlayPage.vue`)** :
  - Correction du déclenchement prématuré de `undoLastMove()` lors de la détection du mat, garantissant que la pièce victorieuse reste sur sa case finale.

## [1.0.1] - 2026-08-14

### Corrigé
- **Gestion des erreurs d'authentification (`pwa/src/stores/auth.ts`)** :
  - Extraction et décodage du payload JSON retourné par le SDK `simple-jwt-login` lors d'erreurs HTTP 400 (`HTTP Error: 400 - {...}`) afin d'afficher des alertes claires et traduites (ex: "Identifiants incorrects.") en cas de mauvais identifiant ou mot de passe.
- **Gestion des annulations de requêtes TanStack Query (`pwa/src/stores/agenda.ts`)** :
  - Silence des exceptions `CancelledError` lors de l'invalidation / purge légitime des requêtes de l'agenda pendant une connexion.
- **Ouverture des cartes et applications d'itinéraire (`AgendaDetailPage.vue`, `ContactDetailPage.vue`)** :
  - Remplacement de la liaison `:href` par un déclencheur explicite (`openMap()`) utilisant les schémas d'URL natifs (`maps://` sous iOS, `geo:` sous Android, Google Maps sous Web) avec inclusion du nom du lieu pour un guidage GPS fiable.
- **Navigation & Annulation sur l'écran de connexion (`pwa/src/views/LoginPage.vue`)** :
  - Ajout du bouton flèche de retour standard dans le header (`ion-back-button`) avec redirection par défaut vers `/tabs/home`.
  - Ajout d'un bouton explicite "Annuler" sous le formulaire de connexion.
- **Accessibilité & Focus à la connexion (`pwa/src/views/LoginPage.vue`)** :
  - Retrait anticipé du focus (`blur()`) lors de la soumission du formulaire pour éviter l'avertissement de blocage `aria-hidden` lors de la transition d'écran Ionic.
- **Étanchéité du cache TanStack Query & Pinia par statut d'authentification (`pwa/src/stores/agenda.ts`, `pwa/src/stores/auth.ts`)** :
  - Intégration du jeton JWT dans les clés de cache `fetchBatch` et `fetchMonthEvents` pour éviter le partage de requêtes et de données mis en cache entre sessions anonymes, abonnés et administrateurs.
  - Purge automatique du cache `queryClient.removeQueries({ queryKey: ['agenda'] })` lors de la déconnexion (`clearData()`), de la connexion réussie (`login()`) ou du changement d'identité rattachée (`selectIdentity()`).
- **Unification du chargement de l'Agenda (`LeClubPage.vue`, `pwa/src/stores/agenda.ts`)** :
  - Remplacement du requêtage manuel et de la logique de fusion dans `LeClubPage.vue` par un appel centralisé à `agendaStore.fetchAgenda()`.
- **Sécurisation du cache du Bénévolat (`pwa/src/stores/benevolat.ts`)** :
  - Suppression automatique des requêtes utilisateur `['benevolat', 'user-vote']` lors de la réinitialisation des stores (`clearData()`).

## [1.0.0] - 2026-08-14

### Ajouté
- **Représentation alternative de l'Agenda (Vue Calendrier style iOS)** (`pwa/src/components/agenda/AgendaCalendarView.vue`, `pwa/src/components/agenda/AgendaSegmentView.vue`) :
  - Ajout du composant `AgendaCalendarView` proposant une grille mensuelle 7 colonnes avec navigation de mois et bouton "Aujourd'hui".
  - Affichage sous les numéros de jours de puces colorées indiquant les catégories des événements du jour.
  - Sélection d'un jour pour afficher immédiatement la liste des événements associés en dessous de la grille avec bande de couleur de catégorie, plage horaire, titre et lieu.
  - Sélecteur de mode de vue (Liste ☰ / Calendrier 📅) dans l'Agenda avec sauvegarde de la préférence dans `localStorage` (`dame_agenda_view_mode`).

### Modifié
- **Correction de la recherche textuelle de l'Agenda** (`AgendaSegmentView.vue`, `AgendaCalendarView.vue`) :
  - Remplacement de la vérification restrictive sur `title.raw` par une recherche multicritère sur `title.rendered`, `title.raw`, `location_name`, `agenda_description` et `categories_data`.
  - Intégration et filtrage dynamique du champ de recherche sur les vues **Liste** ET **Calendrier** avec affichage d'un message adapté si aucun résultat.
- **Optimisation de l'affichage Calendrier et navigation par swipe** (`LeClubPage.vue`, `AgendaCalendarView.vue`) :
  - Suppression du bloc de titre condensé (`<ion-header collapse="condense">`) dans `LeClubPage.vue` pour libérer ~60px de hauteur utile et fixer le titre "Agenda" dans la toolbar supérieure sans besoin de scroller.
  - Compactage de la grille des jours (`aspect-ratio: 1 / 0.85`, pastilles de 5px, marges minimales) et réduction de la hauteur des éléments de liste pour afficher au moins 3 événements simultanément sans scroller.
  - Formatage court des sous-titres d'événements ("Jour entier" au lieu de "Toute la journée", horaires et intitulé du lieu séparés par des puces).
  - Prise en charge des gestes tactiles **Swipe horizontal** (`@touchstart` / `@touchend`) sur le calendrier pour naviguer intuitivement vers le mois précédent (swipe vers la droite) ou suivant (swipe vers la gauche).




- **Tri chronologique strict de l'agenda** (`pwa/src/stores/agenda.ts`, `AgendaSegmentView.vue`) :

  - Ajout d'une fonction `sortEvents` triant systématiquement tous les événements par date (`_dame_start_date`) et heure (`_dame_start_time`) lors des opérations de fusion (`fetchBatch`, `fetchAgenda`, `fetchMonthEvents`).
  - Garantie que la vue liste consécutive aux navigations dans le calendrier conserve un ordre chronologique parfait.
- **Nettoyage et conformité ESLint** (`eslint.config.js`, composables, utils et tests) :

  - Désactivation des règles React inappropriées (`react-hooks/*`) dans la config ESLint Vue.
  - Correction de l'auto-formatting Prettier / WordPress standards et résolution intégrale des erreurs et warnings.
- **Correction d'échelle et d'affichage mobile Android High-DPI (Samsung S24)** (`pwa/index.html`, `pwa/src/theme/variables.css`) :
  - Remplacement du `meta viewport` restrictif (`maximum-scale=1.0, user-scalable=no`) par une configuration fluide standard (`width=device-width, initial-scale=1.0, viewport-fit=cover`) afin de rétablir le calcul correct des pixels virtuels CSS sur Android WebView / Chrome.
  - Ajout des règles `-webkit-text-size-adjust: 100%; text-size-adjust: 100%;` pour bloquer l'auto-inflation sauvage du texte et garantir l'adaptabilité du composant `eg-chessboard`.
- **Intégration locale du SDK `simple-jwt-login` v1.0.0** (`pwa/src/stores/auth.ts`) :
  - Ajout de `"simple-jwt-login": "file:../js-sdk"` en dépendance locale dans `package.json` (même pattern que `eg-chessboard`).
  - Remplacement de l'implémentation manuelle `callSdk()` (~120 lignes : `getSiteRootUrl`, `JWT_NAMESPACE`, `JWT_CONFIG`, `AbortController`, parsing manuel) par les méthodes typées du SDK : `jwtSdk.authenticate()`, `jwtSdk.validateToken()`, `jwtSdk.revokeToken()`, `jwtSdk.getValidJwt()`.
  - Utilisation de `LocalStorageTokenStorage('dame')` — clés `dame:jwt` / `dame:refresh_token` — pour la persistance des tokens par le SDK. Le `token` ref Pinia reste la source de vérité pour les composants Vue, synchronisé via `onTokenRefreshed` et `setTokens()` à l'initialisation.
  - Le refresh silencieux et la déduplication des appels concurrents sont désormais gérés nativement par `getValidJwt()` du SDK.


### Sécurité
- **Suppression de la dépendance `simple-jwt-login` (npm)** :
  - Retrait du package npm `simple-jwt-login@0.1.5` qui utilisait des requêtes `XMLHttpRequest` **synchrones** sur le thread principal, déclenchant un avertissement de dépréciation navigateur.
  - Remplacement complet par une implémentation native `fetch` asynchrone dans `pwa/src/stores/auth.ts` (méthode `callSdk`), fidèle au comportement exact du SDK d'origine :
    - `authenticate` → `POST /?rest_route=/simple-jwt-login/v1/auth` (params en body JSON)
    - `refreshToken` → `POST /?rest_route=/simple-jwt-login/v1/auth/refresh` (params en body JSON)
    - `validateToken` → `GET /?rest_route=/simple-jwt-login/v1/auth/validate` (params en query string)
    - `revokeToken` → `POST /?rest_route=/simple-jwt-login/v1/auth/revoke` (params en body JSON)
  - Gestion robuste de `VITE_API_BASE_URL` relative (`.env.production = /wp-json`) via `window.location.origin` comme base de fallback pour la construction d'URL.
  - Timeout de 10 secondes via `AbortController` sur chaque appel JWT.


### Ajouté
- **Migration de l'installeur PWA dans `dame-pwa`** :
  - Transfert complet des styles CSS (`assets/css/public-pwa-installer.css`) et des scripts JS (`assets/js/public-pwa-installer.js`) de la bannière d'installation PWA depuis le plugin parent `dame`.
  - Enregistrement autonome de la bannière et du Service Worker via la nouvelle classe `DAME_PWA\Assets\FrontendAssets`.
  - Resolution des 404 sur les manifests et scripts via l'ajout de `<base href="./" />`, la redirection 302 avec headers `nocache` et la suppression du lien manifest manuel redondant.
- **Intégration directe de Stockfish dans la PWA (`vite.config.ts`, `PlayPage.vue`, `auth.ts`)** :
  - Copie et livraison automatique des fichiers `stockfish.js` et `stockfish.wasm` depuis `node_modules/eg-chessboard/dist/` lors de la build Vite avec `vite-plugin-static-copy`.
  - Conservation stricte des noms originaux pour garantir la liaison du module WebAssembly UCI.
  - Mise en cache hors-ligne via le Service Worker PWA (`VitePWA`) pour une utilisation 100% autonome.
  - Suppression de la récupération distante de `stockfish_url` depuis le backend WordPress (`pwa-config`).
- **Composant d'En-tête Unifié d'Exercice (`ExerciseHeader.vue`)** :
  - Création et déploiement du composant réutilisable `ExerciseHeader.vue` pour harmoniser l'affichage supérieur de l'ensemble des types d'exercices (Types 1 à 16).
  - **Panel 1 (Métadonnées Compactes)** : Affiche le titre de l'exercice sur la première ligne, puis le Type humain de l'exercice en bas à gauche et la chaîne `Chapitre // Niveau X` en bas à droite (ex: `Matérialité // Niveau 1`), où le chapitre correspond à l'un des 5 thèmes officiels (*Matérialité*, *Activité*, *Sécurité*, *Structure*, *Combinaison*).
  - **Panel 2 (Consigne / Question + Badge)** : Panneau ultra-compact combinant la consigne ou question courante et le badge de progression de série `x / N` (ex: `Diagramme 1 / 4`, `Question 1 / 3` ou `1 / 1`).
  - Ajout du helper `formatChapitreNiveauLabel()` dans `stringUtils.ts` et de la suite de tests unitaires Vitest dans `tests/unit/ExerciseHeader.spec.ts`.
- **Exercice Type 8 (Vision'checs) — Refonte Multi-Diagrammes & Panneau Responsive** :
  - Refonte complète de `VisionViewer.vue` et `TypeVisionChecs.vue` pour gérer la nouvelle structure API `config.diagrammes` (série de 4 diagrammes par exercice) avec rétrocompatibilité automatique pour l'ancien format monodiagramme (`config.fen_depart`).
  - Déduction dynamique du coup attendu depuis la flèche bleue (`brush: "blue"`) dans les `shapes` de chaque diagramme et orientation de l'échiquier selon le trait FEN (`w` ➔ blanc, `b` ➔ noir).
  - Création de la fonction utilitaire `fenUtils.ts` pour extraire automatiquement les pièces et leurs coordonnées depuis la FEN.
  - Rendu responsive dual-panel avec grille compacte à **4 colonnes sur mobile** (`<=768px`) sous forme de badges de pièces horizontaux avec fond neutre uniforme et icônes SVG natives (`<cg-board>`) devant leurs coordonnées (`c6`, `d7`, `b8`, etc.).
  - Dimensionnement dynamique de l'échiquier contraint par la hauteur de la vue (`max-width: min(100%, calc(100vh - 230px))`) garantissant l'affichage à 100% de l'échiquier (rangées 1 à 8 et colonnes a à h) sans aucun défilement vertical sur écran de téléphone.
  - Révélation de la position complète et animation du déplacement de la pièce (`boardApi.move(...)`) en maintenant les annotations visuelles (`:preserve-shapes-on-position-change="true"`).
  - Ajout de la suite de tests unitaires Vitest dans `tests/unit/TypeVisionChecs.spec.ts`.
- **Exercice Type 1 (100 Commandements) — Support des séries de QCM** :
  - Mise à jour du composant `Type100Commandements.vue` pour gérer la nouvelle structure API `config.qcms` (série de QCMs successifs) avec rétrocompatibilité automatique pour l'ancien format de QCM unique (`config.question`).
  - Enregistrement de la progression via `store.validerElement(id)` à la fin de la série complète de QCMs.
  - Ajout des tests unitaires Vitest correspondants dans `tests/unit/Type100Commandements.spec.ts`.
- **Affichage du type d'exercice dans la playlist des cours (`CoursPage.vue` & `stringUtils.ts`)** :
  - Remplacement des labels de statut textuels redondants ("Complété", "Disponible", "Verrouillé") sous chaque élément de la liste par le nom humain du type de contenu (ex: "100 Commandements", "Vision'checs", "Cap ou pas Cap ?", "Leçon"). L'état de progression de chaque élément reste clairement indiqué par l'icône de droite (coche verte pour complété, cadenas pour verrouillé, flèche pour disponible).
  - Ajout de la fonction utilitaire `getContenuTypeLabel()` et de la table `EXERCICE_TYPES_MAP` dans `stringUtils.ts` pour mapper dynamiquement le type de chaque exercice.

### Corrigé
- **Décodage des entités HTML dans les titres (`stringUtils.ts`, `CoursPage.vue`, `ContenuPage.vue`, `ApprentissageHubPage.vue`)** :
  - Ajout de la fonction utilitaire `decodeHtmlEntities()` (s'appuyant sur `DOMParser` avec repli par expressions régulières) pour éliminer les entités HTML affichées en brut (ex: `&#8211;`, `&rsquo;`, `&amp;`, `&#039;`) dans les titres de cours, de chapitres, d'exercices et l'en-tête navigateur.
- **Réinitialisation de l'état de réussite lors de la relecture d'un exercice (`ContenuPage.vue`)** :
  - Correction de l'initialisation de `estReussi` lors du chargement d'un exercice (`post_type === 'roi_exercice'`). Désormais, rejouer un exercice déjà validé antérieurement réinitialise l'affichage au premier QCM/étape et exige d'aller au bout de l'exercice pour afficher la carte "Exercice réussi !".
