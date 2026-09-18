<template>
  <div
    class="dame-chessboard-wrapper"
    :class="{ 'is-zoomable': props.zoomable }"
    :title="props.zoomable ? 'Appui prolongé pour agrandir ou clic droit' : undefined"
    @touchstart="props.zoomable ? onTouchStart($event) : undefined"
    @touchmove="props.zoomable ? onTouchMove($event) : undefined"
    @touchend="props.zoomable ? onTouchEnd($event) : undefined"
    @touchcancel="props.zoomable ? onTouchEnd($event) : undefined"
    @contextmenu="props.zoomable ? onContextMenu($event) : undefined"
    @mousedown="props.zoomable ? onMouseDown($event) : undefined"
    @mouseup="props.zoomable ? onMouseUp($event) : undefined"
    @mouseleave="props.zoomable ? onMouseLeave() : undefined"
    @click.capture="props.zoomable ? onClickCapture($event) : undefined"
  >
    <TheChessboard
      :diagram="normalizedDiagram"
      :board-config="normalizedBoardConfig"
      :player-color="resolvedPlayerColor"
      :mode="mode"
      :stockfish-config="resolvedStockfishConfig"
      :piece-set="props.pieceSet || chessPreferences.pieceSet"
      :board-theme="props.boardTheme || chessPreferences.boardTheme"
      :fit-container="props.fitContainer"
      @board-created="handleBoardCreated"
      @move="(move: Move) => emit('move', move)"
      @turn-change="(turn: 'white' | 'black', ply: number) => emit('turn-change', turn, ply)"
      @check="(color: string) => emit('check', color)"
      @checkmate="(color: string) => emit('checkmate', color)"
      @stalemate="() => emit('stalemate')"
      @draw="() => emit('draw')"
      @stockfish-hint="(move: string) => emit('stockfish-hint', move)"
      @square-click="(square: string) => emit('square-click', square)"
      @shapes-change="(shapes: DrawShape[]) => emit('shapes-change', shapes)"
      @promotion="(detail: { from: string; to: string; promotedTo: string }) => emit('promotion', detail)"
    />

    <!-- Modale de Zoom Téléportée dans le body -->
    <Teleport to="body">
      <div
        v-if="isZoomOpen"
        class="dame-zoom-overlay"
        @click.stop="closeZoom"
      >
        <div class="dame-zoom-modal" @click.stop>
          <div class="dame-zoom-header">
            <span>Aperçu de la position</span>
            <button
              class="dame-zoom-close-btn"
              type="button"
              aria-label="Fermer"
              @click.stop="closeZoom"
            >
              &times;
            </button>
          </div>
          <div class="dame-zoom-board-container">
            <TheChessboard
              :diagram="normalizedDiagram"
              :board-config="zoomBoardConfig"
              :player-color="resolvedPlayerColor"
              mode="study"
              :piece-set="props.pieceSet || chessPreferences.pieceSet"
              :board-theme="props.boardTheme || chessPreferences.boardTheme"
              @board-created="handleZoomBoardCreated"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { default as TheChessboard } from 'eg-chessboard/vue';
import 'eg-chessboard/style.css';
import type { BoardCore, StockfishConfig, Move, DrawShape } from 'eg-chessboard';
import { useChessPreferencesStore } from '@/stores/chessPreferences';
import type { ChessboardProps, ChessboardEmits, ChessboardConfig } from './types';

const chessPreferences = useChessPreferencesStore();

const props = withDefaults(defineProps<ChessboardProps>(), {
  viewOnly: true,
  orientation: 'white',
  highlightLastMove: false,
  coordinates: true,
  autoCastling: true,
  stockfishEnabled: false,
  zoomable: false,
  fitContainer: false
});

const emit = defineEmits<ChessboardEmits>();

const boardApi = ref<BoardCore | null>(null);

const handleBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  if (props.fen && props.fen !== 'start') {
    api.setPosition(props.fen);
  }
  emit('board-created', api);
};

watch(
  () => props.fen,
  (newFen) => {
    if (boardApi.value && newFen) {
      boardApi.value.setPosition(newFen === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : newFen);
    }
  }
);

watch(
  () => props.shapes,
  (newShapes) => {
    if (boardApi.value && newShapes) {
      boardApi.value.setShapes(newShapes);
    }
  },
  { deep: true }
);

const normalizedDiagram = computed(() => {
  if (props.fen === undefined && props.shapes === undefined) {
    return undefined;
  }
  return {
    fen: props.fen ?? 'start',
    shapes: props.shapes ?? []
  };
});

const normalizedBoardConfig = computed<ChessboardConfig>(() => {
  const baseConfig: ChessboardConfig = {
    orientation: props.orientation,
    viewOnly: props.viewOnly,
    coordinates: props.coordinates,
    autoCastling: props.autoCastling,
    highlight: {
      lastMove: props.highlightLastMove
    }
  };

  if (props.lastMove && props.lastMove.length > 0) {
    baseConfig.lastMove = props.lastMove;
  }

  if (props.boardConfig) {
    return {
      ...baseConfig,
      ...props.boardConfig,
      highlight: {
        ...baseConfig.highlight,
        ...(props.boardConfig.highlight || {})
      }
    };
  }

  return baseConfig;
});

const zoomBoardConfig = computed<ChessboardConfig>(() => ({
  fen: props.fen && props.fen !== 'start' ? props.fen : undefined,
  orientation: props.orientation,
  viewOnly: true,
  coordinates: true,
  autoCastling: false,
  animation: {
    enabled: false
  },
  highlight: {
    lastMove: false
  }
}));

const resolvedPlayerColor = computed(() => {
  if (props.playerColor) {
    return props.playerColor;
  }
  return props.orientation;
});

const resolvedStockfishConfig = computed<StockfishConfig>(() => {
  if (props.stockfishConfig) {
    return props.stockfishConfig;
  }
  if (props.stockfishEnabled) {
    return {
      whiteMode: 'elo',
      blackMode: 'elo'
    };
  }
  return {
    whiteMode: 'disabled',
    blackMode: 'disabled'
  };
});

// ========================================================
// Gestion du Zoom Universel (Appui long / Clic droit)
// ========================================================
const isZoomOpen = ref(false);
const zoomBoardApi = ref<BoardCore | null>(null);
let pressTimer: ReturnType<typeof setTimeout> | null = null;
let touchStartX = 0;
let touchStartY = 0;
let isScrolling = false;
let isLongPressTriggered = false;
let clickSuppressionTimer: ReturnType<typeof setTimeout> | null = null;

const openZoom = () => {
  isZoomOpen.value = true;
};

const closeZoom = () => {
  isZoomOpen.value = false;
  if (zoomBoardApi.value && typeof zoomBoardApi.value.destroy === 'function') {
    try {
      zoomBoardApi.value.destroy();
    } catch {
      // Nettoyage sécurisé
    }
    zoomBoardApi.value = null;
  }
};

const handleZoomBoardCreated = (api: BoardCore) => {
  zoomBoardApi.value = api;
  if (props.shapes && props.shapes.length > 0) {
    api.setShapes(props.shapes);
  }
  api.redraw(true);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isZoomOpen.value) {
    closeZoom();
  }
};

const onTouchStart = (event: TouchEvent) => {
  isScrolling = false;
  if (event.touches.length > 0) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    if (!isScrolling) {
      isLongPressTriggered = true;
      openZoom();
    }
  }, 500);
};

const onTouchMove = (event: TouchEvent) => {
  if (event.touches.length > 0) {
    const diffX = Math.abs(event.touches[0].clientX - touchStartX);
    const diffY = Math.abs(event.touches[0].clientY - touchStartY);
    if (diffX > 10 || diffY > 10) {
      isScrolling = true;
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }
  }
};

const onTouchEnd = (event?: TouchEvent) => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  if (isLongPressTriggered) {
    if (event && event.cancelable) {
      event.preventDefault();
    }
    if (clickSuppressionTimer) clearTimeout(clickSuppressionTimer);
    clickSuppressionTimer = setTimeout(() => {
      isLongPressTriggered = false;
    }, 350);
  }
};

const onMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return; // Uniquement clic gauche pour le timer d'appui long
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    isLongPressTriggered = true;
    openZoom();
  }, 500);
};

const onMouseUp = (event: MouseEvent) => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  if (isLongPressTriggered) {
    event.preventDefault();
    event.stopPropagation();
    if (clickSuppressionTimer) clearTimeout(clickSuppressionTimer);
    clickSuppressionTimer = setTimeout(() => {
      isLongPressTriggered = false;
    }, 350);
  }
};

const onMouseLeave = () => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
};

const onContextMenu = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  openZoom();
};

const onClickCapture = (event: MouseEvent) => {
  if (isLongPressTriggered) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (pressTimer) clearTimeout(pressTimer);
  if (clickSuppressionTimer) clearTimeout(clickSuppressionTimer);
  if (zoomBoardApi.value && typeof zoomBoardApi.value.destroy === 'function') {
    try {
      zoomBoardApi.value.destroy();
    } catch {
      // Nettoyage sécurisé
    }
    zoomBoardApi.value = null;
  }
  if (boardApi.value && typeof boardApi.value.destroy === 'function') {
    try {
      boardApi.value.destroy();
    } catch {
      // Nettoyage sécurisé
    }
    boardApi.value = null;
  }
});

defineExpose({
  boardApi,
  openZoom,
  closeZoom
});
</script>

<style scoped>
.dame-chessboard-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: block;
}

.dame-chessboard-wrapper.is-zoomable {
  cursor: zoom-in;
  touch-action: pan-y;
}

/* Modal de Zoom Téléportée */
.dame-zoom-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.dame-zoom-modal {
  background: var(--ion-card-background, #ffffff);
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.38);
  width: 90%;
  max-width: 440px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: zoomModalFadeIn 0.18s ease-out;
}

@keyframes zoomModalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dame-zoom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: var(--ion-color-step-100, #f4f5f8);
  font-weight: 600;
  font-size: 1rem;
  color: var(--ion-color-dark, #222222);
  border-bottom: 1px solid var(--ion-color-step-200, #e0e0e0);
}

.dame-zoom-close-btn {
  background: transparent;
  border: none;
  font-size: 1.8rem;
  color: var(--ion-color-step-600, #666666);
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.15s ease;
}

.dame-zoom-close-btn:hover {
  color: var(--ion-color-dark, #111111);
}

.dame-zoom-board-container {
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 16px;
  box-sizing: border-box;
}
</style>
