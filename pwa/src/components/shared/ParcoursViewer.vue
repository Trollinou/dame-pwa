<template>
  <div class="parcours-viewer-layout">
    <div class="board-container">
      <Chessboard
        :fen="props.fenDepart"
        :player-color="props.couleurJoueur"
        :orientation="props.couleurJoueur"
        :shapes="props.shapes as DrawShape[]"
        :view-only="false"
        :board-config="{
          drawable: { enabled: false }
        }"
        @board-created="onBoardCreated"
        @move="handleMove"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape, Move, Key } from 'eg-chessboard';
import { useFeedback } from '@/composables/useFeedback';

const { showSuccess, showError } = useFeedback();

const props = defineProps<{
  fenDepart: string;
  couleurJoueur: 'white' | 'black';
  variante: string;
  caseDepart: string;
  caseArrivee: string;
  shapes: DrawShape[];
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const boardApi = ref<BoardCore | null>(null);

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  api.setSoloMode(true);
  api.setPreserveShapesOnPositionChange(true);
  if (props.shapes && props.shapes.length > 0) {
    api.setShapes(props.shapes);
  }
};

watch(
  () => props.shapes,
  (newShapes) => {
    if (boardApi.value && newShapes) {
      boardApi.value.setShapes(newShapes);
    }
  },
  { deep: true }
);

watch(
  () => props.fenDepart,
  (newFen) => {
    if (boardApi.value && newFen) {
      boardApi.value.setPosition(newFen);
      if (props.shapes && props.shapes.length > 0) {
        boardApi.value.setShapes(props.shapes);
      }
    }
  }
);

const handleMove = async (move: Move) => {
  if (!boardApi.value) return;

  const oppColor = props.couleurJoueur === 'white' ? 'black' : 'white';
  const oppColorShort = oppColor === 'white' ? 'w' : 'b';

  // 1. Règle absolue : Ne pas s'arrêter sur une case rouge
  const isRedSquare = props.shapes.some(s => s.brush === 'red' && s.orig === move.to);
  if (isRedSquare) {
    await showError("Case interdite !", 2000);
    boardApi.value.setPosition(props.fenDepart);
    if (props.shapes && props.shapes.length > 0) {
      boardApi.value.setShapes(props.shapes);
    }
    return;
  }

  // 2. Variante Stealth (Pas vu, pas pris)
  if (props.variante === 'stealth' && boardApi.value.isSquareAttacked(move.to as Key, oppColor)) {
    await showError("Vous avez été repéré !", 2000);
    boardApi.value.setPosition(props.fenDepart);
    if (props.shapes && props.shapes.length > 0) {
      boardApi.value.setShapes(props.shapes);
    }
    return;
  }

  // 3. Arrivée sur la case cible
  if (move.to === props.caseArrivee) {
    if (props.variante === 'pacman') {
      const allPieces = boardApi.value.getPieces();
      let hasOpponentPieces = false;
      allPieces.forEach(p => { if (p.color === oppColorShort) hasOpponentPieces = true; });
      if (hasOpponentPieces) {
        await showError("Il reste des pièces à manger !", 2000);
        boardApi.value.setPosition(props.fenDepart);
        if (props.shapes && props.shapes.length > 0) {
          boardApi.value.setShapes(props.shapes);
        }
        return;
      }
    }
    // Succès
    await showSuccess("Parcours réussi !", 2000);
    setTimeout(() => emit('success'), 800);
  }
};
</script>

<style scoped>
.parcours-viewer-layout {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.board-container {
  width: 100%;
  aspect-ratio: 1;
  max-width: 500px;
  margin: 0 auto;
}
</style>
