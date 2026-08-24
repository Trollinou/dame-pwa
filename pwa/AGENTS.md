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
- **Échiquiers Standard** : Visuel plat et net (`border-radius: 0;`, `box-shadow: none;`) sur tous les viewers (`PuzzleViewer`, `QcmViewer`, `PgnViewer`, `AnalysisPage`, etc.). Utiliser les classes `.chessboard-container` ou `.board-container` (`src/theme/shared-components.scss`).
- **Exception Cartes Manipulables** (`OrderViewer`, `MatchingViewer`, etc.) : L'échiquier intérieur conserve `border-radius: 0;`, seul le conteneur externe (`.board-wrapper-card`) garde l'aspect carte (bords arrondis, ombres).
- **Responsive & Ratio** :
  - Interdiction de tronquer/rogner un échiquier. Conserver `aspect-ratio: 1 / 1`.
  - **Portrait** : `max-width: min(720px, 60vh)`.
  - **Paysage** : `width: min(65vh, 48vw); aspect-ratio: 1 / 1;`.

## 5. Composants & Composables Partagés (`src/components/shared/` & `src/composables/`)
- **Composants Partagés** : `Chessboard/`, `DataTable/`, `DiagramViewer.vue`, `PuzzleViewer.vue`, `QcmViewer.vue`, `InteractiveQcmViewer.vue`, `PgnViewer.vue`, `PlacementViewer.vue`, `MatchingViewer.vue`, `OrderViewer.vue`, `ParcoursViewer.vue`, `VisionViewer.vue`.
- **Feedback & Toasts** : Utiliser systématiquement le composable `useFeedback()` (`src/composables/useFeedback.ts`) pour les notifications utilisateur au lieu d'appeler manuellement `toastController.create()`.
- **Progression Exercices & Séries** : Utiliser systématiquement le composable `useCardNavigation()` (`src/composables/useCardNavigation.ts`) pour la navigation par carte/étape.

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