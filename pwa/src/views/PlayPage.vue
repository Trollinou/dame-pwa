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
      <div class="game-layout safe-area-wrapper">
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
              <TheChessboard
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
import TheChessboard from 'eg-chessboard/vue';
import 'eg-chessboard/style.css';
import type { StockfishConfig } from 'eg-chessboard';
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

const handleBoardCreated = (api: any) => {
  setBoardApi(api);
};

const handleMove = (moveInfo?: any) => {
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

  const api = getBoardApi();
  if (api) {
    api.resetBoard();
    refreshDisplay();
  }
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

<style scoped>
.safe-area-wrapper {
  max-width: 600px;
  margin: 0 auto;
}

.game-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: flex-start;
  overflow: hidden;
}

.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  margin: 0 auto;
}

.main-container.landscape-mode {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 20px;
  max-width: 100%;
}

.board-section {
  display: block;
  width: 100%;
  padding: 6px 0 10px 0;
}

.landscape-mode .board-section {
  flex: 0 0 auto;
  width: auto;
  padding: 0;
}

.board-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  flex-shrink: 0;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.board-wrapper-with-bar {
  width: 100%;
  position: relative;
}

@media (min-width: 768px) and (orientation: portrait) {
  .board-container {
    max-width: min(680px, 58vh);
  }

  .board-section {
    padding: 14px 0;
  }
}

.landscape-mode :deep(.main-wrap) {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.landscape-mode .board-container {
  width: min(65vh, 48vw) !important;
  max-width: 100%;
  margin: 0 auto !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
}
</style>
