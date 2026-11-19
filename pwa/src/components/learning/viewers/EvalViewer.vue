<template>
  <div class="exercise-viewer-layout">
    <!-- Phase 1 : Questions -->
    <div v-if="phase === 'questions'" class="exercise-stage">
      <div class="chessboard-container">
        <Chessboard
          :fen="fenDepart"
          :shapes="shapes"
          :orientation="couleurJoueur"
          :player-color="couleurJoueur"
          :view-only="true"
        />
      </div>

      <ion-card class="exercise-card">
        <ion-card-header>
          <ion-card-title class="theme-title">{{ theme }}</ion-card-title>
        </ion-card-header>
        <ion-card-content v-if="questionActuelle">
          <p class="question-text">{{ questionActuelle.texte }}</p>

          <div class="buttons-container">
            <template v-if="questionActuelle.type_reponse === 'yesno'">
              <ion-button expand="block" color="primary" @click="repondre('oui')">Oui</ion-button>
              <ion-button expand="block" color="primary" @click="repondre('non')">Non</ion-button>
            </template>
            <template v-else-if="questionActuelle.type_reponse === 'evaluation'">
              <ion-button expand="block" color="success" @click="repondre('bonne')">Bonne</ion-button>
              <ion-button expand="block" color="warning" @click="repondre('neutre')">Neutre</ion-button>
              <ion-button expand="block" color="danger" @click="repondre('mauvaise')">Mauvaise</ion-button>
            </template>
          </div>
        </ion-card-content>
      </ion-card>
    </div>

    <!-- Phase 2 : Tactique -->
    <div v-else-if="phase === 'tactique'" class="exercise-stage">
      <PuzzleViewer
        :couleurJoueur="couleurJoueur"
        :fen="fenDepart"
        :shapes="shapes"
        :solution="solutionMoves"
        @success="phase = 'solution'"
      />
    </div>

    <!-- Phase 3 : Solution / PGN -->
    <div v-else class="exercise-stage">
      <PgnViewer
        :orientation="couleurJoueur"
        :pgn="pgnExplication"
      />
    </div>

    <SeriesCardFooter
      :currentCard="currentStepNumber"
      :totalCards="3"
      :isSolved="phase === 'solution'"
      :feedback="footerFeedback"
      :finishText="'Terminer l\'exercice'"
      badgePrefix="Étape"
      @next="emit('success')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/core/useFeedback';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import type { DrawShape } from 'eg-chessboard';
import PuzzleViewer from './PuzzleViewer.vue';
import PgnViewer from './PgnViewer.vue';

const { showSuccess, showError } = useFeedback();
const exerciseHeader = useExerciseHeader();

export interface QuestionEval {
  texte: string;
  type_reponse: 'yesno' | 'evaluation';
  reponse_attendue: string;
  explication: string;
}

const props = withDefaults(
  defineProps<{
    fenDepart: string;
    couleurJoueur: 'white' | 'black';
    shapes?: DrawShape[];
    theme: string;
    questions: QuestionEval[];
    solutionMoves: string[];
    pgnExplication: string;
  }>(),
  {
    shapes: () => []
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const phase = ref<'questions' | 'tactique' | 'solution'>('questions');
const questionIndex = ref(0);
const footerFeedback = ref<CardFeedback | null>(null);

const questionActuelle = computed(() => props.questions[questionIndex.value]);
const currentStepNumber = computed(() => (phase.value === 'questions' ? 1 : phase.value === 'tactique' ? 2 : 3));

watch(
  [phase, questionIndex, () => props.questions, () => props.theme],
  () => {
    if (phase.value === 'questions') {
      exerciseHeader?.setHeaderState({
        consigne: questionActuelle.value?.texte || `Évaluez la position (${props.theme || 'Échec & Éval'})`,
        stepBadgeText: `Question ${questionIndex.value + 1} / ${Math.max(1, props.questions.length)}`
      });
    } else if (phase.value === 'tactique') {
      exerciseHeader?.setHeaderState({
        consigne: 'À vous de jouer ! Trouvez la séquence.',
        stepBadgeText: 'Tactique'
      });
    } else {
      exerciseHeader?.setHeaderState({
        consigne: 'Explication',
        stepBadgeText: 'Solution'
      });
      footerFeedback.value = { type: 'success', message: 'Séquence résolue !' };
    }
  },
  { immediate: true }
);

const repondre = async (valeur: string) => {
  if (!questionActuelle.value) return;

  const attendu = questionActuelle.value.reponse_attendue.trim().toLowerCase();
  const donne = valeur.trim().toLowerCase();

  if (donne === attendu) {
    await showSuccess('Bonne réponse !', 2000);

    if (questionIndex.value < props.questions.length - 1) {
      questionIndex.value++;
    } else {
      phase.value = 'tactique';
    }
  } else {
    await showError(
      questionActuelle.value.explication || 'Mauvaise réponse, essayez à nouveau.',
      3500
    );
  }
};
</script>
