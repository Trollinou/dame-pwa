# DAME PWA

Extension WordPress et Application Web Progressive (PWA) Ionic/Vue pour l'association DAME.

## Prérequis & Qualité

- **WordPress :** 7.1 ou supérieur
- **PHP :** 8.4 avec typage strict (`declare(strict_types=1);` sur 100% des fichiers)
- **Analyse Statique :** PHPStan Niveau 7 (0 erreur) et WPCS/PHPCS conforme (0 erreur)
- **Frontend :** Node.js 20+, TypeScript strict, Vitest (tests unitaires 100% passants)

## Architecture

- `includes/` : Classes PHP du plugin WordPress (`DAME_PWA`).
- `pwa/` : Application Ionic 9 + Vue 3 + Pinia + TanStack Query.
  - `src/views/ApprentissageHubPage.vue` : Hub d'accueil à 2 panneaux (Cours théoriques / Espace de Jeu).
  - `src/views/ApprentissageCoursListPage.vue` : Liste des parcours et chapitres réservés aux adhérents.
  - `src/views/PlayPage.vue` : Échiquier interactif 1J (vs Stockfish 18) et 2J (Pass & Play) basé sur `eg-chessboard`.
  - `src/views/AnalysisPage.vue` : Revue et analyse coup par coup de la dernière partie jouée.
  - `src/components/agenda/` : Composants de la vue Le Club / Agenda (`ActualitesSegmentView.vue`, `AgendaSegmentView.vue`, `TournoisSegmentView.vue`, `BenevolatSegmentView.vue`, `AgendaCalendarView.vue`).
  - `src/components/agenda/detail/` : Composants purs de détail (`NewsDetailContent.vue`, `AgendaDetailContent.vue`, `TournamentDetailContent.vue`, `BenevolatDetailContent.vue`).
  - `src/components/common/SignaturePad.vue` : Composant réactif de signature tactile/manuscrite sur Canvas HTML5 (export PNG transparent).
  - `src/views/PreInscriptionPage.vue` : Formulaire de préinscription / réinscription en ligne pour la nouvelle saison avec signature électronique dématérialisée.
  - `src/components/preinscription/` : Composants modulaires du formulaire (`PreInscriptionIdentitySelector.vue`, `PreInscriptionMemberSection.vue`, `PreInscriptionLegalRepSection.vue`, `PreInscriptionHealthSection.vue`, `PreInscriptionSuccessCard.vue`).
  - `src/composables/preinscription/` : Logique métier découplée (`usePreInscriptionApi.ts`, `usePreInscriptionForm.ts`, `useAddressAutocomplete.ts`) avec détection et mise à jour transparente des préinscriptions existantes et transmission de la signature.
  - `src/stores/auth/` : Sous-modules spécialisés pour l'authentification (`types.ts`, `jwtService.ts`, `appConfig.ts`, `identitiesService.ts`) pilotés par la façade `useAuthStore` (`auth.ts`).
  - `src/stores/` : Stores Pinia harmonisés avec TanStack Query (`news.ts`, `tournament.ts`, `members.ts`, `contacts.ts`, `dashboard.ts`, `benevolat.ts`, `apprentissage.ts`) pour la gestion unifiée du cache serveur et de l'état client.
  - `src/utils/safeFetch.ts` & `src/utils/wpApi.ts` : Couche réseau unifiée avec timeouts de protection, rafraîchissement transparent des jetons JWT en cas de session expirée (retry automatique) et pagination multi-pages WP REST automatique (`fetchWpCollection`).
  - `src/queryClient.ts` : Configuration de TanStack Query avec persistance et invalidation automatique des caches de requêtes lors des montées de version PWA.
- **Rendu Visuel Unifié (`mode: 'ios'`) & Adaptation Dynamique en Hauteur (`vh` / `clamp`)** : Initialisation d'Ionic configurée en mode `ios` global associée à une échelle typographique et des variables de mise en page réactives en hauteur (`--app-section-gap`, `--app-item-min-height`, `--app-card-padding`), assurant une occupation à 100 % de l'écran et une lisibilité immédiate sans zoom sur tous les smartphones (iPhone, Samsung One UI, Xiaomi et Pixel 9 sous Android 14/15).
- **Stratégie de Performance & Découpage de Bundle (`pwa/vite.config.ts`)** :
  - **Manual Chunks** : Découpage ciblé des dépendances lourdes (`chess-vendor` pour `eg-chessboard` et `chessops`, `confetti-vendor` pour `canvas-confetti`, `ionic-vendor`, `tanstack-vendor`, `vue-vendor`) afin de différer le chargement du moteur d'échecs aux seules pages de jeu et d'analyse.
  - **Service Worker Allégé & Cache Stockfish à la Demande** : Retrait du binaire Stockfish WASM (7.3 Mo) du pré-cache initial (`globPatterns`) au profit d'une mise en cache dynamique (`runtimeCaching` en `CacheFirst` pendant 30 jours), réduisant l'empreinte d'installation initiale de la PWA à ~3.2 Mo.
  - **Nettoyage Automatique de Production** : Purge systématique des `console.log` et `debugger` en build de production via `esbuild.drop`.
- **Automatisation Intégrale des Mises à Jour & Anti-Cache PWA** :
  - **Génération dynamique de `version.json`** : Plugin Vite personnalisé émettant automatiquement `version.json` dans `dist/` avec le numéro de version de `package.json` et un horodatage de build `buildTime` (exclu du pré-cache Service Worker via `globIgnores`).
  - **Enregistrement Service Worker avec `updateViaCache: 'none'`** : Contournement strict du cache HTTP lors de la vérification de `sw.js` dans le navigateur.
  - **Contrôle Actif avec Cache-Buster** : Requêtes en direct `fetch('./version.json?_t=' + Date.now(), { cache: 'no-store' })` déclenchées au démarrage, au réveil de l'écran (`visibilitychange`, `pageshow`, Capacitor `appStateChange`) et lors du clic sur le profil.
  - **Auto-Purge & Actualisation Transparente** : Dès qu'une nouvelle version serveur est détectée, l'application purge automatiquement le `CacheStorage` et le cache persistant TanStack (`DAME_QUERY_CACHE`) puis recharge immédiatement la page tout en préservant la session utilisateur.
  - **En-têtes HTTP Anti-Cache (`pwa/public/.htaccess`)** : Directives ciblées `mod_headers` (`no-cache, no-store, must-revalidate`) sur `sw.js`, `index.html`, `version.json` et manifestes, sans aucune règle de réécriture (`RewriteRule`).

## Espace de Jeu & Apprentissage

- **Hub Apprentissage** : Accessible à tous depuis la barre d'onglets, il offre un point d'entrée vers les cours théoriques (protégés par adhésion) et vers l'échiquier de jeu (libre d'accès). Badge contextuel « 📌 X assigné(s) » signalant les cours prescrits par les entraîneurs.
- **Parcours Pédagogique & Cours Assignés** : Distinction claire entre la section « 📌 Cours assignés » (*« Prescrits par vos entraîneurs »*, immédiatement déverrouillés sans prérequis séquentiel) et les cours généraux de la « 📚 Méthode EEF » (*École d'Échecs à la Française*, progression linéaire).
- **Navigation & Synchronisation de Progression** : Mise à jour optimiste instantanée du cache TanStack Query (`queryProgression`) dès la validation d'un exercice/leçon, sécurisation de la navigation sortante (`onBeforeRouteLeave` dans `ContenuPage.vue` pour attendre l'enregistrement serveur) et redirection naturelle vers la liste des cours (`/apprentissage/cours`) en fin de cours.
- **Moteur Stockfish** : Embarqué via `eg-chessboard` avec calcul dynamique du temps de réflexion (`Elo * 1.4 ms`) et mémorisation du niveau choisi.
- **Envoi PGN** : En mode 1 joueur, les parties des adhérents connectés sont enregistrées et synchronisées avec le plugin `roi` (`POST /roi/v1/games`).
- **Ergonomie iPad & Tablettes (Paysage)** : Adaptation plein écran avec disposition côte-à-côte centrée pour l'échiquier de jeu et la revue d'analyse.
- **Personnalisation Globale de l'Échiquier** : Store Pinia persistant `useChessPreferencesStore` gérant le jeu de pièces vectoriel (`pieceSet` parmi 10 styles, défaut: `cburnett`) et le thème d'arrière-plan (`boardTheme` parmi 9 palettes, défaut: `brown`) injectés réactivement sur tous les échiquiers de l'application.

## Profil & Personnalisation

- Composant `ChessThemeCustomizer.vue` avec double rouleau rotatif (`wheel-picker`) pour manipuler et choisir les styles de pièces et fonds d'échiquier.
- Échiquier de prévisualisation réactif en position initiale.
- Sauvegarde locale persistante des préférences utilisateur répercutée sur tous les viewers d'exercices, cours, analyse et jeu.

## Modèle d'Architecture Découplé (CMS ROI / Moteur Runtime PWA)

L'application suit un principe de découplage strict :
- **ROI (WordPress)** : Rôle de CMS auteur stockant les standards d'échecs (FEN + Shapes, PGN avec annotations `%csl`/`%cal`/variantes, vidéos pédagogiques `roi_video` avec URLs YouTube) et les consignes rédigées par l'auteur.
- **DAME-PWA (Client-Side)** : Moteur d'interprétation interactive via `fenUtils.ts`, `partieHerosParser.ts`, `eg-chessboard`, `chessops` et `VideoReader.vue` :
  - Détection automatique de la pièce cible à partir du cercle bleu (`brush: 'blue'`).
  - Dérivation de la `fen_depart` sans la pièce cible.
  - Calcul dynamique de l'orientation de l'échiquier selon le trait de la position (`getActiveColorFromFen(fen)` : Blancs en bas si trait aux Blancs, Noirs en bas si trait aux Noirs).
  - Découpage automatique des études PGN complètes (Type 4 — La Partie dont tu es le Héros) en séquences PGN et embranchements QCM via l'analyse des variantes et des flèches `[%cal ...]`.
  - Découpage itératif par série pour La Marche du Héros (Type 7) : tri en grille 2 colonnes, ordonnancement chronologique sans scroll par *Tap & Swap* tactile en grille 2 colonnes et coup final avec `ContentHeader` et `SeriesCardFooter`.
  - Déroulement en série de 3 parcours tactiques pour les Parcours (Type 9) : moteur modulaire extensible de variantes (`parcoursVariants.ts` pour `standard`, `pacman`, `stealth`), validation des obstacles rouges, vérification d'infiltrations furtives et gestion unifiée avec `ContentHeader` et `SeriesCardFooter`.
  - Déroulement en série de 6 situations pour Ouvre'boîte (Type 13) : parsing automatique de 6 Mini-PGN avec flèches indicatrices `[%cal]`, déduction de la bonne réponse (branche principale) et des variantes d'erreur, traduction en libellés français clairs (*Pion e2 en e4*, *Fou f1 en b5*...), mélange aléatoire des choix, panneau d'explications détaillées et navigation unifiée avec `ContentHeader` et `SeriesCardFooter`.
  - Déroulement en série de 5 mini-situations pour Cap ou pas Cap ? (Type 14) : support des variantes `qcm_multiple`, `qcm_oui_non` (avec options de réponses dynamiques configurables, ex: OUI/NON, BLANC/NOIR/ÉGALE, 0/1/2/3 et rétrocompatibilité totale), `move` (support des coups simples et multi-solutions avec variantes PGN et récapitulatif des coups trouvés en notation française), `notation` (apprentissage du repérage et notation française des pièces), `clic` (sélection/cerclage des pièces cibles ou différentiel de matériel avec bouton d'égalité) et `setup` (reconstitution sur échiquier vierge d'après texte descriptif ou de mémoire avec bouton pour revoir la position et conseil de l'entraîneur), sélecteurs neutres tactiles, masquage initial puis révélation complète des shapes et navigation `SeriesCardFooter`.
  - Déroulement en série de 6 devinettes pour Qui-suis-je ? (Type 12) : support des variantes `pieces` (indices textuels multilignes + palette des 6 pièces blanches en notation française) et `cases` (indices textuels multilignes + échiquier interactif avec révélation par cercle vert), enchaînement fluide avec `ContentHeader` et `SeriesCardFooter`.
  - Déroulement par cartes pour 100 Commandements (Type 1), Pop'Echecs (Type 2) et ABCDaire Tactique (Type 3) : prise en charge des consignes globales et surcharges par diagramme/Mini-PGN, indicateur visuel de la pièce à placer (`ion-chip` avec `ion-avatar` SVG et concordance grammaticale de genre en français pour Pop'Echecs).
  - Masquage initial des `shapes` de solution pendant la recherche, avec **maintien visible du cercle jaune (`brush: 'yellow'`)** pour mettre en évidence la pièce d'étude (Types 2 Pop'Echecs, 3 ABCDaire Tactique et 14 Cap ou pas Cap ? dans toutes les variantes), puis révélation complète des annotations dès la réussite.
  - Gestion des séries multi-diagrammes et étapes avec `ExerciseHeader` et `SeriesCardFooter`.
  - Intégration de vidéos pédagogiques (`VideoReader.vue`) avec mode plein écran universel (hybride Fullscreen natif Android/Desktop + Pseudo-Fullscreen CSS iOS sans blocage), bascule automatique en immersion lors de la rotation paysage sur mobile et validation de progression au seuil de 95%.

## Composants & Composables Partagés (PWA Frontend)

Pour garantir la cohérence technique, l'application s'appuie sur un socle de composants et composables partagés situés dans `pwa/src/components/shared/` et `pwa/src/composables/` :

### 1. Composant Wrapper `<Chessboard>` (`src/components/shared/Chessboard/`)
Encapsule la bibliothèque `eg-chessboard` et centralise la configuration globale de l'échiquier :
- **Injection automatique des préférences** : Applique de manière réactive le style de pièces (`pieceSet`) et le thème du plateau (`boardTheme`) issus de `useChessPreferencesStore`.
- **Nettoyage automatique du cycle de vie** : Détruit proprement l'instance principale (`boardApi.destroy()`) et l'instance de zoom modal (`zoomBoardApi.destroy()`) à la destruction du composant (`onUnmounted`) pour prévenir toute fuite de mémoire ou persistance des Web Workers Stockfish.
- **Props principales** : `fen`, `shapes`, `viewOnly` (défaut: `true`), `orientation`, `playerColor`, `coordinates`, `autoCastling`, `highlightLastMove`, `lastMove`, `stockfishEnabled`, `stockfishConfig`, `zoomable` (défaut: `false` sur `Chessboard`, `true` sur `DiagramViewer`), `fitContainer` (défaut: `false`).
- **Zoom plein écran universel intégré** : Lorsqu'activé (`zoomable="true"`), l'échiquier prend en charge l'appui prolongé (touch 500ms) et le clic droit pour ouvrir une modale plein écran haute résolution téléportée (`<Teleport to="body">`) avec neutralisation des clics parasites au relâchement.
- **Événements supportés** : `@board-created`, `@move`, `@turn-change`, `@check`, `@checkmate`, `@stalemate`, `@draw`, `@stockfish-hint`, `@square-click`, `@shapes-change`, `@promotion`.
- **Adoption unifiée** : Utilisé de façon homogène et exclusive par l'intégralité de l'application (pages `PlayPage.vue`, `AnalysisPage.vue`, `ChessThemeCustomizer.vue`, `TypePartieHeros.vue` et tous les viewers d'apprentissage : `ABCDaireTactiqueViewer`, `PuzzleViewer`, `QcmViewer`, `ParcoursViewer`, `VisionViewer`, `CapOuPasCapViewer`, `InteractiveQcmViewer`, `MatchingViewer`, `EvalViewer`, `JugementFinalViewer`, `DiagramViewer`, `PgnViewer`, `PlacementViewer`, `QuiSuisJeViewer`, `OuvreBoiteViewer`, `TextOrderViewer`, `OrderViewer`).

```vue
<template>
  <div class="chessboard-container">
    <Chessboard
      :fen="currentFen"
      :shapes="currentShapes"
      :view-only="true"
      @board-created="onBoardCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore } from 'eg-chessboard';

const onBoardCreated = (api: BoardCore) => {
  // Accès direct à l'API du plateau si nécessaire
};
</script>
```

### 2. Composable `useFeedback` (`src/composables/useFeedback.ts`)
Standardise l'affichage des notifications Toasts Ionic (couleur, durée, position) :
- `showSuccess(message, duration?)` : Toast vert de validation / réussite.
- `showError(message, duration?)` : Toast rouge d'erreur / coup invalide.
- `showWarning(message, duration?)` : Toast d'avertissement.
- `showInfo(message, duration?)` : Toast d'information générale.
- `showToast(message, type, options)` : Toast entièrement personnalisable.

```ts
import { useFeedback } from '@/composables/useFeedback';

const { showSuccess, showError } = useFeedback();

if (isCorrect) {
  showSuccess('Bravo, coup gagnant !');
} else {
  showError('Ce n\'est pas le bon coup, réessaie.');
}
```

### 3. Composable `useCardNavigation` (`src/composables/useCardNavigation.ts`)
Gère l'état et l'avancement dans les exercices séquentiels ou séries multi-cartes :
- `currentCard` : Numéro de la carte active (1-indexé).
- `isSolved` : Booléen indiquant si la carte active a été validée.
- `isLastCard` : Indicateur calculé de la dernière étape.
- `next()` : Passe à l'étape suivante ou déclenche le callback `onCompleted()`.
- `markSolved({ autoAdvanceDelay })` : Marque l'étape comme résolue avec possibilité d'avancement automatique différé.
- `reset(targetCard?)` : Réinitialise la progression.

```ts
import { useCardNavigation } from '@/composables/useCardNavigation';

const emit = defineEmits<{ (e: 'success'): void; (e: 'next'): void }>();

const { currentCard, isSolved, next, markSolved } = useCardNavigation(
  () => props.totalCards || 1,
  () => emit('success'),
  () => emit('next')
);
```

### 4. Composant En-tête de Contenu `<ContentHeader>` (`src/components/shared/ContentHeader.vue`)
Composant d'en-tête standardisé et générique pour l'ensemble des contenus pédagogiques (Exercices, Vidéos, Leçons) :
- **Panneau 1 (Métadonnées Compactes)** : Affiche le titre (`title`), son type adapté (`typeLabel`, ex: "Exercice", "Vidéo", "Leçon", "Vision'checs", etc.) et le chapitre/niveau associé (`chapitreNiveauLabel`).
- **Panneau 2 (Consigne & Badge d'étape - Optionnel / Masquable)** : Affiche optionnellement le texte de la consigne (`consigne`) et le badge d'étape interactive (`stepBadgeText`, supportant les retours à la ligne `\n` pour découper série et sous-étape sur deux lignes compactes et préserver la largeur de la consigne). Grâce à la prop `hideSubPanel: true` (ou en l'absence de consigne/badge), ce deuxième panneau est totalement masqué pour les Vidéos et les Leçons, allégeant la vue.
- **Rétrocompatibilité** : `<ExerciseHeader>` est conservé comme wrapper typé vers `<ContentHeader>`.

```vue
<template>
  <!-- Pour un exercice standard -->
  <ContentHeader
    :title="exercice.titre"
    type-label="Pop'Échecs"
    :chapitre-niveau-label="exercice.chapitre"
    :consigne="exercice.consigne"
    :step-badge-text="`Étape ${currentCard}/${totalCards}`"
  />

  <!-- Pour une vidéo ou une leçon (Panel 2 masqué) -->
  <ContentHeader
    :title="lecon.titre"
    type-label="Leçon"
    :chapitre-niveau-label="lecon.chapitre"
    :hide-sub-panel="true"
  />
</template>

<script setup lang="ts">
import ContentHeader from '@/components/shared/ContentHeader.vue';
</script>
```

### 5. Composant Pied de Série `<SeriesCardFooter>` (`src/components/shared/SeriesCardFooter.vue`)
Barre de navigation et zone d'action fixe pour les exercices, vidéos et leçons :
- **Zone de feedback masquable (`hideFeedback`)** : Affiche les messages dynamiques d'encouragement ou d'erreur (`feedback: { message, type }`) lors des exercices interactifs. Pour les Vidéos et les Leçons où il n'y a pas d'évaluation de choix bon/mauvais, la prop `:hide-feedback="true"` masque intégralement cette zone sans réserver d'espace vide.
### 6. Architecture CSS & Charte de Styles Unifiée de l'Apprentissage (Principe KISS)

Pour garantir une expérience graphique et tactile fluide sans dispersion de code, toute la section Apprentissage est régie par une architecture SCSS centralisée dans `pwa/src/theme/learning/` :
- **`_learning-layout.scss`** : Gestion des conteneurs (Mobile portrait centré sans scroll avec budget `38dvh`, Grille multi-échiquiers 2 par ligne `.learning-board-grid-2col`, et bascule automatique en 2 colonnes côte-à-côte pour Tablette Paysage et Ordinateur `@media (orientation: landscape) and (min-width: 768px)`).
- **`_learning-components.scss`** : Composants maîtres réutilisables basés sur les variables natives Ionic.

#### ⚠️ Règle d'Or d'Architecture (KISS & Maintenance)
> **Il est strictement interdit d'ajouter des balises `<style>` ou règles CSS locales dans les vues et viewers d'apprentissage.**  
> Toute nouvelle vue s'assemble exclusivement à l'aide des **briques Lego communes** :
> 1. **Conteneur de stage** : `<div class="exercise-stage">` ou `<div class="exercise-viewer-layout">`.
> 2. **Échiquier** : `<div class="chessboard-container">` (solo 1:1 sans coins arrondis pour alignement parfait des pièces) ou `<div class="learning-board-grid-2col">` avec `<div class="learning-board-card">` (grille 2 par ligne).
> 3. **Encart pédagogique d'explication** : `<div class="learning-callout learning-callout--info|--tip|--quote|--success|--error">` (bordure latérale gauche colorée pour conseils/citations).
> 4. **Bandeau d'instruction / action sous échiquier** : `<div class="learning-instruction-bar">` (bandeau centré neutre avec bordure 1px subtile, sans barre latérale).
> 5. **Boutons de choix / QCM** : `<div class="qcm-choices">` avec `<ion-button class="choice-btn">` (hauteur compacte ergonomique **38px**, `--border-radius: 6px`).
> 6. **Boutons bascules OUI / NON** : `.neutral-toggle` / `.neutral-toggle--large` avec `.toggle-btn` (32px / 36px).
> 7. **Palettes tactiles & PGN** : `<div class="learning-piece-palette">` (6 colonnes), `<div class="setup-palette-grid">` (7 colonnes x 2 lignes pour 12 pièces + gomme), `.navigation-controls` / `.nav-btn` et `.comment-container` avec `.comment-empty`.

```vue
<template>
  <div class="exercise-stage">
    <ContentHeader title="Mon Exercice" consigne="Trouvez le bon coup" />

    <div class="chessboard-container">
      <Chessboard :fen="fen" :view-only="true" />
    </div>

    <!-- Bandeau d'action sous l'échiquier -->
    <div class="learning-instruction-bar">
      <span>Trouve le coup suivant</span>
    </div>

    <!-- Carte de choix QCM harmonisée avec ContentHeader (sans bordure, ombre douce) -->
    <ion-card class="exercise-card">
      <ion-card-content>
        <div class="qcm-choices">
          <ion-button v-for="c in choix" :key="c.id" class="choice-btn" @click="valider(c)">
            {{ c.texte }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  </div>
</template>
```
- **Validation au seuil de 95% (Vidéos & Leçons)** :
  - Sur les Vidéos : le bouton reste verrouillé jusqu'à ce que 95% de la vidéo soient visionnés (`useYouTubePlayer`).
  - Sur les Leçons : le bouton se débloque dès que 95% du document ont été défilés / lus (ou immédiatement si le contenu tient sans ascenseur).
- **Célébration visuelle & sensorielle (`useCelebration.ts`)** : Déclenchement automatique d'un feu d'artifice de confettis (`canvas-confetti`) et d'un retour haptique sur smartphone (`@capacitor/haptics`) lors de la validation.
- **Orchestration inter-contenus sans prop-drilling** : Consomme optionnellement `useExerciseNavigation()` (`EXERCISE_NAVIGATION_KEY` injecté par `ContenuPage`) pour déclencher la navigation vers le prochain contenu ou le cours parent.
- **Ancrage fixe en bas d'écran (Scaffold Mobile & Teleport)** : Téléporté automatiquement via Vue 3 `<Teleport defer>` ciblant la référence DOM scopée du `<ion-footer>` persistant de `ContenuPage.vue` (via `provide('exerciseFooterPortal', footerPortalRef)` avec affichage permanent `v-show`, intégrant les safe areas mobiles et fallback inline pour les tests/vues isolées). Le conteneur parent `.exercice-container` reçoit la classe `.has-series-footer` appliquant un dégagement inférieur automatique (`padding-bottom: calc(120px + safe-area)`), garantissant qu'aucun élément en fond de page ne soit masqué derrière le footer fixe lors du défilement.
- **Verrouillage pédagogique & Célébration (`disabled`, `disabledHint`)** : Permet de désactiver le bouton d'avancement tant qu'une action requise (ex: seuil de 95% ou relecture du PGN) n'est pas achevée. La célébration finale (`isFinalCompleted`) est strictement conditionnée à la levée de tout verrouillage (`!disabled`).
- **Indicateur d'attente** : Affiche un indice textuel (`pendingHint`) tant que le contenu n'a pas été résolu ou débloqué.

```vue
<template>
  <SeriesCardFooter
    :current-card="currentCard"
    :total-cards="totalCards"
    :is-solved="isSolved"
    :disabled="isPgnReviewPending"
    :feedback="currentFeedback"
    @next="next"
  />
</template>

<script setup lang="ts">
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { useCardNavigation } from '@/composables/useCardNavigation';

const { currentCard, isSolved, next } = useCardNavigation(() => 5);
const currentFeedback: CardFeedback = {
  message: 'Excellente réponse !',
  type: 'success'
};
</script>
```

### 6. Composant Visualiseur PGN `<PgnViewer>` (`src/components/shared/PgnViewer.vue`)
Composant de lecture et relecture pas-à-pas de séquences PGN commentées avec formes (shapes SVG) :
- **Contrôles de navigation contextuels** : Boutons Début (`viewStart`), Précédent (`viewPrevious`), Suivant (`viewNext`) et Fin (`viewEnd`).
- **Désactivation réactive aux bornes** :
  - Au début du PGN (`currentPly <= 0`) : les boutons Début et Précédent sont automatiquement désactivés (`disabled`).
  - Au dernier coup (`currentPly >= totalPly`) : les boutons Suivant et Fin sont automatiquement désactivés (`disabled`).
  - Sur un PGN sans coup (`totalPly === 0`) : l'ensemble des boutons de navigation est désactivé.
- **Support des formes et commentaires** : Restitution en temps réel des commentaires pédagogiques (`currentComment`) et des flèches/cases colorées (`setShapes`).
- **Événement `@finished`** : Émis dès que l'apprenant atteint le dernier coup de la séquence (ou immédiatement si 0 coup).

### 7. Styles & Classes Partagées (`src/theme/shared-components.scss`)
Nomenclature canonique standardisée à utiliser systématiquement par les développeurs selon les familles d'éléments :

| Famille | Classe Canonique | Usage & Description |
| :--- | :--- | :--- |
| **Layouts** | `.exercise-viewer-layout` | Conteneur principal flex centré (largeur 100%) pour les viewers d'exercice. |
| | `.exercise-stage` | Sous-conteneur de phase ou étape intermédiaire d'exercice (largeur max 600px). |
| **Échiquiers** | `.chessboard-container` | Conteneur standard responsive (ratio 1:1, portrait `max-width: min(100%, 38dvh, 440px)`, `margin: 0 auto 8px auto`, `flex-shrink: 0`, `border-radius: 0;`, `box-shadow: none;`, landscape tablette `min(65vh, 48vw)`). |
| | `.chessboard-container--mini` | Miniaturisation (300px, `flex-shrink: 0`) pour l'appariement (`MatchingViewer`) et les choix de plans (`JugementFinalViewer`). |
| | `.chessboard-container--small` | Variante compacte (360px, `flex-shrink: 0`) pour écrans à faible hauteur / portrait restreint. |
| **Cartes & En-têtes** | `.exercise-card` | Carte standard pour consignes, questions et contenus (bord arrondi 8px, padding interne `8px 10px`, ombre légère). |
| | `.exercise-card-header` | Titre centré de consigne ou de question (1.15rem, semi-bold). |
| **Choix & QCM** | `.qcm-choices` | Conteneur vertical de boutons de choix compact (gap 6px, max 500px). |
| | `.choice-btn` | Bouton de choix compact (`min-height: 38px`, padding `6px 12px`, texte centré, retour à la ligne natif Ionic). |
| | `.choice-btn--centered` | Variante du bouton de choix avec texte centré. |
| **Palettes & Pièces** | `.piece-palette` | Grille 2x6 ou 6x2 pour sélection interactive de pièces. |
| | `.piece-btn` | Bouton carré de pièce avec effet hover/scale. |
| | `.piece-icon-box` | Conteneur et affichage d'icônes vectorielles de pièces isolées (neutralisation du fond damier). |
| **Actions & Feedback**| `.feedback-banner`<br>`.feedback-text` | Bannières et textes de feedback dynamique. |
| | `.exercise-action-btn` | Bouton d'action ou de validation en bas d'étape (max 320px, centré). |

### 8. Utilitaire `LoopTracker` (`src/utils/LoopTracker.ts`)
Gère le calcul en temps réel de l'enroulement angulaire (*Winding Number*) et la validation du passage par les 4 quadrants pour les exercices de parcours en boucle fermée (Type 9) :
- `squareToCoords(sq)` : Convertit une case algébrique (ex: `'c3'`) en coordonnées cartésiennes $(\{x, y\} \in [1..8] \times [1..8])$.
- `extractOpponentPieceSquare(fen, playerColor)` : Localise la case de la pièce adverse cible à partir du FEN.
- `LoopTracker(targetSquare, startSquare)` : Instancie le tracker sur la pièce cible et la case de départ.
- `onMove(toSquare)` : Calcule le $\Delta \theta$ normalisé dans $[-\pi, \pi]$, accumule l'angle total et renvoie `{ isFinished, totalAngleDeg, rotations, progressPercent }`. La complétion requiert $|\theta_{\text{total}}| \ge 360^\circ$, la visite des 4 quadrants et le retour à la case de départ après au moins 4 coups.

### 9. Composable `usePwaUpdate` & Résilience iOS (`src/composables/usePwaUpdate.ts`)
Centralise la gestion du cycle de vie des mises à jour applicatives et la purge ciblée des caches :
- **Surveillance au réveil** : Déclenche systématiquement `registration.update()` à chaque retour au premier plan (`visibilitychange`, `pageshow`, reprise Capacitor).
- **Rechargement sur `controllerchange`** : Dès qu'un nouveau Service Worker s'active (`skipWaiting`), l'application est rechargée instantanément.
- **Cache-Busting d'URL Dynamique** : Paramètre de version `?v=` injecté lors de la redirection `/pwa` (`Plugin.php`) pour forcer WebKit à bypasser le cache local sur les WebClips iOS.
- **Purge d'urgence & Préservation de session** : Fonction `clearCacheAndReload()` nettoyant le `CacheStorage` et `DAME_QUERY_CACHE` tout en maintenant intacts les jetons JWT et l'identité sélectionnée.

### 10. Utilitaires de Notation d'Échecs & Manipulation PGN (`src/utils/chessNotation.ts`)
Centralise et standardise toutes les opérations sur la notation échiquéenne française, les libellés de pièces, l'extraction de formes PGN et les algorithmes de mélange aléatoire :
- **Dictionnaires & Mappings de Rôles** :
  - `ROLE_NAMES_FR` : Noms en français (`pawn` -> `'Pion'`, `knight` -> `'Cavalier'`, `bishop` -> `'Fou'`, `rook` -> `'Tour'`, `queen` -> `'Dame'`, `king` -> `'Roi'`).
  - `ROLE_LETTERS_FR` : Initiales SAN françaises (`'C'`, `'F'`, `'T'`, `'D'`, `'R'`).
  - `CHAR_TO_ROLE` & `ROLE_TO_CHAR` : Conversion bidirectionnelle caractères FEN $\leftrightarrow$ rôles `chessops`.
- **Verbalisation & Libellés** :
  - `getPieceLabel(roleOrChar)` : Nom simple de la pièce en français (ex: `'n'` $\rightarrow$ `'Cavalier'`).
  - `getPieceDisplayName(roleOrChar, color)` : Nom avec accord en genre et en couleur (ex: `('r', 'white')` $\rightarrow$ `'Tour blanche'`, `('n', 'black')` $\rightarrow$ `'Cavalier noir'`).
  - `cleanNotation(raw)` : Nettoyage et normalisation de saisies textuelles de coups (ex: `' ta1 '` $\rightarrow$ `'Ta1'`).
  - `toFrenchNotation(san)` : Conversion SAN international vers français (ex: `'Nf3'` $\rightarrow$ `'Cf3'`).
  - `toInternationalNotation(san)` : Conversion SAN français vers international (ex: `'Cf3'` $\rightarrow$ `'Nf3'`).
  - `formatMoveInFrench(pos, san)` : Traduit un coup sur une position en libellé d'action clair (ex: `'Fou f1 en c4'`).
  - `formatMoveWithFrenchSan(pos, san)` : Libellé complet avec rappel SAN (ex: `'Fou f1 en c4 (Fc4)'`).
- **Extraction des Annotations PGN (`[%csl]`, `[%cal]`)** :
  - `extractShapesAndComment(comments)` / `extractShapesAndText(comments)` : Analyse les balises de cercles/flèches Lichess/ChessBase, applique la palette `PGN_BRUSH_MAP` et renvoie `{ comment, shapes }`.
- **Algorithme de Mélange Aléatoire** :
  - `shuffleArray<T>(array, rng?)` : Mélange de Fisher-Yates immuable préservant le tableau original.

## API REST & Hooks Partagés

*   **Champ personnalisé Agenda :** L'API REST WordPress (`dame`) enregistre le champ `categories_data` sur le type de contenu `dame_agenda` pour inclure la couleur de chaque catégorie (`id`, `name`, `slug`, `color`).
*   **Filtre Web Worker Stockfish (`dame_pwa_stockfish_worker_url`) :** Fournit l'URL absolue du Web Worker Stockfish (`pwa/dist/stockfish/stockfish.js`) pour mutualiser le moteur d'échecs avec d'autres extensions (ex: plugin `roi`).

## Développement & Release

```bash
# Vérification des types TypeScript
npm run type-check

# Linting ESLint
npm run lint

# Tests unitaires Vitest
npm run test:unit

# 1. Synchronisation et montée de version SemVer (met à jour package.json, PHP, CHANGELOG, etc.)
npm run version-sync -- 1.3.0

# 2. Compilation de la PWA (injecte la nouvelle version __APP_VERSION__ depuis package.json)
npm run build

# 3. Création de l'archive de déploiement ZIP (lance automatiquement le build PWA si nécessaire)
npm run package
```

