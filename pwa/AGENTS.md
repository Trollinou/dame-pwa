# Directives Agent & Règles Projet — PWA Vue 3 / Ionic

## 1. Outillage & Interdictions
- **Règles d'édition** : Interdiction de charger des fichiers entiers si la tâche vise un bloc/fonction. Produire uniquement des diffs ou des composants isolés. Pas de commentaires verbeux ni disclaimers.
- **RESTRICTION MODULE `eg-chessboard`** : Interdiction STRICTE de modifier le code du dépôt `eg-chessboard`. En cas de bug, produire exclusivement un rapport de bug détaillé (bug report) pour correction externe.

## 2. Stack Technique & Architecture
- **Core** : Vue 3 (`<script setup lang="ts">`), TypeScript strict, Ionic Vue (`@ionic/vue`).
- **State & Data** : Pinia (`src/stores/`), TanStack Query (`@tanstack/vue-query` + `persistQueryClient`), TanStack Table (`@tanstack/vue-table`).
- **Échiquier** : Module `eg-chessboard` (`TheChessboard` / `BoardCore`).

## 3. Grilles de Données (`DataTable.vue` & Export CSV)
- **Composant Maître** : Toute liste/grille tabulaire doit s'appuyer sur `src/components/shared/DataTable/DataTable.vue`.
- **Rendu Responsive Dual-Mode** :
  - **Desktop (`>768px`)** : Data Grid HTML avec en-têtes fixes (sticky), tri interactif (`enableSorting: true`).
  - **Mobile (`<=768px`)** : Rendu `ion-list` via le slot `#mobile-item`.
- **Filtres & Colonnes** :
  - Recherche insensible aux accents via `removeAccents`. Filtres via `DataTableFilterConfig` + Ionic `action-sheet`.
  - Colonnes de filtre masquées à l'affichage : `:column-visibility="{ columnId: false }"`.
  - Tri typé via `CustomColumnDef<TData>` (`accessorFn` ou `sortingFn` explicites).
- **Export CSV** : Configuration `DataTableExportConfig` via `exportToCsv` (`src/utils/csvExport.ts`) avec encodage **UTF-8 BOM (`\uFEFF`)** obligatoire.

## 4. Design & Échiquier (`eg-chessboard` / `<Chessboard>`)
- **Wrapper Maître `<Chessboard>`** : Tout affichage d'échiquier doit impérativement utiliser le wrapper `src/components/shared/Chessboard/Chessboard.vue` plutôt que d'importer directement `TheChessboard` / `eg-chessboard`.
- **Échiquiers Standard** : Visuel plat et net (`border-radius: 0;`, `box-shadow: none;`) sur tous les viewers (`PuzzleViewer`, `QcmViewer`, `PgnViewer`, `AnalysisPage`, etc.). Utiliser systématiquement la classe canonique `.chessboard-container` (`src/theme/shared-components.scss`).
- **Styles Partagés & Nomenclature Canonique** (`src/theme/shared-components.scss`) : Interdiction de recréer des styles locaux pour les éléments standard. Utiliser les classes canoniques par famille :
  - **Layouts** : `.exercise-viewer-layout`, `.exercise-stage`.
  - **Échiquiers** : `.chessboard-container`, `.chessboard-container--mini`, `.chessboard-container--small`.
  - **Cartes** : `.exercise-card`, `.exercise-card-header`.
  - **Choix & QCM** : `.qcm-choices`, `.choice-btn`, `.choice-btn--centered`.
  - **Palettes** : `.piece-palette`, `.piece-btn`, `.piece-icon-box`.
  - **Actions & Feedback** : `.feedback-banner`, `.feedback-text`, `.exercise-action-btn`.
- **Exception Cartes Manipulables** (`OrderViewer`, `MatchingViewer`, etc.) : L'échiquier intérieur conserve `border-radius: 0;`, seul le conteneur externe (`.board-wrapper-card`) garde l'aspect carte (bords arrondis, ombres).
- **Responsive & Ratio** :
  - Interdiction de tronquer/rogner un échiquier. Conserver `aspect-ratio: 1 / 1`.
  - **Portrait** : `max-width: min(100%, 38dvh, 440px)`.
  - **Paysage** : `width: min(65vh, 48vw); aspect-ratio: 1 / 1;`.
- **Architecture d'Affichage des Exercices (Scaffold Mobile)** :
  - **Header Fixe** : `<ion-header>` maintient la navigation au sommet de la page.
  - **Corps Scrollable (`ion-content`)** : Accueille l'en-tête `<ExerciseHeader>`, l'échiquier et les interactions (coups, boutons QCM, commentaires). En cas de dépassement, l'ascenseur s'active automatiquement uniquement dans cette zone centrale.
  - **Footer Fixe Ancré au Bas d'Écran (`SeriesCardFooter`)** : `<ion-footer>` persistant (`v-show`) dans `ContenuPage.vue` avec gestion stricte des safe areas mobiles. `<SeriesCardFooter>` s'y téléporte via `<Teleport defer>` ciblant un `Ref<HTMLElement | null>` scopé fourni par `provide('exerciseFooterPortal', footerPortalRef)` (et non un sélecteur `#id` global sujet aux collisions de cache de routes Ionic), avec fallback inline (`:disabled="!isTeleportEnabled"`) pour les tests/vues isolées. Garantit un footer 100% stable sous le pouce dès la première carte sans condition de course initiale, et respectueux des safe areas mobiles (surélevé au-dessus du Home Indicator iOS/Android), présent immédiatement y compris sur les exercices à carte unique (`totalCards: 1`).
  - **Scroll automatique au changement d'exercice** : Réinitialisation immédiate du scroll au sommet (`scrollToTop(0)`) lors de chaque transition de contenu.
- **Stabilité PGN & Confort de Lecture des Commentaires** :
  - Interdiction d'utiliser un `v-if` conditionnel détruisant le conteneur de commentaire entre deux coups. Utiliser une boîte avec hauteur minimale réservée (`min-height: 42px; max-height: 120px; box-sizing: border-box; overflow-y: auto; align-items: flex-start;`) et la classe `.comment-empty` (`visibility: hidden; height: 42px;`) en l'absence de commentaire. Toujours utiliser `align-items: flex-start` (et non `center` qui pousse le haut du texte dans des coordonnées de scroll négatives inaccessibles) et `white-space: pre-line` sur `.comment-text` pour préserver les listes et sauts de ligne pédagogiques. Réinitialiser systématiquement `scrollTop = 0` à chaque changement de coup.
- **Compacité & Look & Feel QCM** :
  - Respecter la compacité canonique de `shared-components.scss` : `.exercise-card` (padding contenu réduit 8px 10px), `.qcm-choices` (`gap: 6px`), `.choice-btn` (`min-height: 38px`, texte centré).

## 5. Composants & Composables Partagés (`src/components/shared/` & `src/composables/`)
- **Composants Partagés** : `Chessboard/`, `DataTable/`, `DiagramViewer.vue`, `PuzzleViewer.vue`, `QcmViewer.vue`, `InteractiveQcmViewer.vue`, `PgnViewer.vue`, `PlacementViewer.vue`, `MatchingViewer.vue`, `OrderViewer.vue`, `ParcoursViewer.vue`, `VisionViewer.vue`.
- **Feedback & Toasts** : Utiliser systématiquement le composable `useFeedback()` (`src/composables/useFeedback.ts`) pour les notifications utilisateur au lieu d'appeler manuellement `toastController.create()`.
- **Progression Exercices & Séries** : Utiliser systématiquement le composable `useCardNavigation()` (`src/composables/useCardNavigation.ts`) pour la navigation par carte/étape.
- **Pied de Série Unifié** : Utiliser `<SeriesCardFooter>` qui se téléporte automatiquement dans le footer fixe de page.

## 6. État, API & Caching (TanStack Query & Pinia)
- **Appels HTTP** : Interdiction du `fetch` natif. Utiliser `safeFetch` (`src/utils/safeFetch.ts`) ou `fetchWpCollection` (`src/utils/wpApi.ts`).
- **Collections Paginées (`fetchWpCollection`)** : Gère l'en-tête JWT (`Authorization: Bearer`), le parcours des pages (`X-WP-TotalPages`) et la fusion des données.
- **Gestion JWT & Erreurs HTTP 400/401** : `safeFetch` intercepte les 401 et les 400 portant un en-tête `Authorization` pour tenter un `authStore.tryRefreshToken()`. En cas d'échec de renouvellement, déconnexion propre systématique (`logout()`).
- **Cache (`queryClient` dans `src/queryClient.ts`)** :
  - Mutation : Synchroniser via `queryClient.invalidateQueries()` ou `setQueryData()`.
  - Logout : Purge complète via `queryClient.clear()`.

## 7. QA & Conventions Code
- Props/Emits typés sous TypeScript. Événements réactifs d'échiquier (`@board-created`, `@move`, `@check`).
- **Validation** : Exécution obligatoire sans erreurs de `npm run lint`, `vue-tsc` et `npm run build` avant livraison.
- **Interdiction** : Interdit de masquer les erreurs/warnings avec `// @ts-ignore`, `// eslint-disable` ou `@ts-nocheck`.