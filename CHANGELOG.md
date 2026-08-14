# Changelog
Tous les changements notables apportés à ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-14

### Ajouté
- **Représentation alternative de l'Agenda (Vue Calendrier style iOS)** (`pwa/src/components/agenda/AgendaCalendarView.vue`, `pwa/src/components/agenda/AgendaSegmentView.vue`) :
  - Ajout du composant `AgendaCalendarView` proposant une grille mensuelle 7 colonnes avec navigation de mois et bouton "Aujourd'hui".
  - Affichage sous les numéros de jours de puces colorées indiquant les catégories des événements du jour.
  - Sélection d'un jour pour afficher immédiatement la liste des événements associés en dessous de la grille avec bande de couleur de catégorie, plage horaire, titre et lieu.
  - Sélecteur de mode de vue (Liste ☰ / Calendrier 📅) dans l'Agenda avec sauvegarde de la préférence dans `localStorage` (`dame_agenda_view_mode`).

### Modifié
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
