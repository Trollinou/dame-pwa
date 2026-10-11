# Directives Agent & Règles projet — DAME-PWA

## 1. Outillage & MCP
- Interdiction d'utiliser `get_repository_content` sur la racine. Utiliser uniquement `search_code` ou `get_file_content` ciblés.
- Ne JAMAIS réécrire un fichier complet pour une modification. Fournir des diffs ou des fonctions isolées. Pas de disclaimers ni commentaires verbeux.
- **RESTRICTION MODULE `eg-chessboard`** : Interdiction STRICTE de modifier le code du dépôt `eg-chessboard`. En cas de bug, produire exclusivement un rapport de bug détaillé.
- **Consolidation des scripts** : Tous les scripts d'outillage Node.js / packaging / synchronisation résident obligatoirement dans `scripts/`.
- **Contrôle Qualité Pré-Packaging** : Le script de release (`scripts/package.cjs`) doit obligatoirement valider l'intégrité de la suite QA complète (`npm run type-check`, `npm run lint`, `npm run test:unit`, `phpstan`) avant de générer l'archive de production.

## 2. Stack Technique
- **Plugin WordPress** : `DAME-PWA` | Slug: `dame-pwa` | Prefix: `dame_pwa_` | Namespace: `DAME_PWA\` | Table: `{$wpdb->prefix}dame_pwa_`
- **WordPress** : 7.1 (Interactivity API, Transients, Options API).
- **Options API & Autoload (WP 7.1)** : Spécifier impérativement le paramètre `'autoload' => false` lors de l'enregistrement (`add_option()`, `register_setting()`) de toute option volumineuse (manifestes, caches, tokens).
- **PHP** : 8.4 avec `declare(strict_types=1);`. Composer AUTORISÉ en prod (`composer install --no-dev --optimize-autoloader`). Inclure `vendor/autoload.php` + Autoloader SPL natif fallback dans `dame-pwa.php`.
- **PWA Core** : Vue 3 (`<script setup lang="ts">`), TypeScript strict, Ionic Vue (`@ionic/vue` v9), Vite 8.
- **State & Caching PWA** : Pinia (`src/stores/`), TanStack Query (`@tanstack/vue-query` + `@tanstack/query-persist-client-core`), TanStack Table (`@tanstack/vue-table`).
- **Contrats Typés Partagés** : Consommation directe de `"dame-types": "file:../dame"` et `"roi-types": "file:../roi"`.

## 3. Architecture & Structure
- **Backend WP (PSR-4)** : Sous-dossiers dans `includes/` en PascalCase (`includes/Admin/`, `includes/Core/`, `includes/Assets/`). Fichiers/classes en PascalCase.
- **Cycle de Vie Événementiel WP** :
  - Encapsuler l'enregistrement REST dans `rest_api_init`.
  - Isoler les services d'administration sous `if ( is_admin() )`.
- **Frontend PWA (`pwa/src/`)** :
  - `views/` : Vues classées par domaines (`views/admin/`, `views/auth/`, `views/layout/`, `views/learning/`, `views/public/`).
  - `components/` : Composants organisés par piliers (`learning/viewers/`, `learning/`, `public/`, `auth/`, `shared/` pour `Chessboard/`, `DataTable/`, `SplitMasterDetail.vue`, `SignaturePad.vue`).
  - `composables/` : Logique réutilisable découplée par domaine (`composables/learning/`, `composables/public/`, `composables/core/`).
  - `utils/` : Utilitaires système (`safeFetch.ts`, `wpApi.ts`), parseurs (`parsers/`) et moteurs d'échecs (`chess/`).
  - `stores/` : État global Pinia persisté.
  - `theme/` : SCSS centralisé (`shared-components.scss`) avec classes canoniques obligatoires.

## 4. Règles Frontend PWA, Échiquier, Styling & UX Mobile
- **RÈGLE D'OR CSS / STYLING PWA (Architecture KISS en 3 groupes)** :
  - **Interdiction formelle et absolue de balises `<style>` ou `<style scoped>`** dans tous les composants Vue (`.vue`) du projet (vues, viewers et composants).
  - **Zéro style inline** (sauf valeurs dynamiques calculées par JS comme `--progress-width` ou ratios d'aspect).
  - **Centralisation exclusive dans `pwa/src/theme/`** organisée en 3 piliers métier simples + fondations communes :
    1. `theme/public/` (`_public-layout.scss`, `_public-components.scss`) : Vitrine, accueil, club, tournois, actualités, agenda, profil joueur.
    2. `theme/learning/` (`_learning-layout.scss`, `_learning-components.scss`) : Hub d'apprentissage, cours, leçons, vidéos, viewers et exercices interactifs.
    3. `theme/admin/` (`_admin-layout.scss`, `_admin-components.scss`) : Shell d'administration, gestion des membres, bénévolat, contacts, messages, pré-inscriptions.
    4. `theme/core/` (`_base.scss`, `_club-badges.scss`, etc.) : Variables, normalisations globales, badges et composants transverses.
  - Tous les modules SCSS sont importés dans `pwa/src/theme/shared-components.scss`.
- **Wrapper Maître `<Chessboard>`** : Tout affichage d'échiquier doit impérativement utiliser le wrapper `src/components/shared/Chessboard/Chessboard.vue` plutôt que d'importer directement `TheChessboard` / `eg-chessboard`.
- **Grilles de Données (`DataTable.vue`)** :
  - Rendu responsive dual-mode : Desktop (`>768px`) en tableau sticky triable, Mobile (`<=768px`) via le slot `#mobile-item`.
  - Export CSV avec encodage UTF-8 BOM (`\uFEFF`) obligatoire.
- **Scaffold Mobile & Safe Areas** :
  - Structure : `<ion-header>` fixe au sommet, corps scrollable `<ion-content>`, `<SeriesCardFooter>` téléporté dans un footer persistant au-dessus du Home Indicator iOS/Android.
  - Scroll automatique : Réinitialisation immédiate au sommet (`scrollToTop(0)`) lors de chaque transition d'exercice.
- **Stabilité PGN & Commentaires** : Boîte de commentaire avec hauteur minimale réservée (`min-height: 42px;`), `white-space: pre-line` et `align-items: flex-start`.
- **Performances Web Vitals & Safari/iOS** :
  - `content-visibility: auto` sur les listes d'items répétées.
  - Interdiction formelle de `backdrop-filter: blur(...)` sur les calques d'interaction.
  - Formulaires : `autocorrect="off"` et `autocomplete="off"` sur les champs d'identification pour éviter les blocages XPC macOS/iOS.

## 5. API, Réseau & Caching Offline
- **Appels HTTP** : Interdiction du `fetch` natif. Utiliser `safeFetch` (`src/utils/safeFetch.ts`) ou `fetchWpCollection` (`src/utils/wpApi.ts`).
- **Gestion JWT & Intercepteurs** : `safeFetch` intercepte les retours 401/400 avec `Authorization` pour déclencher `authStore.tryRefreshToken()` ou une déconnexion propre (`logout()`).
- **Persistance TanStack Query** : Mutations synchronisées via `queryClient.invalidateQueries()`, purge complète au logout via `queryClient.clear()`.
- **Validation Déclarative REST (WP 7.1)** : Typage et callbacks de validation/sanitisation déclarés dans `args` de `register_rest_route()`.

## 6. QA, Tests & Conformité
- **Analyse Statique & Build** :
  - PWA : `npm run type-check` (`vue-tsc`), `npm run lint` (`eslint`), `npm run test:unit` (`vitest`), `npm run build` (`vite build`).
  - WP : `vendor/bin/phpstan analyze --debug --memory-limit=2G`, `phpcbf` et `phpcs`.
- **Interdiction** : Interdiction de masquer des erreurs TypeScript/ESLint avec `// @ts-ignore`, `// eslint-disable` ou `@ts-nocheck`.
- **Versionning Sémantique Synchronisé** : `dame-pwa.php`, constante `DAME_PWA_VERSION`, `package.json`, `CHANGELOG.md`, `RELEASE.md` (synchronisés via `scripts/version-sync.cjs`).
- **Documentation Vivante (Définition de "Fini")** :
  - Toute modification de fonctionnalité ou configuration impose la mise à jour synchrone de `README.md` et `USING.md`.