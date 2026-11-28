<!-- src/views/types/TypeMarcheHeros.vue -->
<template>
  <div class="exercise-stage">
    <!-- SOUS-ÉTAPE 1 : Sélection / Tri de la série en grille 2 colonnes -->
    <div v-if="sousEtape === 'selection'" class="learning-board-grid-2col animate-fade-in">
      <div
        v-for="item in diagrammesBank"
        :key="'bank-' + item.id"
        class="learning-board-card"
        :class="{ 'is-selected': isItemSelected(item.id) }"
        @click="toggleSelection(item)"
      >
        <div class="learning-board-card__header">
          <div class="learning-board-card__indicator">
            <span v-if="isItemSelected(item.id)" class="check-mark">✓</span>
            <span v-else class="empty-circle"></span>
          </div>
        </div>
        <div class="chessboard-container chessboard-container--mini">
          <DiagramViewer :fen="item.fen" :orientation="item.orientation" :last-move="item.lastMoveHighlight" />
        </div>
      </div>
    </div>

    <!-- SOUS-ÉTAPE 2 : Ordonnancement chronologique en grille 2 colonnes (Drag & Drop) -->
    <div v-else-if="sousEtape === 'ordonnancement'" class="animate-fade-in learning-full-width">
      <div class="learning-callout learning-callout--info ion-text-center">
        <span>Fais glisser chaque carte à sa bonne position chronologique.</span>
      </div>

      <div class="learning-board-grid-2col">
        <div
          v-for="(item, index) in itemsEnCoursOrdonnancement"
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
            <div class="learning-board-card__badge">
              {{ index + 1 }}
            </div>
          </div>

          <div class="chessboard-container chessboard-container--mini">
            <DiagramViewer :fen="item.fen" :orientation="item.orientation" :last-move="item.lastMoveHighlight" />
          </div>
        </div>
      </div>
    </div>

    <!-- SOUS-ÉTAPE 3 : Résolution du coup suivant -->
    <div v-else-if="sousEtape === 'resolution'" class="animate-fade-in learning-step-resolution">
      <div v-if="solutionCourante" class="learning-full-width">
        <Chessboard
          v-if="showResolutionReplay"
          :key="`replay-${serieCouranteIndex}`"
          :fen="solutionCourante.fenInitiale"
          :orientation="solutionCourante.orientation"
          :player-color="solutionCourante.orientation"
          :view-only="true"
          @board-created="onReplayBoardCreated"
        />
        <PuzzleViewer
          v-else
          :key="`puzzle-${serieCouranteIndex}`"
          :fen="solutionCourante.fenDepart"
          :couleur-joueur="solutionCourante.orientation"
          :solution="solutionCourante.solution"
          :alternatives="solutionCourante.alternatives"
          :shapes="[]"
          :lastMoveHighlight="solutionCourante.lastMoveHighlight"
          :disable-feedback-toast="true"
          @success="handlePuzzleSuccess"
          @error="handlePuzzleError"
        />
      </div>
    </div>

    <!-- Footer Fixe Unifié pour TypeMarcheHeros -->
    <SeriesCardFooter
      :currentCard="serieCouranteIndex + 1"
      :totalCards="serieCouranteIndex === nbSeries - 1 && sousEtape !== 'resolution' ? nbSeries + 1 : nbSeries"
      :isSolved="isCurrentStepSolved"
      :feedback="currentStepFeedback"
      :pendingHint="currentStepPendingHint"
      :nextText="nextStepText"
      :finishText="'Terminer l\'exercice'"
      @next="passerEtapeSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { Chess, makeSquare } from 'chessops';
import { parseFen, makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { parsePgn } from 'chessops/pgn';
import { isNormal } from 'chessops/types';
import { Chessboard } from '@/components/shared/Chessboard';
import DiagramViewer from '@/components/learning/viewers/DiagramViewer.vue';
import PuzzleViewer from '@/components/learning/viewers/PuzzleViewer.vue';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import { useBoardDragReorder } from '@/composables/learning/useBoardDragReorder';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import { shuffleArray, shuffleNonSorted, extractShapesAndComment } from '@/utils/chess/chessNotation';

import type { BoardCore, Key, DrawShape } from 'eg-chessboard';
import type { ExerciseType7Config } from '@/types/roi';

interface Serie {
  pgn_data: string;
  couleur_joueur: 'white' | 'black';
  orientation?: 'white' | 'black';
  shapes?: DrawShape[];
}

const props = defineProps<{
  config: ExerciseType7Config;
  id?: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

interface Diagramme {
  id: string;
  fen: string;
  orientation: 'white' | 'black';
  serieIndex: number;
  ordre: number;
  lastMoveHighlight?: Key[];
}

interface ReplayMove {
  san: string;
  shapes: DrawShape[];
}

interface Solution {
  fenDepart: string;
  fenInitiale: string;
  orientation: 'white' | 'black';
  solution: string[];
  alternatives?: string[][];
  shapes: DrawShape[];
  initialShapes: DrawShape[];
  replayMoves: ReplayMove[];
  lastMoveHighlight?: Key[];
}

const normalizedConfig = computed<Record<string, any>>(() => {
  let cfg: any = props.config;
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      // Ignorer
    }
  }
  return (cfg && typeof cfg === 'object') ? cfg : {};
});

const exerciseHeader = useExerciseHeader();

// Configuration des séries
const nbSeries = ref(3);
const nbDiagrammesPerSerie = ref(5);

// État de progression
const serieCouranteIndex = ref(0);
const sousEtape = ref<'selection' | 'ordonnancement' | 'resolution'>('selection');

// Banque des diagrammes restants à trier
const diagrammesBank = ref<Diagramme[]>([]);

// Cartes sélectionnées par l'utilisateur lors de la phase de tri
const itemsSelectionnes = ref<Diagramme[]>([]);

// Cartes actuellement en cours d'ordonnancement pour la série courante
const itemsEnCoursOrdonnancement = ref<Diagramme[]>([]);

// Données préparées pour toutes les séries (ordonnancement et puzzles)
let diagrammesOriginalParSerie: Diagramme[][] = [];
const solutionsSeries = ref<Solution[]>([]);

// Puzzle résolu et replay automatique pour la série courante
const isPuzzleMoveFound = ref(false);
const showResolutionReplay = ref(false);
const hasCompletedFirstReplay = ref(false);
const puzzleError = ref<string | null>(null);
let puzzleErrorTimer: ReturnType<typeof setTimeout> | null = null;
let replayStartTimer: ReturnType<typeof setTimeout> | null = null;
let replayStepTimer: ReturnType<typeof setTimeout> | null = null;

const clearReplayTimers = () => {
  if (replayStartTimer) {
    clearTimeout(replayStartTimer);
    replayStartTimer = null;
  }
  if (replayStepTimer) {
    clearTimeout(replayStepTimer);
    replayStepTimer = null;
  }
};

const resetResolutionState = () => {
  clearReplayTimers();
  isPuzzleMoveFound.value = false;
  showResolutionReplay.value = false;
  hasCompletedFirstReplay.value = false;
};

// Sous-titre ou consigne contextuelle
const consigneCourante = computed(() => {
  if (sousEtape.value === 'selection') {
    return `Sélectionne ${nbDiagrammesPerSerie.value} diagrammes appartenant à une même partie.`;
  }
  if (sousEtape.value === 'ordonnancement') {
    return `Remets les ${nbDiagrammesPerSerie.value} positions dans l'ordre chronologique de la partie.`;
  }
  return 'Trouve le coup décisif pour conclure cette série.';
});

const sousEtapeBadge = computed(() => {
  if (sousEtape.value === 'selection') return 'Étape 1 : Sélection';
  if (sousEtape.value === 'ordonnancement') return 'Étape 2 : Ordre chronologique';
  return 'Étape 3 : Coup suivant';
});

watch(
  [consigneCourante, serieCouranteIndex, nbSeries, sousEtapeBadge],
  ([consigne, idx, total, badge]) => {
    exerciseHeader?.setHeaderState({
      consigne,
      stepBadgeText: `Série ${idx + 1} / ${total}\n${badge}`,
    });
  },
  { immediate: true }
);

// ==========================================
// VALIDATION TEMPS-RÉEL DE L'ÉTAPE COURANTE
// ==========================================

// 1. Validation de la phase de Sélection
const isSelectionValid = computed(() => {
  if (itemsSelectionnes.value.length !== nbDiagrammesPerSerie.value) return false;
  const targetSerieIndex = itemsSelectionnes.value[0].serieIndex;
  return itemsSelectionnes.value.every(item => item.serieIndex === targetSerieIndex);
});

// 2. Validation de la phase d'Ordonnancement
const isOrdonnancementValid = computed(() => {
  if (itemsEnCoursOrdonnancement.value.length !== nbDiagrammesPerSerie.value) return false;
  return itemsEnCoursOrdonnancement.value.every((item, idx) => item.ordre === idx);
});

// Indicateur global isSolved pour SeriesCardFooter
const isCurrentStepSolved = computed(() => {
  if (sousEtape.value === 'selection') {
    return isSelectionValid.value;
  }
  if (sousEtape.value === 'ordonnancement') {
    return isOrdonnancementValid.value;
  }
  if (sousEtape.value === 'resolution') {
    return isPuzzleMoveFound.value && hasCompletedFirstReplay.value;
  }
  return false;
});

// Feedback contextuel pour SeriesCardFooter
const currentStepFeedback = computed<CardFeedback | null>(() => {
  if (sousEtape.value === 'selection') {
    if (itemsSelectionnes.value.length === nbDiagrammesPerSerie.value) {
      if (isSelectionValid.value) {
        return {
          type: 'success',
          message: 'Positions de la série identifiées avec succès !'
        };
      } else {
        return {
          type: 'danger',
          message: 'Certaines positions sélectionnées n\'appartiennent pas à la même partie.'
        };
      }
    }
    return null;
  }

  if (sousEtape.value === 'ordonnancement') {
    if (isOrdonnancementValid.value) {
      return {
        type: 'success',
        message: 'Chronologie exacte ! Bravo.'
      };
    }
    return null;
  }

  if (sousEtape.value === 'resolution') {
    if (isPuzzleMoveFound.value) {
      return {
        type: 'success',
        message: 'Coup décisif trouvé !'
      };
    }
    if (puzzleError.value) {
      return {
        type: 'danger',
        message: puzzleError.value
      };
    }
    return null;
  }

  return null;
});

// Indication d'attente (pending hint) pour SeriesCardFooter
const currentStepPendingHint = computed(() => {
  if (sousEtape.value === 'selection') {
    const compte = itemsSelectionnes.value.length;
    const total = nbDiagrammesPerSerie.value;
    const restant = total - compte;
    if (restant > 0) {
      return `Sélection : ${compte} / ${total} position${total > 1 ? 's' : ''} (${restant} restante${restant > 1 ? 's' : ''})`;
    }
    return 'Désélectionne une position pour corriger le groupe';
  }
  if (sousEtape.value === 'ordonnancement') {
    return 'Fais glisser les cartes pour les remettre dans l’ordre chronologique';
  }
  if (isPuzzleMoveFound.value && !hasCompletedFirstReplay.value) {
    return 'Démonstration de la série en cours...';
  }
  return 'Trouve le bon coup sur l\'échiquier';
});

// Libellé du bouton suivant dans le footer
const nextStepText = computed(() => {
  if (sousEtape.value === 'selection') {
    return 'Classer la série';
  }
  if (sousEtape.value === 'ordonnancement') {
    return 'Coup suivant';
  }
  if (serieCouranteIndex.value < nbSeries.value - 1) {
    return 'Série suivante';
  }
  return 'Terminer l\'exercice';
});

const solutionCourante = computed(() => {
  if (itemsEnCoursOrdonnancement.value.length === 0) return null;
  const serieIndex = itemsEnCoursOrdonnancement.value[0].serieIndex;
  return solutionsSeries.value[serieIndex] || null;
});

// ==========================================
// ACTIONS ET NAVIGATION ENTRE ÉTAPES
// ==========================================

// État du Drag & Drop pour l'ordonnancement
const {
  dragSourceIndex,
  dragTargetIndex,
  isDraggingCard,
  onCardPointerDown: onOrderCardPointerDown,
} = useBoardDragReorder(itemsEnCoursOrdonnancement);

const isItemSelected = (id: string) => {
  return itemsSelectionnes.value.some(item => item.id === id);
};

const toggleSelection = (item: Diagramme) => {
  const index = itemsSelectionnes.value.findIndex(i => i.id === item.id);
  if (index !== -1) {
    // Déjà sélectionné : désélectionner
    itemsSelectionnes.value.splice(index, 1);
  } else {
    // Non sélectionné : vérifier la limite
    if (itemsSelectionnes.value.length < nbDiagrammesPerSerie.value) {
      itemsSelectionnes.value.push(item);
    }
  }
};

const handlePuzzleSuccess = () => {
  if (puzzleErrorTimer) clearTimeout(puzzleErrorTimer);
  puzzleError.value = null;
  isPuzzleMoveFound.value = true;

  const currentSolution = solutionCourante.value;
  if (!currentSolution || currentSolution.replayMoves.length === 0) {
    hasCompletedFirstReplay.value = true;
    return;
  }

  clearReplayTimers();
  replayStartTimer = setTimeout(() => {
    showResolutionReplay.value = true;
  }, 600);
};

const onReplayBoardCreated = (api: BoardCore) => {
  const currentSolution = solutionCourante.value;
  if (!currentSolution) return;

  const { fenInitiale, initialShapes, replayMoves } = currentSolution;
  if (replayMoves.length === 0) {
    hasCompletedFirstReplay.value = true;
    return;
  }

  let currentMoveIndex = 0;

  const applyInitialState = () => {
    api.setPosition(fenInitiale);
    api.setShapes(initialShapes);
  };

  const playStep = () => {
    if (sousEtape.value !== 'resolution' || !showResolutionReplay.value) return;

    if (currentMoveIndex < replayMoves.length) {
      const step = replayMoves[currentMoveIndex];
      try {
        api.move(step.san);
        api.setShapes(step.shapes);
      } catch {
        // Ignorer si le coup échoue
      }
      currentMoveIndex++;

      if (currentMoveIndex >= replayMoves.length) {
        hasCompletedFirstReplay.value = true;
      }

      replayStepTimer = setTimeout(playStep, 1000);
    } else {
      // Fin de la séquence : pause de 2500ms, réinitialisation et reprise
      replayStepTimer = setTimeout(() => {
        if (sousEtape.value !== 'resolution' || !showResolutionReplay.value) return;
        applyInitialState();
        currentMoveIndex = 0;
        replayStepTimer = setTimeout(playStep, 1000);
      }, 2500);
    }
  };

  applyInitialState();
  replayStepTimer = setTimeout(playStep, 1000);
};

const handlePuzzleError = () => {
  puzzleError.value = 'Mauvais coup, cherche encore !';
  if (puzzleErrorTimer) clearTimeout(puzzleErrorTimer);
  puzzleErrorTimer = setTimeout(() => {
    puzzleError.value = null;
  }, 2500);
};

const passerEtapeSuivante = () => {
  if (sousEtape.value === 'selection') {
    if (!isSelectionValid.value) return;

    // Retirer les cartes sélectionnées de la banque
    const idsToRemove = new Set(itemsSelectionnes.value.map(i => i.id));
    diagrammesBank.value = diagrammesBank.value.filter(i => !idsToRemove.has(i.id));

    // Préparer les cartes mélangées pour l'étape d'ordonnancement (jamais déjà triées)
    itemsEnCoursOrdonnancement.value = shuffleNonSorted(
      itemsSelectionnes.value,
      (items) => items.every((item, idx) => item.ordre === idx)
    );
    itemsSelectionnes.value = [];
    sousEtape.value = 'ordonnancement';
    return;
  }

  if (sousEtape.value === 'ordonnancement') {
    if (!isOrdonnancementValid.value) return;
    resetResolutionState();
    sousEtape.value = 'resolution';
    return;
  }

  if (sousEtape.value === 'resolution') {
    if (!isCurrentStepSolved.value) return;

    resetResolutionState();

    if (serieCouranteIndex.value < nbSeries.value - 1) {
      serieCouranteIndex.value++;

      // Pour la dernière série, si les cartes restantes correspondent exactement à la dernière série
      if (serieCouranteIndex.value === nbSeries.value - 1) {
        // Passer directement à l'étape d'ordonnancement (jamais déjà triées) !
        itemsEnCoursOrdonnancement.value = shuffleNonSorted(
          diagrammesBank.value,
          (items) => items.every((item, idx) => item.ordre === idx)
        );
        diagrammesBank.value = [];
        sousEtape.value = 'ordonnancement';
      } else {
        itemsSelectionnes.value = [];
        itemsEnCoursOrdonnancement.value = [];
        sousEtape.value = 'selection';
      }
    } else {
      emit('success');
    }
  }
};

// ==========================================
// INITIALISATION GLOBALE
// ==========================================
const initExercice = () => {
  const config = normalizedConfig.value;
  if (!config || !config.mode || !config.series) return;

  const mode = config.mode;
  nbSeries.value = mode === '5x3' ? 5 : 3;
  nbDiagrammesPerSerie.value = mode === '5x3' ? 3 : 5;

  serieCouranteIndex.value = 0;
  sousEtape.value = 'selection';
  itemsSelectionnes.value = [];
  itemsEnCoursOrdonnancement.value = [];
  resetResolutionState();

  diagrammesOriginalParSerie = Array.from({ length: nbSeries.value }, () => []);
  const bank: Diagramme[] = [];
  const solutions: Solution[] = [];

  const parseSanAndPlay = (pos: Chess, san: string): Key[] | undefined => {
    try {
      const parsed = parseSan(pos, san);
      if (parsed) {
        const lastMove = isNormal(parsed)
          ? ([makeSquare(parsed.from) as Key, makeSquare(parsed.to) as Key] as Key[])
          : undefined;
        pos.play(parsed);
        return lastMove;
      }
    } catch {
      // Ignorer si le coup est invalide
    }
    return undefined;
  };

  for (let serieIndex = 0; serieIndex < Math.min(config.series.length, nbSeries.value); serieIndex++) {
    const serie = config.series[serieIndex];
    const games = parsePgn(serie.pgn_data || '');
    const game = games[0];
    const fenInitiale = game?.headers.get('FEN') || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const history: string[] = [];
    const historyAlternatives: string[][] = [];
    const replayMoves: ReplayMove[] = [];
    if (game) {
      let node = game.moves;
      while (node.children.length > 0) {
        const child = node.children[0];
        history.push(child.data.san);
        historyAlternatives.push(
          node.children.slice(1).map((alt) => alt.data.san).filter(Boolean)
        );
        const parsedComment = extractShapesAndComment(child.data?.comments);
        replayMoves.push({
          san: child.data.san,
          shapes: parsedComment.shapes as DrawShape[],
        });
        node = child;
      }
    }
    const rootParsed = extractShapesAndComment(game?.comments);
    const initialShapes = (
      rootParsed.shapes.length > 0 ? rootParsed.shapes : (serie.shapes || [])
    ) as DrawShape[];

    const initSetup = parseFen(fenInitiale);
    const tempPos = initSetup.isOk ? Chess.fromSetup(initSetup.value).unwrap() : Chess.default();
    const tourInitial = tempPos.turn;
    const orientation = serie.orientation || serie.couleur_joueur || 'white';

    let startIndex = 0;
    const replayPos = tempPos.clone();
    let diag0LastMove: Key[] | undefined = undefined;

    const joueurDoitJouer = (orientation === 'white' && tourInitial === 'white') || (orientation === 'black' && tourInitial === 'black');
    if (!joueurDoitJouer && history.length > 0) {
      diag0LastMove = parseSanAndPlay(replayPos, history[0]);
      startIndex = 1;
    }

    const diag0: Diagramme = {
      id: `${serieIndex}-0`,
      fen: makeFen(replayPos.toSetup()),
      orientation,
      serieIndex,
      ordre: 0,
      ...(diag0LastMove ? { lastMoveHighlight: diag0LastMove } : {})
    };
    bank.push(diag0);
    diagrammesOriginalParSerie[serieIndex].push(diag0);

    const maxIndexPourReconstitution = history.length - 1;
    let ordre = 1;
    let i = startIndex;

    while (ordre < nbDiagrammesPerSerie.value && i < maxIndexPourReconstitution) {
      let stepLastMove: Key[] | undefined = undefined;
      if (i < maxIndexPourReconstitution) stepLastMove = parseSanAndPlay(replayPos, history[i]) ?? stepLastMove;
      if (i + 1 < maxIndexPourReconstitution) stepLastMove = parseSanAndPlay(replayPos, history[i + 1]) ?? stepLastMove;
      i += 2;

      const diagN: Diagramme = {
        id: `${serieIndex}-${ordre}`,
        fen: makeFen(replayPos.toSetup()),
        orientation,
        serieIndex,
        ordre,
        ...(stepLastMove ? { lastMoveHighlight: stepLastMove } : {})
      };
      bank.push(diagN);
      diagrammesOriginalParSerie[serieIndex].push(diagN);
      ordre++;
    }

    const indexCoupATrouver = i;
    const resolvedIndex = indexCoupATrouver >= 0 && indexCoupATrouver < history.length
      ? indexCoupATrouver
      : history.length - 1;
    const dernierCoup = resolvedIndex >= 0 ? history[resolvedIndex] : '';
    const dernierCoupAlternatives = resolvedIndex >= 0 ? (historyAlternatives[resolvedIndex] ?? []) : [];

    let lastMoveHighlight: Key[] | undefined = undefined;
    if (indexCoupATrouver - 1 >= 0 && indexCoupATrouver - 1 < history.length) {
      const helperPos = initSetup.isOk ? Chess.fromSetup(initSetup.value).unwrap() : Chess.default();
      for (let k = 0; k < indexCoupATrouver - 1; k++) {
        parseSanAndPlay(helperPos, history[k]);
      }
      try {
        const parsedMove = parseSan(helperPos, history[indexCoupATrouver - 1]);
        if (parsedMove && isNormal(parsedMove)) {
          lastMoveHighlight = [makeSquare(parsedMove.from) as Key, makeSquare(parsedMove.to) as Key];
        }
      } catch {
        // Ignorer si le coup ne peut pas être joué
      }
    }

    solutions.push({
      fenDepart: makeFen(replayPos.toSetup()),
      fenInitiale,
      orientation,
      solution: [dernierCoup],
      alternatives: dernierCoupAlternatives.length > 0 ? [dernierCoupAlternatives] : [],
      shapes: [],
      initialShapes,
      replayMoves,
      ...(lastMoveHighlight ? { lastMoveHighlight } : {})
    });
  }

  diagrammesBank.value = shuffleArray(bank);
  solutionsSeries.value = [...solutions];
};

onMounted(() => {
  initExercice();
});

onBeforeUnmount(() => {
  clearReplayTimers();
  if (puzzleErrorTimer) {
    clearTimeout(puzzleErrorTimer);
    puzzleErrorTimer = null;
  }
});

watch(
  () => props.config,
  () => {
    initExercice();
  },
  { deep: true }
);
</script>