<template>
  <div class="exercise-viewer-layout">
    <div class="chessboard-container">
      <Chessboard
        :fen="fen"
        :orientation="couleurJoueur"
        :player-color="couleurJoueur"
        :shapes="shapes"
        :last-move="props.lastMoveHighlight || undefined"
        :highlight-last-move="true"
        :view-only="false"
        @board-created="onBoardCreated"
        @move="verifierCoup"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/useFeedback';
import type { BoardCore, Key, DrawShape, Move } from 'eg-chessboard';

const { showSuccess, showError } = useFeedback();

const props = withDefaults(
  defineProps<{
    fen: string;
    couleurJoueur: 'white' | 'black';
    solution: string[];
    shapes?: DrawShape[];
    lastMoveHighlight?: Key[];
  }>(),
  {
    shapes: () => []
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const boardApi = ref<BoardCore | null>(null);
const etapeActuelle = ref(0);
const isComputerPlaying = ref(false);

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
};

watch(() => props.shapes, (newShapes) => {
  if (boardApi.value && newShapes) {
    boardApi.value.setShapes(newShapes);
  }
}, { deep: true });

const verifierCoup = async (move: Move) => {
  if (isComputerPlaying.value) {
    return;
  }

  // Normalize move comparison
  const coupAttendu = props.solution[etapeActuelle.value];
  const isCoupCorrect = coupAttendu && (
    move.san === coupAttendu || 
    move.lan === coupAttendu || 
    `${move.from}${move.to}` === coupAttendu ||
    (move.san && coupAttendu.replace(/[+#x=]/g, '') === move.san.replace(/[+#x=]/g, ''))
  );

  if (isCoupCorrect) {
    // Le coup de l'utilisateur est correct
    etapeActuelle.value++;

    // Vérifie si l'exercice est terminé
    if (etapeActuelle.value === props.solution.length) {
      showSuccess('Félicitations ! Exercice réussi.', 3000);
      
      // Petit délai pour laisser l'utilisateur apprécier son dernier coup
      setTimeout(() => {
        emit('success');
      }, 1000);
      
    } else {
      // L'exercice continue : l'ordinateur joue sa réponse scriptée
      setTimeout(() => {
        if (boardApi.value && props.solution[etapeActuelle.value]) {
          isComputerPlaying.value = true;
          try {
            boardApi.value.move(props.solution[etapeActuelle.value]);
            etapeActuelle.value++;
            if (props.shapes && props.shapes.length > 0) {
              boardApi.value.setShapes(props.shapes);
            }
          } finally {
            // Relâcher le flag après exécution
            setTimeout(() => {
              isComputerPlaying.value = false;
            }, 100);
          }
        }
      }, 600);
    }
  } else {
    // Le coup est incorrect : on l'annule et on restaure les shapes immédiatement
    boardApi.value?.undoLastMove();
    if (boardApi.value && props.shapes && props.shapes.length > 0) {
      boardApi.value.setShapes(props.shapes);
    }
    showError('Mauvais coup, cherche encore !', 2000);
  }
};
</script>

