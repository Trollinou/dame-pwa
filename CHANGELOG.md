# Changelog
Tous les changements notables apportés à ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
