<template>
  <div class="exercise-viewer-layout">
    <div class="chessboard-container">
      <Chessboard
        :key="boardKey"
        :fen="effectiveFen"
        :player-color="props.couleurJoueur"
        :orientation="props.couleurJoueur"
        :shapes="effectiveShapes as DrawShape[]"
        :view-only="isTracesVariant || isSolved"
        :board-config="{
          drawable: { enabled: false }
        }"
        @board-created="onBoardCreated"
        @move="handleMove"
      />
    </div>

    <!-- Palette de sélection des pièces pour la variante Traces -->
    <div v-if="isTracesVariant" class="traces-palette-section ion-margin-top">
      <p class="section-instruction">Sélectionnez la pièce qui a laissé ces traces :</p>
      <div :class="['piece-palette', 'cg-board', `piece-set-${chessPreferences.pieceSet || 'cburnett'}`]">
        <button
          v-for="item in tracesPieces"
          :key="item.role"
          type="button"
          class="piece-btn"
          :class="{ 'is-selected': selectedPieceRole === item.role }"
          :disabled="isSolved"
          :aria-label="item.label"
          @click="handleSelectTracesPiece(item.role)"
        >
          <piece :class="['piece', item.cgClass, 'white']"></piece>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type { DrawShape, Move, Key } from 'eg-chessboard';
import {
  getParcoursVariant,
  extractPieceTypeFromFen,
  getPieceRoleLabel,
  removePieceFromSquareInFen,
  type ParcoursBoardApi
} from '@/utils/parcoursVariants';
import { LoopTracker, extractOpponentPieceSquare } from '@/utils/LoopTracker';
import { useChessPreferencesStore } from '@/stores/chessPreferences';
import type { CardFeedback } from '@/components/shared/SeriesCardFooter.vue';

const chessPreferences = useChessPreferencesStore();

const props = defineProps<{
  fenDepart: string;
  couleurJoueur: 'white' | 'black';
  variante: string;
  caseDepart?: string;
  caseArrivee?: string;
  pieceAttendue?: string;
  shapes: DrawShape[];
  isSolved?: boolean;
}>();

const emit = defineEmits<{
  (e: 'solved'): void;
  (e: 'feedback', feedback: CardFeedback | null): void;
  (e: 'success'): void;
}>();

const boardApi = ref<ParcoursBoardApi | null>(null);
const boardKey = ref(0);
const selectedPieceRole = ref<string | null>(null);
const loopTracker = ref<LoopTracker | null>(null);

const tracesPieces = [
  { role: 'k', cgClass: 'king', label: 'Roi' },
  { role: 'q', cgClass: 'queen', label: 'Dame' },
  { role: 'r', cgClass: 'rook', label: 'Tour' },
  { role: 'b', cgClass: 'bishop', label: 'Fou' },
  { role: 'n', cgClass: 'knight', label: 'Cavalier' },
  { role: 'p', cgClass: 'pawn', label: 'Pion' },
];

const isTracesVariant = computed(() => props.variante === 'traces');

const isLoop = computed(() => {
  if (
    props.caseDepart &&
    (!props.caseArrivee ||
      props.caseDepart.toLowerCase() === props.caseArrivee.toLowerCase())
  ) {
    return true;
  }
  return false;
});

const initLoopTracker = () => {
  if (isLoop.value && props.caseDepart) {
    const oppSquare =
      extractOpponentPieceSquare(props.fenDepart, props.couleurJoueur) || 'd5';
    loopTracker.value = new LoopTracker(oppSquare, props.caseDepart);
  } else {
    loopTracker.value = null;
  }
};

const targetGreenSquare = computed(() => {
  if (props.caseArrivee) {
    return props.caseArrivee;
  }
  const greenShape = props.shapes?.find(
    (s) =>
      (s.brush === 'green' || s.brush === 'g') &&
      (!s.dest || s.dest.toLowerCase() === s.orig.toLowerCase())
  );
  return greenShape?.orig;
});

const effectiveShapes = computed<DrawShape[]>(() => {
  if (props.isSolved) {
    return props.shapes || [];
  }
  if (props.variante === 'standard' || props.variante === 'stealth') {
    // Ne pas afficher les flèches lors de l'affichage initial
    return (props.shapes || []).filter(
      (s) => !s.dest || s.dest.toLowerCase() === s.orig.toLowerCase()
    );
  }
  return props.shapes || [];
});

const effectiveFen = computed(() => {
  if (props.isSolved) {
    return props.fenDepart;
  }
  if (isTracesVariant.value) {
    return '8/8/8/8/8/8/8/8 w - - 0 1';
  }
  if ((props.variante === 'standard' || props.variante === 'stealth') && !isLoop.value) {
    if (targetGreenSquare.value) {
      return removePieceFromSquareInFen(props.fenDepart, targetGreenSquare.value);
    }
  }
  return props.fenDepart;
});

const expectedPieceRole = computed(() => {
  if (props.pieceAttendue) {
    return props.pieceAttendue.toLowerCase();
  }
  return extractPieceTypeFromFen(props.fenDepart);
});

const resetPosition = () => {
  selectedPieceRole.value = null;
  if (loopTracker.value) {
    loopTracker.value.reset();
  }
  if (!boardApi.value) return;
  if (typeof boardApi.value.setPosition === 'function') {
    boardApi.value.setPosition(effectiveFen.value);
  }
  if (effectiveShapes.value && effectiveShapes.value.length > 0 && typeof boardApi.value.setShapes === 'function') {
    boardApi.value.setShapes(effectiveShapes.value);
  }
};

const onBoardCreated = (api: any) => {
  boardApi.value = api;
  if (api && typeof api.setSoloMode === 'function') {
    api.setSoloMode(true);
  }
  if (api && typeof api.setPreserveShapesOnPositionChange === 'function') {
    api.setPreserveShapesOnPositionChange(true);
  }
  if (effectiveShapes.value && effectiveShapes.value.length > 0 && api && typeof api.setShapes === 'function') {
    api.setShapes(effectiveShapes.value);
  }
};

watch(
  () => effectiveShapes.value,
  (newShapes) => {
    if (boardApi.value && newShapes && typeof boardApi.value.setShapes === 'function') {
      boardApi.value.setShapes(newShapes);
    }
  },
  { deep: true }
);

watch(
  () => [
    props.fenDepart,
    props.couleurJoueur,
    props.variante,
    props.caseDepart,
    props.caseArrivee,
    props.isSolved,
  ],
  () => {
    initLoopTracker();
    boardKey.value++;
  },
  { immediate: true }
);

const handleSelectTracesPiece = (role: string) => {
  if (props.isSolved) return;
  selectedPieceRole.value = role;

  const expected = expectedPieceRole.value;
  if (expected && role.toLowerCase() === expected.toLowerCase()) {
    const pieceName = getPieceRoleLabel(role);
    emit('feedback', {
      type: 'success',
      message: `Bravo ! C'est bien la ${pieceName} qui a laissé ces traces.`,
    });
    emit('solved');
    emit('success');
  } else {
    emit('feedback', {
      type: 'danger',
      message: "Ce n'est pas cette pièce qui a laissé ces traces ! Observez bien le déplacement.",
    });
  }
};

const handleMove = (move: Move) => {
  if (!boardApi.value || isTracesVariant.value) return;

  const variant = getParcoursVariant(props.variante);
  const result = variant.validateMove({
    from: move.from as Key,
    to: move.to as Key,
    fenDepart: props.fenDepart,
    couleurJoueur: props.couleurJoueur,
    caseDepart: props.caseDepart || '',
    caseArrivee: props.caseArrivee || '',
    shapes: props.shapes || [],
    boardApi: boardApi.value,
    isLoop: isLoop.value,
    loopTracker: loopTracker.value,
  });

  if (!result.valid) {
    emit('feedback', {
      type: 'danger',
      message: result.errorMessage || 'Case non autorisée !',
    });
    // Rétablir la position de départ
    setTimeout(() => {
      resetPosition();
    }, 400);
    return;
  }

  if (result.isFinished) {
    emit('feedback', {
      type: 'success',
      message: result.successMessage || 'Parcours réussi !',
    });
    emit('solved');
    emit('success');
    return;
  }

  // Coup valide intermédiaire
  emit('feedback', null);
};

defineExpose({
  resetPosition,
});
</script>

<style scoped>
.traces-palette-section {
  width: 100%;
  max-width: 480px;
  margin: 16px auto 0 auto;
}

.section-instruction {
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 10px;
  color: var(--ion-color-step-800, #333);
}
</style>

