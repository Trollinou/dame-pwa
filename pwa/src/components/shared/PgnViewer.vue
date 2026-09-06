<template>
  <div class="exercise-viewer-layout">
    <div class="chessboard-container">
      <Chessboard
        mode="study"
        :orientation="(props.orientation === 'black' ? 'black' : 'white')"
        :view-only="true"
        @board-created="onBoardCreated"
      />
    </div>

    <!-- Navigation Controls -->
    <div class="navigation-controls">
      <ion-button
        fill="outline"
        color="primary"
        class="nav-btn"
        :disabled="isAtStart"
        @click="viewStart"
        title="Début"
      >
        <ion-icon slot="icon-only" :icon="playBackOutline"></ion-icon>
      </ion-button>
      <ion-button
        fill="outline"
        color="primary"
        class="nav-btn"
        :disabled="isAtStart"
        @click="viewPrevious"
        title="Précédent"
      >
        <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
      </ion-button>
      <ion-button
        fill="outline"
        color="primary"
        class="nav-btn"
        :disabled="isAtEnd"
        @click="viewNext"
        title="Suivant"
      >
        <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
      </ion-button>
      <ion-button
        v-if="!props.hideEndButton"
        fill="outline"
        color="primary"
        class="nav-btn"
        :disabled="isAtEnd"
        @click="viewEnd"
        title="Fin"
      >
        <ion-icon slot="icon-only" :icon="playForwardOutline"></ion-icon>
      </ion-button>
    </div>

    <!-- Comment Display (hauteur fixe et réservée) -->
    <div ref="commentContainerEl" class="comment-container" :class="{ 'comment-empty': !currentComment }">
      <p class="comment-text">
        {{ currentComment ? '💬 ' + currentComment : '' }}
      </p>
    </div>

    <!-- Footer de Navigation par Carte (optionnel si en série) -->
    <SeriesCardFooter
      v-if="props.totalCards && props.currentCard"
      :currentCard="props.currentCard"
      :totalCards="props.totalCards"
      :isSolved="isCompleted"
      pendingHint="Visionnez tous les coups du PGN pour continuer"
      @next="emit('finished')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import {
  playBackOutline,
  chevronBackOutline,
  chevronForwardOutline,
  playForwardOutline
} from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore } from 'eg-chessboard';
import SeriesCardFooter from '@/components/shared/SeriesCardFooter.vue';

const props = defineProps<{
  pgnString?: string;
  pgn?: string;
  orientation?: 'white' | 'black' | string;
  autoCompleteDelay?: number;
  currentCard?: number;
  totalCards?: number;
  hideEndButton?: boolean;
}>();

const emit = defineEmits<{
  (e: 'finished'): void;
}>();

const boardApi = ref<BoardCore | null>(null);
const currentComment = ref('');
const commentContainerEl = ref<HTMLElement | null>(null);

watch(currentComment, () => {
  nextTick(() => {
    if (commentContainerEl.value) {
      commentContainerEl.value.scrollTop = 0;
    }
  });
});
const isCompleted = ref(false);
const currentPly = ref(0);
const totalPly = ref(0);

const isAtStart = computed(() => !boardApi.value || currentPly.value <= 0);
const isAtEnd = computed(() => !boardApi.value || totalPly.value === 0 || currentPly.value >= totalPly.value);

const activePgn = computed(() => props.pgn || props.pgnString || '');

const syncComment = () => {
  if (boardApi.value) {
    currentComment.value = boardApi.value.getCurrentComment() || '';
  }
};

const syncNavState = () => {
  if (!boardApi.value) {
    currentPly.value = 0;
    totalPly.value = 0;
    return;
  }
  const total = typeof boardApi.value.getCurrentPlyNumber === 'function' ? boardApi.value.getCurrentPlyNumber() : 0;
  totalPly.value = total;

  const historyState = boardApi.value.getHistoryViewerState();
  if (historyState?.isEnabled && historyState.plyViewing !== undefined) {
    currentPly.value = historyState.plyViewing;
  } else {
    currentPly.value = total;
  }
};

const notifyFinishedIfEnd = () => {
  if (!props.totalCards && props.autoCompleteDelay && props.autoCompleteDelay > 0) {
    setTimeout(() => {
      emit('finished');
    }, props.autoCompleteDelay);
  } else if (!props.totalCards) {
    emit('finished');
  }
};

const loadPgnData = async () => {
  if (!boardApi.value) {
    syncNavState();
    return;
  }
  if (activePgn.value) {
    await nextTick();
    boardApi.value.loadPgn(activePgn.value);
    syncComment();
    syncNavState();

    // Forcer le redessin propre des shapes SVG une fois le DOM stabilisé
    setTimeout(() => {
      if (boardApi.value) {
        const shapes = boardApi.value.getShapes();
        if (shapes && shapes.length > 0) {
          boardApi.value.setShapes(shapes);
        }
        boardApi.value.redraw(true);
      }
    }, 50);

    const totalPlyCount = typeof boardApi.value.getCurrentPlyNumber === 'function' ? boardApi.value.getCurrentPlyNumber() : 0;
    if (totalPlyCount === 0) {
      isCompleted.value = true;
      notifyFinishedIfEnd();
    } else {
      isCompleted.value = false;
    }
  } else {
    syncNavState();
  }
};

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  loadPgnData();
};

watch(activePgn, () => {
  loadPgnData();
});

const viewStart = () => {
  if (!boardApi.value || isAtStart.value) return;
  boardApi.value.viewStart();
  syncComment();
  syncNavState();
};

const viewPrevious = () => {
  if (!boardApi.value || isAtStart.value) return;
  boardApi.value.viewPrevious();
  syncComment();
  syncNavState();
};

const viewNext = () => {
  if (!boardApi.value || isAtEnd.value) return;
  const historyStateBefore = boardApi.value.getHistoryViewerState();

  boardApi.value.viewNext();
  syncComment();
  syncNavState();

  const historyStateAfter = boardApi.value.getHistoryViewerState();

  const beforePly = historyStateBefore?.plyViewing;
  const afterPly = historyStateAfter?.plyViewing;
  const total = typeof boardApi.value.getCurrentPlyNumber === 'function' ? boardApi.value.getCurrentPlyNumber() : undefined;
  const isEnd =
    historyStateAfter?.isEnabled === false ||
    (afterPly !== undefined && total !== undefined && afterPly >= total) ||
    (beforePly !== undefined && afterPly !== undefined && beforePly === afterPly);

  if (isEnd) {
    isCompleted.value = true;
    notifyFinishedIfEnd();
  }
};

const viewEnd = () => {
  if (!boardApi.value || isAtEnd.value) return;
  boardApi.value.stopViewingHistory();
  syncComment();
  syncNavState();
  isCompleted.value = true;
  notifyFinishedIfEnd();
};
</script>

<style scoped>
.navigation-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.nav-btn {
  --border-radius: 50%;
  width: 38px;
  height: 38px;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  margin: 0;
}
.nav-btn ion-icon {
  font-size: 1.25rem;
}
.comment-container {
  width: 100%;
  margin-top: 6px;
  background: var(--ion-color-step-100, #f4f5f8);
  border-radius: 6px;
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  padding: 8px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  min-height: 42px;
  max-height: 120px;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
}
.comment-empty {
  visibility: hidden;
  border-left-color: transparent;
  background: transparent;
  box-shadow: none;
  min-height: 42px;
  height: 42px;
}
.comment-text {
  margin: 0;
  width: 100%;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--ion-color-step-800, #333);
  white-space: pre-line;
}
.placeholder-text {
  color: var(--ion-color-step-400, #989aa2);
  font-style: italic;
}
:deep(.main-wrap.viewingHistory) {
  filter: none !important;
}
</style>
