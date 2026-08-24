<template>
  <TheChessboard
    :diagram="normalizedDiagram"
    :board-config="normalizedBoardConfig"
    :player-color="resolvedPlayerColor"
    :mode="mode"
    :stockfish-config="resolvedStockfishConfig"
    :piece-set="props.pieceSet || chessPreferences.pieceSet"
    :board-theme="props.boardTheme || chessPreferences.boardTheme"
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
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted, watch } from 'vue';
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
  coordinates: false,
  autoCastling: true,
  stockfishEnabled: false
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

const normalizedDiagram = computed(() => ({
  fen: props.fen ?? 'start',
  shapes: props.shapes ?? []
}));

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

onUnmounted(() => {
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
  boardApi
});
</script>
