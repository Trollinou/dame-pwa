<template>
  <div class="exercise-viewer-layout">
    <!-- Card de consigne -->
    <ion-card v-if="consigne" class="exercise-card ion-margin-bottom">
      <ion-card-header>
        <ion-card-title class="exercise-card-header">{{ consigne }}</ion-card-title>
      </ion-card-header>
    </ion-card>

    <!-- Échiquier -->
    <div class="chessboard-container">
      <Chessboard
        :fen="diagrammeActuel?.fen || ''"
        :shapes="diagrammeActuel?.shapes || []"
        :orientation="diagrammeActuel?.couleur_joueur || 'white'"
        :player-color="diagrammeActuel?.couleur_joueur || 'white'"
        :view-only="typeReponse === 'qcm'"
        :highlight-last-move="true"
        @board-created="onBoardCreated"
        @move="verifierCoup"
      />
    </div>

    <!-- Choix QCM (uniquement si typeReponse === 'qcm') -->
    <ion-card v-if="typeReponse === 'qcm' && diagrammeActuel?.qcm_choix" class="exercise-card">
      <ion-card-content>
        <div class="qcm-choices">
          <ion-button
            v-for="(choix, index) in diagrammeActuel.qcm_choix"
            :key="index"
            expand="block"
            fill="solid"
            color="primary"
            class="choice-btn choice-btn--centered"
            @click="validerQcm(index)"
          >
            {{ choix.texte }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
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
import { useFeedback } from '@/composables/useFeedback';
import type { BoardCore, DrawShape, Move } from 'eg-chessboard';

const { showSuccess, showError } = useFeedback();

export interface QcmChoix {
  texte: string;
  explication: string;
}

export interface DiagrammeCapOuPasCap {
  fen: string;
  couleur_joueur: 'white' | 'black';
  shapes?: DrawShape[];
  qcm_choix?: QcmChoix[];
  qcm_bonne_reponse?: number;
  move_san?: string;
  move_explication?: string;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    typeReponse?: 'qcm' | 'move' | string;
    diagrammes?: DiagrammeCapOuPasCap[];
  }>(),
  {
    consigne: '',
    typeReponse: 'qcm',
    diagrammes: () => []
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const etapeCourante = ref(0);
const boardApi = ref<BoardCore | null>(null);

const diagrammeActuel = computed<DiagrammeCapOuPasCap | null>(() => {
  if (props.diagrammes && props.diagrammes.length > etapeCourante.value) {
    return props.diagrammes[etapeCourante.value];
  }
  return null;
});

const boardConfig = computed(() => {
  const diag = diagrammeActuel.value;
  return {
    fen: diag?.fen || '',
    orientation: diag?.couleur_joueur || 'white',
    viewOnly: props.typeReponse === 'qcm',
    drawable: { shapes: diag?.shapes || [] },
    highlight: { lastMove: true }
  };
});

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  if (diagrammeActuel.value?.fen) {
    boardApi.value.setPosition(diagrammeActuel.value.fen);
  }
};

watch(
  diagrammeActuel,
  (newDiag) => {
    if (boardApi.value && newDiag?.fen) {
      boardApi.value.setPosition(newDiag.fen);
      if (newDiag.shapes) {
        boardApi.value.setShapes(newDiag.shapes);
      }
    }
  },
  { immediate: true }
);

const avancerOuReussir = async (message: string) => {
  await showSuccess(message, 2000);

  if (etapeCourante.value + 1 < props.diagrammes.length) {
    etapeCourante.value++;
  } else {
    setTimeout(() => {
      emit('success');
    }, 800);
  }
};

const validerQcm = async (index: number) => {
  const diag = diagrammeActuel.value;
  if (!diag) return;

  const choix = diag.qcm_choix?.[index];
  const estBonneReponse = index === diag.qcm_bonne_reponse;

  if (estBonneReponse) {
    const explication = choix?.explication || 'Bien joué !';
    await avancerOuReussir(explication);
  } else {
    const explication = choix?.explication || 'Mauvaise réponse !';
    await showError(explication, 2500);
  }
};

const verifierCoup = async (move: Move) => {
  const diag = diagrammeActuel.value;
  if (!diag || props.typeReponse !== 'move') return;

  const playerColorShort = (diag.couleur_joueur || 'white') === 'white' ? 'w' : 'b';
  if (move.color !== playerColorShort) {
    return;
  }

  if (move.san === diag.move_san) {
    await avancerOuReussir('Bien joué !');
  } else {
    boardApi.value?.undoLastMove();
    const messageErreur = diag.move_explication || 'Ce n\'est pas le bon coup. Cherchez le mat !';
    await showError(messageErreur, 2500);
  }
};
</script>

