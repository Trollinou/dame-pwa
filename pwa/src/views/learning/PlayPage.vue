<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/apprentissage"></ion-back-button>
        </ion-buttons>
        <ion-title>Partie d'Échecs</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" :scroll-y="false" class="ion-padding">
      <div class="game-layout safe-area-wrapper" :class="{ 'landscape-wrapper': isLandscape }">
        <!-- Carte d'Information Style Exercice -->
        <PlayInfoBar
          v-if="engineLoaded"
          :player-name="authStore.selectedIdentity?.firstname || 'Adhérent'"
          :level="gameSettings.level"
          :game-mode="gameSettings.gameMode"
        />

        <div class="main-container" :class="{ 'landscape-mode': isLandscape }">
          <div class="board-section">
            <div class="board-container">
              <Chessboard
                v-if="engineLoaded"
                :key="`board-${isLandscape ? 'l' : 'p'}-${renderKey}`"
                :board-config="boardConfig"
                :player-color="boardConfig.playerColor"
                :stockfish-config="stockfishConfig"
                @board-created="handleBoardCreated"
                @move="handleMove"
                @turn-change="(turn, ply) => { turnColor = turn; currentPly = ply; }"
                @check="handleCheck"
                @checkmate="() => handleGameOver('checkmate')"
                @stalemate="() => handleGameOver('stalemate')"
                @draw="() => handleGameOver('draw')"
                @stockfish-hint="handleStockfishHint"
                @shapes-change="handleShapesChange"
              />
            </div>
          </div>

          <!-- Panneau d'actions & statuts -->
          <PlayActionsPanel
            v-if="engineLoaded"
            :is-landscape="isLandscape"
            :game-status-message="gameStatus.message"
            :game-status-color="gameStatus.color"
            :turn-color="turnColor"
            :is-hint-enabled="isHintEnabled"
            :help-count="helpCount"
            :oups-count="oupsCount"
            :view-only="boardConfig.viewOnly"
            :game-mode="gameSettings.gameMode"
            @reset-game="resetGame"
            @toggle-hint="toggleHint"
            @undo-move="undoMove"
            @go-to-analysis="goToAnalysis"
          />

          <div v-if="!engineLoaded" class="ion-text-center ion-padding board-section">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Initialisation de l'IA...</p>
          </div>
        </div>

        <!-- Modal de réglages -->
        <PlaySettingsModal
          v-model:is-open="showSettings"
          @start-game="startNewGame"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, provide } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
  onIonViewWillLeave
} from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type { StockfishConfig, BoardCore, Move } from 'eg-chessboard';
import { useAuthStore } from '@/stores/auth';
import { useChessStore } from '@/stores/chess';
import { useBoardOrientation } from '@/composables/play/useBoardOrientation';
import { usePlayGame } from '@/composables/play/usePlayGame';
import PlayInfoBar from '@/components/play/PlayInfoBar.vue';
import PlayActionsPanel from '@/components/play/PlayActionsPanel.vue';
import PlaySettingsModal from '@/components/play/PlaySettingsModal.vue';

const authStore = useAuthStore();
const chessStore = useChessStore();

const { isLandscape, renderKey } = useBoardOrientation();

const {
  getBoardApi,
  setBoardApi,
  engineLoaded,
  showSettings,
  isHintEnabled,
  currentPly,
  turnColor,
  oupsCount,
  helpCount,
  lastSuggestedMove,
  gameStatus,
  gameSettings,
  boardConfig,
  toggleHint,
  handleStockfishHint,
  handleShapesChange,
  goToAnalysis,
  refreshDisplay,
  undoMove,
  handleCheck,
  handleGameOver,
} = usePlayGame();

provide('gameSettings', gameSettings);

const getWorkerUrl = () => {
  if (import.meta.env.DEV) {
    return '/stockfish/stockfish.js';
  }
  const base = import.meta.env.BASE_URL || './';
  return new URL(`${base}stockfish/stockfish.js`, window.location.href).href;
};

const getWasmUrl = () => {
  if (import.meta.env.DEV) {
    return '/stockfish/stockfish.wasm';
  }
  const base = import.meta.env.BASE_URL || './';
  return new URL(`${base}stockfish/stockfish.wasm`, window.location.href).href;
};

const stockfishConfig = computed<StockfishConfig>(() => {
  if (gameSettings.gameMode === '2players') {
    return {
      whiteMode: 'disabled',
      blackMode: 'disabled',
      workerUrl: getWorkerUrl(),
      wasmUrl: getWasmUrl(),
    };
  }

  const playerCol = boardConfig.orientation;
  const moveTime = Math.round(gameSettings.level * 1.4);

  return {
    whiteMode: playerCol === 'white' ? 'hint' : 'elo',
    whiteElo: playerCol === 'black' ? gameSettings.level : undefined,
    blackMode: playerCol === 'black' ? 'hint' : 'elo',
    blackElo: playerCol === 'white' ? gameSettings.level : undefined,
    stockfishMoveTime: moveTime,
    workerUrl: getWorkerUrl(),
    wasmUrl: getWasmUrl(),
  };
});

const handleBoardCreated = (api: BoardCore) => {
  setBoardApi(api);
};

const handleMove = (moveInfo?: Move) => {
  const api = getBoardApi();
  if (!api) return;

  refreshDisplay();

  if (moveInfo && lastSuggestedMove.value && isHintEnabled.value) {
    const playedMove = moveInfo.from + moveInfo.to;
    if (playedMove === lastSuggestedMove.value) {
      helpCount.value++;
    }
  }

  chessStore.saveGame(
    api.getPgn(),
    boardConfig.orientation,
    gameSettings.level,
    helpCount.value,
    oupsCount.value
  );

  lastSuggestedMove.value = '';
  api.hideMoves();

  if (gameStatus.color === 'warning') {
    gameStatus.message = '';
    gameStatus.color = 'medium';
  }
};

const resetGame = () => {
  showSettings.value = true;
};

const startNewGame = () => {
  showSettings.value = false;
  gameStatus.message = '';
  gameStatus.color = 'medium';
  boardConfig.viewOnly = false;

  oupsCount.value = 0;
  helpCount.value = 0;
  lastSuggestedMove.value = '';

  chessStore.clearGame();

  let finalColor: 'white' | 'black' = 'white';
  if (gameSettings.playerColor === 'random') {
    finalColor = Math.random() > 0.5 ? 'white' : 'black';
  } else {
    finalColor = gameSettings.playerColor;
  }
  boardConfig.orientation = finalColor;

  if (gameSettings.gameMode === '2players') {
    boardConfig.playerColor = 'both';
    boardConfig.movable.color = 'both';
  } else {
    boardConfig.playerColor = finalColor;
    boardConfig.movable.color = finalColor;
    // Persistance du niveau sélectionné
    localStorage.setItem('dame_pwa_play_elo', String(gameSettings.level));
  }
  renderKey.value++;
};

onMounted(() => {
  const savedLevel = localStorage.getItem('dame_pwa_play_elo');
  if (savedLevel) {
    const parsed = parseInt(savedLevel, 10);
    if (!isNaN(parsed) && parsed >= 1320 && parsed <= 2800) {
      gameSettings.level = parsed;
    }
  } else if (authStore.selectedIdentity?.elo_rapide) {
    const eloRaw = String(authStore.selectedIdentity.elo_rapide);
    const match = eloRaw.match(/\d+/);
    const eloNum = match ? parseInt(match[0], 10) : 1320;
    gameSettings.level = isNaN(eloNum) || eloNum < 1320 ? 1320 : eloNum > 2800 ? 2800 : eloNum;
  } else {
    gameSettings.level = 1320;
  }
  engineLoaded.value = true;
});

onIonViewWillLeave(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});
</script>
