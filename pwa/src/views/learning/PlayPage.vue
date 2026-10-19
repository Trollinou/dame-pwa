<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/apprentissage"></ion-back-button>
        </ion-buttons>
        <ion-title>Partie d'Échecs</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="!boardConfig.viewOnly && currentPly > 0"
            color="danger"
            fill="clear"
            title="Abandonner la partie"
            @click="confirmResign"
          >
            <ion-icon slot="icon-only" :icon="flagOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
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
                @engine-status="handleEngineStatus"
                @evaluation="handleEvaluation"
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
            :engine-status="engineStatus"
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
import { computed, onMounted, onUnmounted, provide, defineAsyncComponent } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonBackButton,
  IonSpinner,
  IonIcon,
  alertController,
  onIonViewWillLeave
} from '@ionic/vue';
import { flagOutline } from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import type { StockfishConfig, BoardCore } from 'eg-chessboard';
import { useAuthStore } from '@/stores/auth';
import { useChessStore } from '@/stores/chess';
import { useBoardOrientation } from '@/composables/learning/play/useBoardOrientation';
import { usePlayGame } from '@/composables/learning/play/usePlayGame';
import { getStockfishUrls, getNodesForElo } from '@/utils/chess/stockfish';
import PlayInfoBar from '@/components/learning/play/PlayInfoBar.vue';
import PlayActionsPanel from '@/components/learning/play/PlayActionsPanel.vue';

const PlaySettingsModal = defineAsyncComponent(() => import('@/components/learning/play/PlaySettingsModal.vue'));

const authStore = useAuthStore();
const chessStore = useChessStore();

const { isLandscape, renderKey } = useBoardOrientation();

const {
  getBoardApi,
  setBoardApi,
  engineLoaded,
  engineStatus,
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
  requestHintForPlayer,
  resetHelpState,
  resetGameStartTime,
  toggleHint,
  handleStockfishHint,
  handleEngineStatus,
  handleEvaluation,
  handleShapesChange,
  goToAnalysis,
  refreshDisplay,
  undoMove,
  handleCheck,
  handleGameOver,
  resignGame,
} = usePlayGame();

provide('gameSettings', gameSettings);

const stockfishConfig = computed<StockfishConfig>(() => {
  const urls = getStockfishUrls();
  if (gameSettings.gameMode === '2players') {
    return {
      whiteMode: 'disabled',
      blackMode: 'disabled',
      workerUrl: urls.workerUrl,
      wasmUrl: urls.wasmUrl,
    };
  }

  const playerCol = boardConfig.orientation;
  const nodes = getNodesForElo(gameSettings.level);
  const moveTime = Math.round(gameSettings.level * 1.2);

  return {
    whiteMode: playerCol === 'white' ? 'disabled' : 'elo',
    whiteElo: playerCol === 'black' ? gameSettings.level : undefined,
    blackMode: playerCol === 'black' ? 'disabled' : 'elo',
    blackElo: playerCol === 'white' ? gameSettings.level : undefined,
    stockfishMoveTime: moveTime,
    showWdl: true,
    searchLimit: {
      nodes,
      movetime: moveTime,
    },
    workerUrl: urls.workerUrl,
    wasmUrl: urls.wasmUrl,
  };
});

const handleBoardCreated = (api: BoardCore) => {
  setBoardApi(api);
};

const handleMove = () => {
  const api = getBoardApi();
  if (!api) return;

  refreshDisplay();

  lastSuggestedMove.value = '';
  api.hideMoves();

  chessStore.saveGame(
    api.getPgn(),
    boardConfig.orientation,
    gameSettings.level,
    helpCount.value,
    oupsCount.value
  );

  if (gameStatus.color === 'warning') {
    gameStatus.message = '';
    gameStatus.color = 'medium';
  }

  // Dès qu'un coup est joué, si l'aide est active comme commutateur permanent
  // et que c'est au tour du joueur humain, on calcule le conseil pour le nouveau coup
  if (isHintEnabled.value) {
    requestHintForPlayer();
  }
};

const confirmResign = async () => {
  const alert = await alertController.create({
    header: 'Abandonner la partie ?',
    message:
      currentPly.value >= 30
        ? 'La partie sera enregistrée comme abandonnée dans votre historique (au moins 15 coups complets joués).'
        : 'La partie est trop courte (< 15 coups complets) pour être enregistrée.',
    buttons: [
      {
        text: 'Continuer',
        role: 'cancel',
      },
      {
        text: 'Abandonner',
        role: 'destructive',
        handler: () => {
          resignGame();
        },
      },
    ],
  });
  await alert.present();
};

const resetGame = () => {
  showSettings.value = true;
};

const startNewGame = () => {
  // Si une partie à 1 joueur était active avec au moins 30 ply, l'enregistrer comme abandonnée avant réinitialisation
  if (
    ! boardConfig.viewOnly &&
    currentPly.value >= 30 &&
    gameSettings.gameMode === '1player'
  ) {
    handleGameOver( 'resigned' );
  }

  const api = getBoardApi();
  if (api) {
    api.cancelReview();
    api.newGame();
  }
  resetGameStartTime();

  showSettings.value = false;
  gameStatus.message = '';
  gameStatus.color = 'medium';
  boardConfig.viewOnly = false;

  oupsCount.value = 0;
  helpCount.value = 0;
  resetHelpState();

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

  if (isHintEnabled.value) {
    setTimeout(() => {
      requestHintForPlayer();
    }, 100);
  }
};

onMounted(() => {
  const savedLevel = localStorage.getItem('dame_pwa_play_elo');
  if (savedLevel) {
    const parsed = parseInt(savedLevel, 10);
    if (!isNaN(parsed) && parsed >= 1320 && parsed <= 3190) {
      gameSettings.level = parsed;
    }
  } else if (authStore.selectedIdentity?.elo_rapide) {
    const eloRaw = String(authStore.selectedIdentity.elo_rapide);
    const match = eloRaw.match(/\d+/);
    const eloNum = match ? parseInt(match[0], 10) : 1320;
    gameSettings.level = isNaN(eloNum) || eloNum < 1320 ? 1320 : eloNum > 3190 ? 3190 : eloNum;
  } else {
    gameSettings.level = 1320;
  }
  engineLoaded.value = true;
  void chessStore.syncPendingGames();
});

onUnmounted(() => {
  const api = getBoardApi();
  if (api) {
    api.cancelReview();
    api.stopLiveAnalysis();
  }
});

onIonViewWillLeave(() => {
  const api = getBoardApi();
  if (api) {
    api.cancelReview();
    api.stopLiveAnalysis();
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});
</script>
