<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/play"></ion-back-button>
        </ion-buttons>
        <ion-title>Analyse de la partie</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" :scroll-y="false" class="ion-padding">
      <div class="analysis-layout safe-area-wrapper" :class="{ 'landscape-wrapper': isLandscape }">
        <!-- Carte d'information méta -->
        <div class="dame-meta-card" v-if="isReady">
          <div class="meta-main">
            <div class="meta-left">
              <h2 class="player-title">Revue de partie</h2>
              <p class="game-type-subtitle">
                <template v-if="gameReviewReport">
                  Précision : Blancs {{ gameReviewReport.accuracy.white }}% • Noirs {{ gameReviewReport.accuracy.black }}%
                </template>
                <template v-else>
                  Historique coup par coup // {{ historyMoves.length }} tours joués
                </template>
              </p>
            </div>
            <div class="meta-right">
              <span class="ply-badge">
                Coup {{ currentPly }} / {{ totalPlyCount }}
              </span>
              <span
                v-if="isLiveAnalysis && currentEvaluation"
                class="eval-badge"
                :class="{ 'is-white': (currentEvaluation.whiteScoreValue ?? 0) >= 0, 'is-black': (currentEvaluation.whiteScoreValue ?? 0) < 0 }"
              >
                {{ formatEvaluationScore(currentEvaluation) }}
              </span>
            </div>
          </div>
        </div>

        <div class="main-container" :class="{ 'landscape-mode': isLandscape }">
          <div class="board-section">
            <div class="board-wrapper-with-eval">
              <!-- Barre d'évaluation Stockfish 19 -->
              <div v-if="isLiveAnalysis && currentEvaluation" class="analysis-eval-bar-container">
                <div class="analysis-eval-bar">
                  <div class="analysis-eval-fill" :style="{ '--eval-percent': `${evalBarPercent}%` }"></div>
                </div>
                <div class="analysis-eval-label">
                  {{ formatEvaluationScore(currentEvaluation) }}
                </div>
              </div>

              <div class="board-container">
                <!-- Échiquier (Mode Lecture Seule) -->
                <Chessboard 
                  v-if="isReady"
                  :key="`board-${isLandscape ? 'l' : 'p'}-${renderKey}`"
                  :board-config="boardConfig"
                  :stockfish-config="analysisStockfishConfig"
                  @board-created="handleBoardCreated"
                  @move="handleMove"
                  @evaluation="handleEvaluation"
                  @engine-status="handleEngineStatus"
                  @stockfish-hint="handleStockfishHint"
                />
              </div>
            </div>
          </div>

          <!-- Section Historique et Navigation -->
          <div class="side-section" v-if="isReady">
            <div class="analysis-controls">
              <!-- Actions d'analyse Stockfish 19 -->
              <div class="analysis-actions-toolbar">
                <ion-button
                  expand="block"
                  :fill="isLiveAnalysis ? 'solid' : 'outline'"
                  :color="isLiveAnalysis ? 'success' : 'primary'"
                  @click="toggleLiveAnalysis"
                >
                  <ion-icon slot="start" :icon="isLiveAnalysis ? pauseOutline : playOutline"></ion-icon>
                  <span>{{ isLiveAnalysis ? 'Stop' : 'Éval direct' }}</span>
                </ion-button>

                <ion-button
                  expand="block"
                  fill="outline"
                  color="secondary"
                  @click="requestHint"
                >
                  <ion-icon slot="start" :icon="bulbOutline"></ion-icon>
                  <span>Conseil</span>
                </ion-button>

                <ion-button
                  expand="block"
                  fill="outline"
                  color="tertiary"
                  :disabled="isReviewing || historyMoves.length === 0"
                  @click="startReview"
                >
                  <ion-icon slot="start" :icon="ribbonOutline"></ion-icon>
                  <span>Bilan</span>
                </ion-button>
              </div>

              <!-- Progression de la revue post-mortem -->
              <div v-if="isReviewing" class="analysis-review-progress">
                <div class="review-progress-text">
                  <span>Revue en cours...</span>
                  <span>{{ reviewProgress }}%</span>
                </div>
                <ion-progress-bar :value="reviewProgress / 100"></ion-progress-bar>
              </div>

              <!-- Variante PV -->
              <div
                v-if="isLiveAnalysis && currentEvaluation && currentEvaluation.pv && currentEvaluation.pv.length > 0"
                class="analysis-pv-info"
              >
                <strong>Meilleure suite :</strong> {{ currentEvaluation.pv.slice(0, 5).join(' ') }}
              </div>

              <div class="history-controls">
                <!-- Navigation toolbar -->
                <ion-grid class="ion-no-padding">
                  <ion-row>
                    <ion-col size="3">
                      <ion-button fill="clear" @click="viewFirst">
                        <ion-icon slot="icon-only" :icon="playBackOutline"></ion-icon>
                      </ion-button>
                    </ion-col>
                    <ion-col size="3">
                      <ion-button fill="clear" @click="viewPrev">
                        <ion-icon slot="icon-only" :icon="chevronBackOutline"></ion-icon>
                      </ion-button>
                    </ion-col>
                    <ion-col size="3">
                      <ion-button fill="clear" @click="viewNext">
                        <ion-icon slot="icon-only" :icon="chevronForwardOutline"></ion-icon>
                      </ion-button>
                    </ion-col>
                    <ion-col size="3">
                      <ion-button fill="clear" @click="viewLast">
                        <ion-icon slot="icon-only" :icon="playForwardOutline"></ion-icon>
                      </ion-button>
                    </ion-col>
                  </ion-row>
                </ion-grid>

                <!-- Historique structuré en tableau -->
                <div class="move-history-container" ref="historyScrollContainer">
                  <div class="move-table">
                    <div v-for="(row, rIdx) in groupedHistory" :key="rIdx" class="move-table-row">
                      <div v-for="move in row" :key="move.number" class="move-group">
                        <span class="move-num">{{ move.number }}.</span>
                        <span 
                          :class="['move-san', { 'active-move': move.white.ply === currentPly }]"
                          @click="viewPly(move.white.ply)"
                        >
                          <span v-safe-html="formatSan(move.white.san)"></span>
                          <span
                            v-if="judgementsMap.get(move.white.ply)"
                            :class="['judgement-badge', judgementConfig[judgementsMap.get(move.white.ply)!].class]"
                          >{{ judgementConfig[judgementsMap.get(move.white.ply)!].symbol }}</span>
                        </span>
                        <span 
                          v-if="move.black"
                          :class="['move-san', { 'active-move': move.black.ply === currentPly }]"
                          @click="viewPly(move.black.ply)"
                        >
                          <span v-safe-html="formatSan(move.black.san)"></span>
                          <span
                            v-if="judgementsMap.get(move.black.ply)"
                            :class="['judgement-badge', judgementConfig[judgementsMap.get(move.black.ply)!].class]"
                          >{{ judgementConfig[judgementsMap.get(move.black.ply)!].symbol }}</span>
                        </span>
                        <span v-else class="move-san empty"></span>
                      </div>
                      <!-- Cellules fantômes pour garder l'alignement sur la dernière ligne -->
                      <div 
                        v-for="i in (movesPerRow - row.length)" 
                        :key="'empty-' + i" 
                        class="move-group empty-group"
                      ></div>
                    </div>
                    <div v-if="historyMoves.length === 0" class="status-placeholder">
                      Aucun coup à analyser.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonProgressBar,
  onIonViewWillLeave
} from '@ionic/vue';
import { 
  playBackOutline, 
  chevronBackOutline, 
  chevronForwardOutline, 
  playForwardOutline,
  playOutline,
  pauseOutline,
  bulbOutline,
  ribbonOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted, reactive, watch, computed } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type {
  BoardCore,
  StockfishConfig,
  StockfishEvaluation,
  EngineStatus,
  GameReviewReport,
  MoveJudgement
} from 'eg-chessboard';
import {
  getStockfishUrls,
  formatEvaluationScore,
  computeEvalBarPercentage
} from '@/utils/chess/stockfish';
import { useChessStore } from '@/stores/chess';

export interface HistoryMoveItem {
  number: number;
  white: { san: string; ply: number };
  black: { san: string; ply: number } | null;
}

const chessStore = useChessStore();
let boardApi: BoardCore | null = null;
const isReady = ref(false);
const currentPly = ref(0);
const historyMoves = ref<HistoryMoveItem[]>([]);
const historyScrollContainer = ref<HTMLElement | null>(null);

const isLandscape = ref(window.innerWidth > window.innerHeight);
const renderKey = ref(0);
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

const updateOrientation = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    isLandscape.value = window.innerWidth > window.innerHeight;
    renderKey.value++;
  }, 200);
};

const boardConfig = reactive({
  coordinates: true,
  orientation: chessStore.orientation,
  viewOnly: true,
});

const isLiveAnalysis = ref(false);
const currentEvaluation = ref<StockfishEvaluation | null>(null);
const engineStatus = ref<EngineStatus>('uninitialized');
const isReviewing = ref(false);
const reviewProgress = ref(0);
const gameReviewReport = ref<GameReviewReport | null>(null);

const evalBarPercent = computed(() => {
  if (!currentEvaluation.value) return 50;
  const ev = currentEvaluation.value;
  const turn = boardApi ? boardApi.getTurnColor() : 'white';
  return computeEvalBarPercentage(turn, ev.scoreType, ev.scoreValue, ev.wdl);
});

const analysisStockfishConfig = computed<StockfishConfig>(() => {
  const urls = getStockfishUrls();
  return {
    whiteMode: 'disabled',
    blackMode: 'disabled',
    multiPv: 1,
    showWdl: true,
    workerUrl: urls.workerUrl,
    wasmUrl: urls.wasmUrl,
  };
});

const judgementsMap = computed(() => {
  const map = new Map<number, MoveJudgement>();
  if (gameReviewReport.value?.moves) {
    for (const m of gameReviewReport.value.moves) {
      map.set(m.ply, m.judgement);
    }
  }
  return map;
});

const judgementConfig: Record<MoveJudgement, { symbol: string; class: string }> = {
  brilliant: { symbol: '!!', class: 'judgement-brilliant' },
  best: { symbol: '★', class: 'judgement-best' },
  excellent: { symbol: '✓', class: 'judgement-excellent' },
  good: { symbol: '•', class: 'judgement-good' },
  inaccuracy: { symbol: '?!', class: 'judgement-inaccuracy' },
  mistake: { symbol: '?', class: 'judgement-mistake' },
  blunder: { symbol: '??', class: 'judgement-blunder' },
  missed_win: { symbol: '✗', class: 'judgement-missed-win' },
};

/**
 * Formate un coup SAN avec symbole de pièce agrandi
 */
const formatSan = (san: string) => {
  const symbols: Record<string, string> = {
    'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞'
  };
  return san.replace(/([KQRBN])/g, (match) => `<span class="chess-piece-symbol">${symbols[match]}</span>`);
};

/**
 * Organise l'historique brut en liste structurée
 */
const updateMoveHistory = () => {
  if (!boardApi) return;
  const rawHistory = boardApi.getHistory();
  const getSan = (item: string | { san: string }): string =>
    typeof item === 'string' ? item : item.san;
  const moves: HistoryMoveItem[] = [];
  for (let i = 0; i < rawHistory.length; i += 2) {
    const whiteMove = rawHistory[i];
    const blackMove = rawHistory[i + 1];
    moves.push({
      number: Math.floor(i / 2) + 1,
      white: { san: getSan(whiteMove), ply: i + 1 },
      black: blackMove ? { san: getSan(blackMove), ply: i + 2 } : null
    });
  }
  historyMoves.value = moves;
};

const totalPlyCount = computed(() => {
  if (!boardApi) return 0;
  const rawHistory = boardApi.getHistory();
  return rawHistory ? rawHistory.length : 0;
});

/**
 * Nombre de colonnes (tours) par ligne
 */
const movesPerRow = computed(() => isLandscape.value ? 2 : 3);

/**
 * Groupe les coups pour l'affichage en tableau (économise de l'espace vertical)
 */
const groupedHistory = computed(() => {
  const groups = [];
  for (let i = 0; i < historyMoves.value.length; i += movesPerRow.value) {
    groups.push(historyMoves.value.slice(i, i + movesPerRow.value));
  }
  return groups;
});

/**
 * Scroll automatique du conteneur d'historique lors du changement de coup
 */
watch(currentPly, () => {
  setTimeout(() => {
    if (historyScrollContainer.value) {
      const activeEl = historyScrollContainer.value.querySelector('.active-move') as HTMLElement;
      if (activeEl) {
        const container = historyScrollContainer.value;
        
        // Calcul plus robuste utilisant getBoundingClientRect
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        
        // Calcule la position relative de l'élément par rapport au conteneur
        const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
        
        // Centre l'élément dans le conteneur
        const topPos = relativeTop - (container.clientHeight / 2) + (activeRect.height / 2);
        
        container.scrollTo({ top: topPos, behavior: 'smooth' });
      }
    }
  }, 100);
});

/**
 * Met à jour les informations d'affichage réactives
 */
const refreshDisplay = () => {
  if (boardApi) {
    currentPly.value = boardApi.getCurrentPlyNumber();
    updateMoveHistory();
  }
};

const viewPly = (ply: number) => {
  boardApi?.viewHistory(ply);
  currentPly.value = ply;
};

const handleBoardCreated = (api: BoardCore) => {
  boardApi = api;
  if (chessStore.currentPgn) {
    boardApi.loadPgn(chessStore.currentPgn);
  }
  refreshDisplay();
};

/**
 * Nécessaire pour mettre à jour lors de la navigation
 */
const handleMove = () => {
  refreshDisplay();
};

const viewFirst = () => { 
  boardApi?.viewHistory(0); 
  currentPly.value = 0; 
};

const viewPrev = () => { 
  boardApi?.viewPrevious(); 
  if (currentPly.value > 0) currentPly.value--; 
};

const viewNext = () => { 
  boardApi?.viewNext(); 
  if (boardApi && currentPly.value < boardApi.getCurrentPlyNumber()) {
    currentPly.value++;
  }
};

const viewLast = () => { 
  boardApi?.stopViewingHistory(); 
  if (boardApi) currentPly.value = boardApi.getCurrentPlyNumber(); 
};

const toggleLiveAnalysis = () => {
  if (!boardApi) return;
  isLiveAnalysis.value = !isLiveAnalysis.value;
  if (isLiveAnalysis.value) {
    boardApi.startLiveAnalysis();
  } else {
    boardApi.stopLiveAnalysis();
    currentEvaluation.value = null;
  }
};

const requestHint = () => {
  if (!boardApi) return;
  boardApi.requestHint();
};

const handleStockfishHint = (bestMove: string) => {
  if (boardApi && bestMove) {
    const from = bestMove.substring(0, 2);
    const to = bestMove.substring(2, 4);
    boardApi.drawMove(from, to, 'green');
  }
};

const handleEvaluation = (evaluation: StockfishEvaluation) => {
  currentEvaluation.value = evaluation;
};

const handleEngineStatus = (status: EngineStatus) => {
  engineStatus.value = status;
};

const startReview = async () => {
  if (!boardApi || isReviewing.value) return;
  isReviewing.value = true;
  reviewProgress.value = 0;
  try {
    const report = await boardApi.reviewGame({
      depth: 10,
      onProgress: (percent) => {
        reviewProgress.value = percent;
      }
    });
    gameReviewReport.value = report;
  } catch (err) {
    console.error('Erreur lors de la revue de partie:', err);
  } finally {
    isReviewing.value = false;
  }
};

onMounted(() => {
  window.addEventListener('resize', updateOrientation);
  isReady.value = true;
});

onUnmounted(() => {
  if (boardApi && isLiveAnalysis.value) {
    boardApi.stopLiveAnalysis();
  }
  window.removeEventListener('resize', updateOrientation);
});

onIonViewWillLeave(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});
</script>
