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
import { useFeedback } from '@/composables/core/useFeedback';
import type { BoardCore, Key, DrawShape, Move } from 'eg-chessboard';

const { showSuccess, showError } = useFeedback();

const props = withDefaults(
  defineProps<{
    fen: string;
    couleurJoueur: 'white' | 'black';
    solution: string[];
    alternatives?: string[][];
    shapes?: DrawShape[];
    lastMoveHighlight?: Key[];
    disableFeedbackToast?: boolean;
  }>(),
  {
    alternatives: () => [],
    shapes: () => [],
    disableFeedbackToast: false,
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'error', move: Move): void;
}>();

const boardApi = ref<BoardCore | null>(null);
const etapeActuelle = ref(0);
const isComputerPlaying = ref(false);
const currentLastMove = ref<Key[] | undefined>(props.lastMoveHighlight);

watch(
  () => [props.fen, props.lastMoveHighlight] as const,
  ([, newLastMove]) => {
    etapeActuelle.value = 0;
    isComputerPlaying.value = false;
    currentLastMove.value = newLastMove;
  }
);

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
};

watch(() => props.shapes, (newShapes) => {
  if (boardApi.value && newShapes) {
    boardApi.value.setShapes(newShapes);
  }
}, { deep: true });

const isMoveMatching = (move: Move, expected: string): boolean => {
  if (!expected) return false;
  return (
    move.san === expected ||
    move.lan === expected ||
    `${move.from}${move.to}` === expected ||
    (Boolean(move.san) && expected.replace(/[+#x=]/g, '') === move.san.replace(/[+#x=]/g, ''))
  );
};

const verifierCoup = async (move: Move) => {
  if (isComputerPlaying.value) {
    currentLastMove.value = [move.from as Key, move.to as Key];
    return;
  }

  // Normalize move comparison (main solution + optional step alternatives)
  const coupAttendu = props.solution[etapeActuelle.value];
  const coupsAlternatifs = props.alternatives?.[etapeActuelle.value] ?? [];
  const candidats = [
    ...(coupAttendu ? [coupAttendu] : []),
    ...coupsAlternatifs,
  ];
  const isCoupCorrect = candidats.some((c) => isMoveMatching(move, c));

  if (isCoupCorrect) {
    // Le coup de l'utilisateur est correct
    etapeActuelle.value++;

    // Vérifie si l'exercice est terminé
    if (etapeActuelle.value === props.solution.length) {
      if (!props.disableFeedbackToast) {
        showSuccess('Félicitations ! Exercice réussi.', 3000);
      }
      emit('success');
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
    // Le coup est incorrect : on l'annule et on restaure les shapes et le lastMove immédiatement
    boardApi.value?.undoLastMove();
    if (boardApi.value) {
      if (currentLastMove.value && currentLastMove.value.length > 0) {
        if (etapeActuelle.value === 0) {
          boardApi.value.setPosition(props.fen, currentLastMove.value);
        } else if (typeof boardApi.value.getFen === 'function') {
          boardApi.value.setPosition(boardApi.value.getFen(), currentLastMove.value);
        } else if (typeof boardApi.value.setConfig === 'function') {
          boardApi.value.setConfig({ lastMove: currentLastMove.value });
        }
      }
      if (props.shapes && props.shapes.length > 0) {
        boardApi.value.setShapes(props.shapes);
      }
    }
    emit('error', move);
    if (!props.disableFeedbackToast) {
      showError('Mauvais coup, cherche encore !', 2000);
    }
  }
};
</script>

