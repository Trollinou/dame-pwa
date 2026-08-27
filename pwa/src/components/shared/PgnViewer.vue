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
      <ion-button fill="outline" color="primary" class="nav-btn" @click="viewStart" title="Début">
        <ion-icon slot="icon-only" :icon="playBackOutline"></ion-icon>
      </ion-button>
      <ion-button fill="outline" color="primary" class="nav-btn" @click="viewPrevious" title="Précédent">
        <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
      </ion-button>
      <ion-button fill="outline" color="primary" class="nav-btn" @click="viewNext" title="Suivant">
        <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
      </ion-button>
      <ion-button fill="outline" color="primary" class="nav-btn" @click="viewEnd" title="Fin">
        <ion-icon slot="icon-only" :icon="playForwardOutline"></ion-icon>
      </ion-button>
    </div>

    <!-- Comment Display -->
    <div class="comment-container">
      <p class="comment-text" :class="{ 'placeholder-text': !currentComment }">
        {{ currentComment ? '💬 ' + currentComment : 'Aucun commentaire pour cette position.' }}
      </p>
    </div>

    <!-- Footer de Navigation par Carte (optionnel si en série) -->
    <SeriesCardFooter
      v-if="props.totalCards && props.totalCards > 1 && props.currentCard"
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
}>();

const emit = defineEmits<{
  (e: 'finished'): void;
}>();

const boardApi = ref<BoardCore | null>(null);
const currentComment = ref('');
const isCompleted = ref(false);

const activePgn = computed(() => props.pgn || props.pgnString || '');

const syncComment = () => {
  if (boardApi.value) {
    currentComment.value = boardApi.value.getCurrentComment() || '';
  }
};

const loadPgnData = async () => {
  if (boardApi.value && activePgn.value) {
    await nextTick();
    boardApi.value.loadPgn(activePgn.value);
    syncComment();

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

    const historyState = boardApi.value.getHistoryViewerState();
    if (!historyState?.isEnabled) {
      isCompleted.value = true;
    } else {
      isCompleted.value = false;
    }
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
  if (boardApi.value) {
    boardApi.value.viewStart();
    syncComment();
  }
};

const viewPrevious = () => {
  if (boardApi.value) {
    boardApi.value.viewPrevious();
    syncComment();
  }
};

const viewNext = () => {
  if (!boardApi.value) return;
  const historyStateBefore = boardApi.value.getHistoryViewerState();

  boardApi.value.viewNext();
  syncComment();

  const historyStateAfter = boardApi.value.getHistoryViewerState();

  const beforePly = historyStateBefore?.plyViewing;
  const afterPly = historyStateAfter?.plyViewing;
  const isEnd =
    historyStateAfter?.isEnabled === false ||
    (beforePly !== undefined && afterPly !== undefined && beforePly === afterPly);

  if (isEnd) {
    isCompleted.value = true;
    if (!props.totalCards && props.autoCompleteDelay && props.autoCompleteDelay > 0) {
      setTimeout(() => {
        emit('finished');
      }, props.autoCompleteDelay);
    } else if (!props.totalCards) {
      emit('finished');
    }
  }
};

const viewEnd = () => {
  if (boardApi.value) {
    boardApi.value.stopViewingHistory();
    syncComment();
    isCompleted.value = true;
  }
};
</script>

<style scoped>
.navigation-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}
.nav-btn {
  --border-radius: 50%;
  width: 48px;
  height: 48px;
}
.comment-container {
  width: 100%;
  margin-top: 12px;
  background: var(--ion-color-step-100, #f4f5f8);
  border-radius: 8px;
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  height: 72px;
  overflow-y: auto;
}
.comment-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.4;
  color: var(--ion-color-step-800, #444);
}
.placeholder-text {
  color: var(--ion-color-step-400, #989aa2);
  font-style: italic;
}
:deep(.main-wrap.viewingHistory) {
  filter: none !important;
}
</style>
