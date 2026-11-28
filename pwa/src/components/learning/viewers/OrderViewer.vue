<!-- src/components/learning/viewers/OrderViewer.vue -->
<template>
  <div class="exercise-stage">
    <!-- Phase d'ordonnancement (Drag & Drop sur grille 2 colonnes) -->
    <template v-if="!isSolved">
      <div class="learning-callout learning-callout--info ion-text-center">
        <span>Fais glisser chaque carte à sa bonne position.</span>
      </div>

      <div class="learning-board-grid-2col">
        <div
          v-for="(item, index) in orderedItems"
          :key="'order-' + item.id"
          :data-order-index="index"
          draggable="false"
          class="learning-board-card learning-board-card--draggable"
          :class="{
            'is-dragging': isDraggingCard && dragSourceIndex === index,
            'is-drag-over': isDraggingCard && dragTargetIndex === index && dragSourceIndex !== index
          }"
          @pointerdown="onOrderCardPointerDown($event, index)"
        >
          <div class="learning-board-card__header">
            <div class="learning-board-card__badge">{{ index + 1 }}</div>
          </div>

          <div class="chessboard-container chessboard-container--mini">
            <DiagramViewer :fen="item.fen" :orientation="item.orientation" :shapes="item.shapes" />
          </div>
        </div>
      </div>
    </template>

    <!-- Phase post-validation : affichage des commentaires en regard de chaque position -->
    <div v-else-if="hasAnyComment" class="order-validated-list animate-fade-in">
      <div
        v-for="(item, index) in orderedItems"
        :key="'validated-' + item.id"
        class="order-validated-row"
      >
        <div class="board-column">
          <div class="learning-board-card is-valid is-disabled">
            <div class="learning-board-card__header">
            <div class="learning-board-card__badge">{{ index + 1 }}</div>
          </div>
            <div class="chessboard-container chessboard-container--mini">
              <DiagramViewer :fen="item.fen" :orientation="item.orientation" :shapes="item.shapes" />
            </div>
          </div>
        </div>

        <div class="desc-column">
          <div
            v-if="item.commentaire && item.commentaire.trim().length > 0"
            class="learning-callout learning-callout--info order-comment-box"
          >
            {{ item.commentaire }}
          </div>
        </div>
      </div>
    </div>

    <!-- Phase post-validation sans commentaires : grille verrouillée en état valide -->
    <div v-else class="learning-board-grid-2col animate-fade-in">
      <div
        v-for="(item, index) in orderedItems"
        :key="'validated-grid-' + item.id"
        class="learning-board-card is-valid is-disabled"
      >
        <div class="learning-board-card__header">
          <div class="learning-board-card__badge">{{ index + 1 }}</div>
        </div>
        <div class="chessboard-container chessboard-container--mini">
          <DiagramViewer :fen="item.fen" :orientation="item.orientation" :shapes="item.shapes" />
        </div>
      </div>
    </div>

    <SeriesCardFooter
      :currentCard="1"
      :totalCards="1"
      :isSolved="isSolved"
      :feedback="footerFeedback"
      :pendingHint="pendingHint"
      badgePrefix="Étape"
      :finishText="'Terminer l\'exercice'"
      @next="emit('success')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { DrawShape } from 'eg-chessboard';
import DiagramViewer from '@/components/learning/viewers/DiagramViewer.vue';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import { useBoardDragReorder } from '@/composables/learning/useBoardDragReorder';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import { shuffleNonSorted } from '@/utils/chess/chessNotation';

const exerciseHeader = useExerciseHeader();

export interface OrderItem {
  id: string | number;
  fen: string;
  orientation: 'white' | 'black';
  shapes?: DrawShape[];
  commentaire?: string;
  [key: string]: unknown;
}

const props = defineProps<{
  correctItems: OrderItem[]; // Le tableau des éléments dans l'ordre EXACT attendu
  consigne?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const orderedItems = ref<OrderItem[]>([]);

const isSolved = computed(() => {
  if (orderedItems.value.length === 0 || orderedItems.value.length !== props.correctItems.length) {
    return false;
  }
  return orderedItems.value.every((item, idx) => item.id === props.correctItems[idx].id);
});

const {
  dragSourceIndex,
  dragTargetIndex,
  isDraggingCard,
  onCardPointerDown: onOrderCardPointerDown,
  resetDragState,
} = useBoardDragReorder(orderedItems, { disabled: isSolved });

const hasAnyComment = computed(() =>
  orderedItems.value.some((item) => typeof item.commentaire === 'string' && item.commentaire.trim().length > 0)
);

const footerFeedback = computed<CardFeedback | null>(() => {
  if (isSolved.value) {
    return {
      type: 'success',
      message: 'Bravo ! L\'ordre est exact.'
    };
  }
  return null;
});

const pendingHint = computed(() => {
  return 'Fais glisser les cartes pour les remettre dans l’ordre';
});

watch(
  [isSolved, () => props.correctItems.length, () => props.consigne],
  () => {
    exerciseHeader?.setHeaderState({
      consigne: props.consigne || 'Classe les positions dans l\'ordre demandé.',
      stepBadgeText: `${isSolved.value ? props.correctItems.length : 0} / ${props.correctItems.length}`
    });
  },
  { immediate: true }
);

// Initialisation et mélange (en évitant un tirage déjà résolu si > 1 carte)
const initOrder = () => {
  orderedItems.value = shuffleNonSorted(
    props.correctItems,
    (items) => items.every((item, idx) => item.id === props.correctItems[idx].id)
  );
  resetDragState();
};

watch(() => props.correctItems, () => { initOrder(); }, { deep: true, immediate: true });
</script>
