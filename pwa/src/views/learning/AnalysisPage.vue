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

    <ion-content :fullscreen="true" :scroll-y="true" class="ion-padding">
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
              <!-- Voyant d'état moteur Stockfish -->
              <span
                class="engine-status-indicator"
                :class="[`engine-status-${engineStatus}`, { 'is-clickable': engineStatus === 'error' }]"
                :title="engineStatus === 'error' ? 'Erreur moteur — Cliquer pour redémarrer Stockfish' : `État du moteur IA : ${engineStatusLabel}`"
                @click="engineStatus === 'error' ? recoverEngine() : undefined"
              >
                <span class="status-dot"></span>
                <span class="status-label">{{ engineStatusLabel }}</span>
              </span>

              <span class="ply-badge">
                Coup {{ currentPly }} / {{ totalPlyCount }} {{ currentPly === 0 ? '(Début)' : '' }}
              </span>
              <span
                v-if="isLiveAnalysis"
                class="eval-badge"
                :class="{
                  'is-white': currentEvaluation ? (currentEvaluation.whiteScoreValue ?? 0) >= 0 : true,
                  'is-black': currentEvaluation ? (currentEvaluation.whiteScoreValue ?? 0) < 0 : false
                }"
              >
                {{ currentEvaluation ? formatEvaluationScore(currentEvaluation) : '...' }}
              </span>
            </div>
          </div>
        </div>

        <div class="main-container" :class="{ 'landscape-mode': isLandscape }">
          <div class="board-section">
            <div class="board-wrapper-with-eval">
              <!-- Barre d'évaluation Stockfish 19 -->
              <div v-if="isLiveAnalysis" class="analysis-eval-bar-container">
                <div class="analysis-eval-bar">
                  <div class="analysis-eval-fill" :style="{ '--eval-percent': `${evalBarPercent}%` }"></div>
                </div>
                <div class="analysis-eval-label">
                  {{ currentEvaluation ? formatEvaluationScore(currentEvaluation) : '...' }}
                </div>
              </div>

              <div class="board-container">
                <!-- Échiquier (Mode Lecture Seule) -->
                <Chessboard 
                  v-if="isReady"
                  :key="`board-analysis-${boardKey}`"
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
                  :disabled="engineStatus === 'searching' && !isLiveAnalysis"
                  @click="requestHint"
                >
                  <ion-icon slot="start" :icon="bulbOutline"></ion-icon>
                  <span>{{ engineStatus === 'searching' && !isLiveAnalysis ? 'Calcul...' : 'Conseil' }}</span>
                </ion-button>

                <ion-button
                  expand="block"
                  :fill="isReviewing ? 'solid' : 'outline'"
                  :color="isReviewing ? 'warning' : 'tertiary'"
                  :disabled="!isReviewing && historyMoves.length === 0"
                  @click="toggleReview"
                >
                  <ion-icon slot="start" :icon="ribbonOutline"></ion-icon>
                  <span>{{ isReviewing ? 'Annuler' : 'Bilan' }}</span>
                </ion-button>
              </div>

              <!-- Message informatif de conseil / statut -->
              <div v-if="hintFeedbackMessage" class="analysis-hint-message">
                <ion-icon :icon="informationCircleOutline"></ion-icon>
                <span>{{ hintFeedbackMessage }}</span>
              </div>

              <!-- Progression de la revue post-mortem -->
              <div v-if="isReviewing" class="analysis-review-progress">
                <div class="review-progress-text">
                  <span>Revue en cours...</span>
                  <span>{{ reviewProgress }}%</span>
                </div>
                <ion-progress-bar :value="reviewProgress / 100"></ion-progress-bar>
              </div>

              <!-- Carte Bilan post-mortem -->
              <div v-if="gameReviewReport && !isReviewing" class="analysis-review-card">
                <div class="review-header">
                  <h3>Bilan de la partie</h3>
                  <ion-button fill="clear" size="small" @click="gameReviewReport = null">
                    <ion-icon slot="icon-only" :icon="closeOutline"></ion-icon>
                  </ion-button>
                </div>
                <div class="accuracy-grid">
                  <div class="accuracy-box white-box">
                    <span class="acc-title">Précision Blancs</span>
                    <span class="acc-value">{{ gameReviewReport.accuracy.white }}%</span>
                  </div>
                  <div class="accuracy-box black-box">
                    <span class="acc-title">Précision Noirs</span>
                    <span class="acc-value">{{ gameReviewReport.accuracy.black }}%</span>
                  </div>
                </div>
                <div class="judgement-summary-grid">
                  <span v-if="reviewSummaryCounts.brilliant > 0" class="judgement-pill judgement-brilliant">
                    !! {{ reviewSummaryCounts.brilliant }}
                  </span>
                  <span v-if="reviewSummaryCounts.best > 0" class="judgement-pill judgement-best">
                    ★ {{ reviewSummaryCounts.best }}
                  </span>
                  <span v-if="reviewSummaryCounts.excellent > 0" class="judgement-pill judgement-excellent">
                    ✓ {{ reviewSummaryCounts.excellent }}
                  </span>
                  <span v-if="reviewSummaryCounts.good > 0" class="judgement-pill judgement-good">
                    • {{ reviewSummaryCounts.good }}
                  </span>
                  <span v-if="reviewSummaryCounts.inaccuracy > 0" class="judgement-pill judgement-inaccuracy">
                    ?! {{ reviewSummaryCounts.inaccuracy }}
                  </span>
                  <span v-if="reviewSummaryCounts.mistake > 0" class="judgement-pill judgement-mistake">
                    ? {{ reviewSummaryCounts.mistake }}
                  </span>
                  <span v-if="reviewSummaryCounts.blunder > 0" class="judgement-pill judgement-blunder">
                    ?? {{ reviewSummaryCounts.blunder }}
                  </span>
                  <span v-if="reviewSummaryCounts.missed_win > 0" class="judgement-pill judgement-missed-win">
                    ✗ {{ reviewSummaryCounts.missed_win }}
                  </span>
                </div>
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
                  <div class="move-start-row" v-if="historyMoves.length > 0">
                    <button 
                      type="button"
                      :class="['start-position-btn', { 'active-move': currentPly === 0 }]"
                      @click="viewFirst"
                    >
                      <ion-icon :icon="playBackOutline"></ion-icon>
                      <span>Position initiale</span>
                    </button>
                  </div>
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
  ribbonOutline,
  informationCircleOutline,
  closeOutline
} from 'ionicons/icons';
import { ref, onMounted, onUnmounted, reactive, watch, computed, nextTick } from 'vue';
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
  computeEvalBarPercentage,
  normalizeCastlingMoves
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
const boardKey = ref(0);
const currentPly = ref(0);
const totalPlyCount = ref(0);
const historyMoves = ref<HistoryMoveItem[]>([]);
const historyScrollContainer = ref<HTMLElement | null>(null);

const isLandscape = ref(window.innerWidth > window.innerHeight);
const isDesktop = ref(window.innerWidth >= 768);
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

const updateOrientation = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    isLandscape.value = window.innerWidth > window.innerHeight;
    isDesktop.value = window.innerWidth >= 768;
    boardApi?.redraw(true);
  }, 150);
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

const engineStatusLabel = computed(() => {
  switch (engineStatus.value) {
    case 'ready':
      return 'Moteur prêt';
    case 'searching':
      return 'En réflexion...';
    case 'loading':
      return 'Chargement IA...';
    case 'stopping':
      return 'Arrêt en cours...';
    case 'error':
      return 'Erreur moteur';
    case 'uninitialized':
    default:
      return 'Moteur inactif';
  }
});

const hintFeedbackMessage = ref<string | null>(null);
let hintFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

const evalBarPercent = computed(() => {
  if (!currentEvaluation.value) return 50;
  const ev = currentEvaluation.value;
  if (typeof ev.winChancePercentage === 'number') {
    return ev.winChancePercentage;
  }
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

const reviewSummaryCounts = computed(() => {
  const counts: Record<MoveJudgement, number> = {
    brilliant: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    missed_win: 0,
  };
  if (gameReviewReport.value?.summary) {
    const { white, black } = gameReviewReport.value.summary;
    for (const key of Object.keys(counts) as MoveJudgement[]) {
      counts[key] = (white[key] || 0) + (black[key] || 0);
    }
  }
  return counts;
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

/**
 * Nombre de colonnes (tours) par ligne
 */
const movesPerRow = computed(() => (isLandscape.value || isDesktop.value) ? 2 : 3);

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
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
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
    const rawHistory = boardApi.getHistory();
    totalPlyCount.value = rawHistory ? rawHistory.length : 0;
    const historyState = boardApi.getHistoryViewerState();
    currentPly.value = (historyState && historyState.isEnabled && historyState.plyViewing !== undefined)
      ? historyState.plyViewing
      : totalPlyCount.value;
    updateMoveHistory();
  }
};

const viewPly = (ply: number) => {
  hintFeedbackMessage.value = null;
  boardApi?.hideMoves();
  boardApi?.viewHistory(ply);
  refreshDisplay();
};

const handleBoardCreated = (api: BoardCore) => {
  boardApi = api;
  if (chessStore.currentPgn) {
    boardApi.loadPgn(chessStore.currentPgn);
    normalizeCastlingMoves(boardApi);
  }
  if (currentPly.value > 0) {
    boardApi.viewHistory(currentPly.value);
  }
  refreshDisplay();
};

/**
 * Nécessaire pour mettre à jour lors de la navigation
 */
const handleMove = () => {
  if (boardApi) {
    normalizeCastlingMoves(boardApi);
  }
  refreshDisplay();
};

const viewFirst = () => { 
  hintFeedbackMessage.value = null;
  boardApi?.hideMoves();
  boardApi?.viewStart(); 
  refreshDisplay();
};

const viewPrev = () => { 
  hintFeedbackMessage.value = null;
  boardApi?.hideMoves();
  boardApi?.viewPrevious(); 
  refreshDisplay();
};

const viewNext = () => { 
  hintFeedbackMessage.value = null;
  boardApi?.hideMoves();
  boardApi?.viewNext(); 
  refreshDisplay();
};

const viewLast = () => { 
  hintFeedbackMessage.value = null;
  boardApi?.hideMoves();
  boardApi?.viewHistory(totalPlyCount.value); 
  refreshDisplay();
};

const toggleLiveAnalysis = () => {
  if (!boardApi) return;
  normalizeCastlingMoves(boardApi);
  isLiveAnalysis.value = !isLiveAnalysis.value;
  if (isLiveAnalysis.value) {
    boardApi.startLiveAnalysis();
  } else {
    boardApi.stopLiveAnalysis();
    boardApi.hideMoves();
    currentEvaluation.value = null;
  }
  nextTick(() => {
    boardApi?.redraw(true);
    setTimeout(() => {
      boardApi?.redraw(true);
      window.dispatchEvent(new Event('resize'));
    }, 50);
  });
};

const requestHint = () => {
  if (!boardApi) return;
  normalizeCastlingMoves(boardApi);
  if (currentPly.value === totalPlyCount.value && totalPlyCount.value > 0 && boardApi.getIsGameOver()) {
    hintFeedbackMessage.value = 'Partie terminée sur cette position. Revenez en arrière pour demander un conseil.';
    if (hintFeedbackTimer) clearTimeout(hintFeedbackTimer);
    hintFeedbackTimer = setTimeout(() => {
      hintFeedbackMessage.value = null;
    }, 4000);
    return;
  }
  hintFeedbackMessage.value = 'Recherche du meilleur coup en cours...';
  if (hintFeedbackTimer) clearTimeout(hintFeedbackTimer);
  hintFeedbackTimer = setTimeout(() => {
    if (hintFeedbackMessage.value === 'Recherche du meilleur coup en cours...') {
      hintFeedbackMessage.value = 'Le moteur n\'a pas retourné de coup dans le délai imparti. Réessayez ou naviguez vers un autre coup.';
      setTimeout(() => {
        hintFeedbackMessage.value = null;
      }, 4000);
    }
  }, 6000);
  boardApi.requestHint({ multiPv: 2, movetime: 1500 });
};

const handleStockfishHint = (bestMove: string) => {
  if (hintFeedbackTimer) clearTimeout(hintFeedbackTimer);
  if (boardApi && bestMove && bestMove.length >= 4) {
    const from = bestMove.substring(0, 2);
    const to = bestMove.substring(2, 4);
    boardApi.drawMove(from, to, 'green');
    hintFeedbackMessage.value = `Conseil Stockfish : ${from.toUpperCase()} ➔ ${to.toUpperCase()}`;
    hintFeedbackTimer = setTimeout(() => {
      hintFeedbackMessage.value = null;
    }, 5000);
  } else {
    hintFeedbackMessage.value = 'Aucun coup évident trouvé sur cette position.';
    hintFeedbackTimer = setTimeout(() => {
      hintFeedbackMessage.value = null;
    }, 3000);
  }
};

const handleEvaluation = (evaluation: StockfishEvaluation) => {
  currentEvaluation.value = evaluation;
  // Lors de l'analyse en continu, afficher le meilleur coup calculé pour la position visualisée
  if (isLiveAnalysis.value && boardApi && evaluation.bestMove && evaluation.bestMove.length >= 4) {
    const from = evaluation.bestMove.substring(0, 2);
    const to = evaluation.bestMove.substring(2, 4);
    boardApi.drawMove(from, to, 'green');
  }
};

const recoverEngine = () => {
  if (isReviewing.value) {
    cancelReview();
  }
  boardKey.value++;
};

const handleEngineStatus = (status: EngineStatus) => {
  engineStatus.value = status;
  if (status === 'error') {
    if (isReviewing.value) {
      hintFeedbackMessage.value = 'Le moteur Stockfish a été interrompu pendant le bilan. Réinitialisation en cours...';
      cancelReview();
      setTimeout(() => {
        recoverEngine();
      }, 1000);
    }
  }
};

let reviewAbortController: AbortController | null = null;

const cancelReview = () => {
  if (reviewAbortController) {
    reviewAbortController.abort();
    reviewAbortController = null;
  }
  boardApi?.cancelReview();
  isReviewing.value = false;
};

const toggleReview = async () => {
  if (isReviewing.value) {
    cancelReview();
    return;
  }
  await startReview();
};

const startReview = async () => {
  if (!boardApi || isReviewing.value) return;
  normalizeCastlingMoves(boardApi);
  isReviewing.value = true;
  reviewProgress.value = 0;
  reviewAbortController = new AbortController();

  try {
    const report = await boardApi.reviewGame({
      depth: 12,
      signal: reviewAbortController.signal,
      onProgress: (percent) => {
        reviewProgress.value = percent;
      }
    });
    if (isReviewing.value) {
      gameReviewReport.value = report;
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    if (isReviewing.value) {
      console.error('Erreur lors de la revue de partie:', err);
    }
  } finally {
    isReviewing.value = false;
    reviewAbortController = null;
  }
};

onMounted(() => {
  window.addEventListener('resize', updateOrientation);
  isReady.value = true;
});

onUnmounted(() => {
  if (hintFeedbackTimer) {
    clearTimeout(hintFeedbackTimer);
  }
  if (boardApi) {
    if (isReviewing.value) {
      cancelReview();
    }
    if (isLiveAnalysis.value) {
      boardApi.stopLiveAnalysis();
    }
  }
  window.removeEventListener('resize', updateOrientation);
});

onIonViewWillLeave(() => {
  if (hintFeedbackTimer) {
    clearTimeout(hintFeedbackTimer);
  }
  if (boardApi) {
    if (isReviewing.value) {
      cancelReview();
    }
    if (isLiveAnalysis.value) {
      boardApi.stopLiveAnalysis();
      isLiveAnalysis.value = false;
      currentEvaluation.value = null;
    }
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});
</script>
