<template>
  <div class="exercise-viewer-layout">
    <!-- Échiquier affiché uniquement si une FEN est fournie -->
    <div v-if="fen" class="chessboard-container">
      <Chessboard
        :fen="fen"
        :shapes="props.shapes"
        :view-only="true"
        @board-created="onBoardCreated"
      />
    </div>

    <ion-card class="exercise-card">
      <ion-card-header v-if="!hideQuestion">
        <ion-card-title class="exercise-card-header">{{ question }}</ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <div class="qcm-choices">
          <ion-button
            v-for="(choixTexte, index) in choix"
            :key="index"
            expand="block"
            fill="solid"
            :color="couleurBouton(index)"
            :disabled="repondu"
            class="choice-btn"
            @click="validerChoix(index)"
          >
            {{ choixTexte }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Footer de Navigation par Carte -->
    <SeriesCardFooter
      v-if="props.totalCards && props.currentCard"
      :currentCard="props.currentCard"
      :totalCards="props.totalCards"
      :isSolved="repondu"
      :feedback="feedback"
      @next="passerCarteSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton
} from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/useFeedback';
import type { BoardCore, DrawShape } from 'eg-chessboard';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';

const { showSuccess, showError } = useFeedback();

const props = withDefaults(
  defineProps<{
    fen?: string; // Rendue optionnelle
    question: string;
    hideQuestion?: boolean;
    choix: string[];
    bonneReponse: number;
    shapes?: DrawShape[];
    currentCard?: number;
    totalCards?: number;
  }>(),
  {
    shapes: () => []
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const boardApi = ref<BoardCore | null>(null);

const repondu = ref(false);
const indexChoisi = ref<number | null>(null);
const feedback = ref<CardFeedback | null>(null);

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  if (props.fen) {
    boardApi.value.setPosition(props.fen);
  }
};

watch(() => props.fen, (newFen) => {
  if (boardApi.value && newFen) {
    boardApi.value.setPosition(newFen);
  }
});

watch(() => props.shapes, (newShapes) => {
  if (boardApi.value && newShapes) {
    boardApi.value.setShapes(newShapes);
  }
}, { deep: true });

// Logique visuelle
const couleurBouton = (index: number): string => {
  if (!repondu.value) {
    return 'primary';
  }
  if (index === props.bonneReponse) {
    return 'success';
  }
  if (index === indexChoisi.value) {
    return 'danger';
  }
  return 'medium';
};

const validerChoix = (index: number) => {
  if (repondu.value) {
    return;
  }

  indexChoisi.value = index;

  if (index === props.bonneReponse) {
    repondu.value = true;
    feedback.value = {
      type: 'success',
      message: 'Bien joué ! Bonne réponse.'
    };

    // Si aucune gestion de cartes n'est configurée, fallback toast automatique
    if (!props.totalCards || !props.currentCard) {
      showSuccess('Bien joué ! Bonne réponse.', 2000);
      setTimeout(() => {
        emit('success');
      }, 800);
    }
  } else {
    feedback.value = {
      type: 'danger',
      message: 'Mauvaise réponse, essaie encore !'
    };

    if (!props.totalCards || !props.currentCard) {
      showError('Mauvaise réponse, essaie encore !', 2000);
    }
  }
};

const passerCarteSuivante = () => {
  emit('success');
};
</script>

