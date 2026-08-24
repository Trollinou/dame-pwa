# DAME PWA

Extension WordPress et Application Web Progressive (PWA) Ionic/Vue pour l'association DAME.

## Architecture

- `includes/` : Classes PHP du plugin WordPress (`DAME_PWA`).
- `pwa/` : Application Ionic 7 + Vue 3 + Pinia + TanStack Query.
  - `src/views/ApprentissageHubPage.vue` : Hub d'accueil à 2 panneaux (Cours théoriques / Espace de Jeu).
  - `src/views/ApprentissageCoursListPage.vue` : Liste des parcours et chapitres réservés aux adhérents.
  - `src/views/PlayPage.vue` : Échiquier interactif 1J (vs Stockfish 18) et 2J (Pass & Play) basé sur `eg-chessboard`.
  - `src/views/AnalysisPage.vue` : Revue et analyse coup par coup de la dernière partie jouée.
  - `src/components/agenda/` : Composants de la vue Le Club / Agenda (`ActualitesSegmentView.vue`, `AgendaSegmentView.vue`, `TournoisSegmentView.vue`, `BenevolatSegmentView.vue`, `AgendaCalendarView.vue`).
  - `src/components/agenda/detail/` : Composants purs de détail (`NewsDetailContent.vue`, `AgendaDetailContent.vue`, `TournamentDetailContent.vue`, `BenevolatDetailContent.vue`).
  - `src/components/shared/SplitMasterDetail.vue` : Conteneur responsive Master-Detail (1/3 - 2/3) pour tablettes paysage et ordinateurs.
  - `src/stores/agenda.ts` : Store Pinia gérant la récupération des événements de l'agenda et leurs catégories.
  - `src/queryClient.ts` : Configuration de TanStack Query avec persistance et invalidation automatique des caches de requêtes lors des montées de version PWA.

## Espace de Jeu & Apprentissage

- **Hub Apprentissage** : Accessible à tous depuis la barre d'onglets, il offre un point d'entrée vers les cours théoriques (protégés par adhésion) et vers l'échiquier de jeu (libre d'accès).
- **Moteur Stockfish** : Embarqué via `eg-chessboard` avec calcul dynamique du temps de réflexion (`Elo * 1.4 ms`) et mémorisation du niveau choisi.
- **Envoi PGN** : En mode 1 joueur, les parties des adhérents connectés sont enregistrées et synchronisées avec le plugin `roi` (`POST /roi/v1/games`).
- **Ergonomie iPad & Tablettes (Paysage)** : Adaptation plein écran avec disposition côte-à-côte centrée pour l'échiquier de jeu et la revue d'analyse.
- **Personnalisation Globale de l'Échiquier** : Store Pinia persistant `useChessPreferencesStore` gérant le jeu de pièces vectoriel (`pieceSet` parmi 8 styles) et le thème d'arrière-plan (`boardTheme` parmi 8 palettes) injectés réactivement sur tous les échiquiers de l'application.

## Profil & Personnalisation

- Composant `ChessThemeCustomizer.vue` avec deux carrousels 3D rotatifs pour manipuler et choisir les styles de pièces et fonds d'échiquier.
- Échiquier de prévisualisation réactif en position initiale.
- Sauvegarde locale persistante des préférences utilisateur répercutée sur tous les viewers d'exercices, cours, analyse et jeu.

## Composants & Composables Partagés (PWA Frontend)

Pour garantir la cohérence technique, l'application s'appuie sur un socle de composants et composables partagés situés dans `pwa/src/components/shared/` et `pwa/src/composables/` :

### 1. Composant Wrapper `<Chessboard>` (`src/components/shared/Chessboard/`)
Encapsule la bibliothèque `eg-chessboard` et centralise la configuration globale de l'échiquier :
- **Injection automatique des préférences** : Applique de manière réactive le style de pièces (`pieceSet`) et le thème du plateau (`boardTheme`) issus de `useChessPreferencesStore`.
- **Nettoyage automatique du cycle de vie** : Détruit proprement l'instance sous-jacente (`boardApi.destroy()`) à la destruction du composant (`onUnmounted`) pour prévenir les fuites de mémoire.
- **Props principales** : `fen`, `shapes`, `viewOnly` (défaut: `true`), `orientation`, `playerColor`, `coordinates`, `autoCastling`, `highlightLastMove`, `lastMove`, `stockfishEnabled`, `stockfishConfig`.
- **Événements supportés** : `@board-created`, `@move`, `@turn-change`, `@check`, `@checkmate`, `@stalemate`, `@draw`, `@stockfish-hint`, `@square-click`, `@shapes-change`, `@promotion`.

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

### 4. Composant En-tête d'Exercice `<ExerciseHeader>` (`src/components/shared/ExerciseHeader.vue`)
Composant d'en-tête standardisé pour les vues d'exercices d'apprentissage :
- **Panneau 1 (Métadonnées)** : Affiche le titre de l'exercice (`title`), son type (`typeLabel`, ex: "QCM", "Puzzle") et le chapitre/niveau associé (`chapitreNiveauLabel`).
- **Panneau 2 (Consigne & Badge d'étape)** : Affiche optionnellement le texte de la consigne (`consigne`) et le badge d'étape interactive (`stepBadgeText`).

```vue
<template>
  <ExerciseHeader
    :title="exercice.titre"
    type-label="QCM"
    :chapitre-niveau-label="exercice.chapitre"
    :consigne="exercice.consigne"
    :step-badge-text="`Étape ${currentCard}/${totalCards}`"
  />
</template>

<script setup lang="ts">
import ExerciseHeader from '@/components/shared/ExerciseHeader.vue';
</script>
```

### 5. Composant Pied de Série `<SeriesCardFooter>` (`src/components/shared/SeriesCardFooter.vue`)
Barre de navigation et zone de feedback visuel pour les exercices séquentiels ou séries multi-cartes :
- **Zone de feedback intégrée** : Affiche les messages dynamiques d'encouragement ou d'erreur (`feedback: { message, type }`) avec icône adaptée.
- **Badge d'étape** : Indique l'avancement (`Carte X / Y`).
- **Bouton d'action dynamique** : Passe automatiquement de *"Carte suivante"* (`nextText`) à *"Terminer l'exercice"* (`finishText`) sur la dernière étape lorsque `isSolved` est à `true`.
- **Indicateur d'attente** : Affiche un indice textuel (`pendingHint`) tant que la carte n'a pas été résolue.

```vue
<template>
  <SeriesCardFooter
    :current-card="currentCard"
    :total-cards="totalCards"
    :is-solved="isSolved"
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

### 6. Styles Partagés (`src/theme/shared-components.scss`)
Normalise le dimensionnement, les ratios et l'apparence des composants interactifs :
- `.chessboard-container` / `.board-container` : Respect strict du ratio `1 / 1`, bords nets (`border-radius: 0;`), absence d'ombres internes et adaptation dynamique en mode paysage tablette.
- `.qcm-button` / `.choice-btn` : Boutons de choix ergonomiques pour les QCM et quiz.
- `.exercise-card` : Structure standard pour les consignes et cartes de questions.

## API REST & Catégories

L'API REST WordPress (`dame`) enregistre le champ `categories_data` sur le type de contenu `dame_agenda` pour inclure la couleur de chaque catégorie (`id`, `name`, `slug`, `color`).

## Développement

```bash
# Vérification des types TypeScript
npm run type-check

# Linting ESLint
npm run lint

# Tests unitaires Vitest
npm run test:unit

# Compilation de la PWA
npm run build
```
