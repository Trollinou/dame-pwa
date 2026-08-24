<template>
  <div class="exercise-viewer-layout">
    <!-- Échiquier en haut -->
    <div class="chessboard-container">
      <Chessboard
        :fen="props.fenDepart"
        :shapes="props.shapes"
        :orientation="couleurJoueur"
        :player-color="couleurJoueur"
        :view-only="true"
        @board-created="onBoardCreated"
      />
    </div>

    <!-- Carte QCM en bas -->
    <ion-card class="exercise-card">
      <ion-card-header v-if="!hideQuestion && etapeActuelle.question">
        <ion-card-title class="exercise-card-header">
          {{ etapeActuelle.question }}
        </ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <div class="qcm-choices">
          <ion-button
            v-for="(choixObj, index) in etapeActuelle.choix"
            :key="index"
            expand="block"
            fill="solid"
            :color="couleurBouton(index)"
            :disabled="repondu"
            class="choice-btn"
            @click="validerChoix(index)"
          >
            {{ choixObj.texte }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Footer de Navigation par Carte -->
    <SeriesCardFooter
      :currentCard="etapeCouranteIndex + 1"
      :totalCards="props.etapes ? props.etapes.length : 1"
      :isSolved="repondu"
      :feedback="feedback"
      @next="passerEtapeSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton
} from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape } from 'eg-chessboard';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';

interface Choix {
  texte: string;
  san: string;
  explication: string;
}

interface Etape {
  question: string;
  choix: Choix[];
  bonne_reponse: number;
  reponse_ordinateur?: string;
}

const props = withDefaults(
  defineProps<{
    fenDepart: string;
    couleurJoueur: 'white' | 'black';
    etapes: Etape[];
    shapes?: DrawShape[];
    hideQuestion?: boolean;
  }>(),
  {
    shapes: () => [],
    hideQuestion: false
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'etape-change', index: number): void;
}>();

const etapeCouranteIndex = ref(0);
const boardApi = ref<BoardCore | null>(null);
const repondu = ref(false);
const indexChoisi = ref<number | null>(null);
const feedback = ref<CardFeedback | null>(null);

const etapeActuelle = computed<Etape>(() => {
  return props.etapes[etapeCouranteIndex.value] || {
    question: '',
    choix: [],
    bonne_reponse: 0
  };
});

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
};

watch(() => props.shapes, (newShapes) => {
  if (boardApi.value && newShapes) {
    boardApi.value.setShapes(newShapes);
  }
}, { deep: true });

// Réinitialiser en cas de changement de la FEN de départ
watch(() => props.fenDepart, (newFen) => {
  etapeCouranteIndex.value = 0;
  repondu.value = false;
  indexChoisi.value = null;
  feedback.value = null;
  if (boardApi.value && newFen) {
    boardApi.value.setPosition(newFen);
  }
});

const couleurBouton = (index: number): string => {
  if (!repondu.value) {
    return 'primary';
  }
  if (index === etapeActuelle.value.bonne_reponse) {
    return 'success';
  }
  if (index === indexChoisi.value) {
    return 'danger';
  }
  return 'medium';
};

const validerChoix = async (index: number) => {
  if (repondu.value) {
    return;
  }

  indexChoisi.value = index;

  if (index !== etapeActuelle.value.bonne_reponse) {
    // Si mauvaise réponse, affiche l'explication dans la barre de feedback
    feedback.value = {
      type: 'danger',
      message: etapeActuelle.value.choix[index].explication || 'Mauvaise réponse, essaie encore !'
    };
    indexChoisi.value = null;
  } else {
    // Si bonne réponse
    repondu.value = true;
    feedback.value = {
      type: 'success',
      message: etapeActuelle.value.choix[index].explication || 'Bien joué ! Bonne réponse.'
    };

    // Joue le coup de l'utilisateur
    if (boardApi.value) {
      boardApi.value.move(etapeActuelle.value.choix[index].san);
    }

    // Attendre 600ms
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Si réponse de l'ordinateur, on la joue
    if (etapeActuelle.value.reponse_ordinateur && boardApi.value) {
      boardApi.value.move(etapeActuelle.value.reponse_ordinateur);
    }

    // Si une seule étape (pas de série), émettre success après la lecture
    if (!props.etapes || props.etapes.length <= 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      emit('success');
    }
  }
};

const passerEtapeSuivante = () => {
  if (etapeCouranteIndex.value < props.etapes.length - 1) {
    etapeCouranteIndex.value++;
    repondu.value = false;
    indexChoisi.value = null;
    feedback.value = null;
    emit('etape-change', etapeCouranteIndex.value);
  } else {
    emit('success');
  }
};
</script>

