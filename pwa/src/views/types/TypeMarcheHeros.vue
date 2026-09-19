<!-- src/views/types/TypeMarcheHeros.vue -->
<template>
  <div class="exercice-type-marche-heros">
    <!-- En-tête Unifié -->
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneCourante"
      :stepBadgeText="`Série ${serieCouranteIndex + 1} / ${nbSeries}\n${sousEtapeBadge}`"
    />

    <!-- SOUS-ÉTAPE 1 : Sélection / Tri de la série en grille 2 colonnes -->
    <div v-if="sousEtape === 'selection'" class="phase-container selection-phase animate-fade-in">
      <div class="cards-grid-2col">
        <div
          v-for="item in diagrammesBank"
          :key="'bank-' + item.id"
          class="diagram-card-item grid-card-item"
          :class="{ 'is-selected': isItemSelected(item.id) }"
          @click="toggleSelection(item)"
        >
          <div class="card-selection-indicator">
            <span v-if="isItemSelected(item.id)" class="check-mark">✓</span>
            <span v-else class="empty-circle"></span>
          </div>
          <div class="card-board-wrapper">
            <DiagramViewer :fen="item.fen" :orientation="item.orientation" class="board-display" />
          </div>
        </div>
      </div>
    </div>

    <!-- SOUS-ÉTAPE 2 : Ordonnancement chronologique en grille 2 colonnes (Tap & Swap) -->
    <div v-else-if="sousEtape === 'ordonnancement'" class="phase-container order-phase animate-fade-in">
      <div class="order-instructions-bar">
        <span class="order-instructions-text">
          Touchez deux cartes pour permuter leur position chronologique.
        </span>
      </div>

      <div class="cards-grid-2col order-cards-grid">
        <div
          v-for="(item, index) in itemsEnCoursOrdonnancement"
          :key="'order-' + item.id"
          class="diagram-card-item grid-card-item order-card-item"
          :class="{ 'is-swap-selected': selectedSwapIndex === index }"
          @click="handleCardClickSwap(index)"
        >
          <div class="order-rank-badge">
            {{ index + 1 }}
          </div>

          <div class="card-board-wrapper">
            <DiagramViewer :fen="item.fen" :orientation="item.orientation" class="board-display" />
          </div>
        </div>
      </div>
    </div>

    <!-- SOUS-ÉTAPE 3 : Résolution du coup suivant -->
    <div v-else-if="sousEtape === 'resolution'" class="phase-container resolution-phase animate-fade-in">
      <div v-if="solutionCourante" class="puzzle-container">
        <PuzzleViewer
          :key="`puzzle-${serieCouranteIndex}`"
          :fen="solutionCourante.fenDepart"
          :couleur-joueur="solutionCourante.orientation"
          :solution="solutionCourante.solution"
          :shapes="solutionCourante.shapes"
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
import { ref, computed, onMounted, watch } from 'vue';
import { Chess, makeSquare } from 'chessops';
import { parseFen, makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { parsePgn } from 'chessops/pgn';
import { isNormal } from 'chessops/types';
import DiagramViewer from '@/components/shared/DiagramViewer.vue';
import PuzzleViewer from '@/components/shared/PuzzleViewer.vue';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';

import type { Key, DrawShape } from 'eg-chessboard';

interface Serie {
  pgn_data: string;
  couleur_joueur: 'white' | 'black';
  orientation?: 'white' | 'black';
  shapes?: DrawShape[];
}

interface ConfigMarcheHeros {
  mode: '3x5' | '5x3';
  series: Serie[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
  [key: string]: unknown;
}

const props = defineProps<{
  config: ConfigMarcheHeros;
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
}

interface Solution {
  fenDepart: string;
  orientation: 'white' | 'black';
  solution: string[];
  shapes: DrawShape[];
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

const headerMeta = computed(() => ({
  title: normalizedConfig.value.metaTitre || 'T7 - Marche du Héros',
  typeLabel: normalizedConfig.value.metaTypeLabel || 'Marche du Héros',
  chapitreNiveauLabel: normalizedConfig.value.metaChapitreNiveauLabel || '',
}));

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

// Puzzle résolu pour la série courante
const isPuzzleSolved = ref(false);
const puzzleError = ref<string | null>(null);
let puzzleErrorTimer: ReturnType<typeof setTimeout> | null = null;

// Sous-titre ou consigne contextuelle
const consigneCourante = computed(() => {
  if (sousEtape.value === 'selection') {
    return `Sélectionnez ${nbDiagrammesPerSerie.value} diagrammes appartenant à une même partie.`;
  }
  if (sousEtape.value === 'ordonnancement') {
    return `Remettez les ${nbDiagrammesPerSerie.value} positions dans l'ordre chronologique de la partie.`;
  }
  return 'Trouvez le coup décisif pour conclure cette série.';
});

const sousEtapeBadge = computed(() => {
  if (sousEtape.value === 'selection') return 'Étape 1 : Sélection';
  if (sousEtape.value === 'ordonnancement') return 'Étape 2 : Ordre chronologique';
  return 'Étape 3 : Coup suivant';
});

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
    return isPuzzleSolved.value;
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
    if (isPuzzleSolved.value) {
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
    return 'Désélectionnez une position pour corriger le groupe';
  }
  if (sousEtape.value === 'ordonnancement') {
    if (selectedSwapIndex.value !== null) {
      return `Position ${selectedSwapIndex.value + 1} sélectionnée. Touchez une autre position pour permuter.`;
    }
    return 'Touchez 2 cartes pour permuter leur ordre chronologique';
  }
  return 'Trouvez le bon coup sur l\'échiquier';
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

// Index de la carte sélectionnée pour la permutation au clic (Tap & Swap)
const selectedSwapIndex = ref<number | null>(null);

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

// Clic pour permuter (Tap & Swap)
const handleCardClickSwap = (index: number) => {
  if (selectedSwapIndex.value === null) {
    selectedSwapIndex.value = index;
  } else if (selectedSwapIndex.value === index) {
    selectedSwapIndex.value = null; // Désélection si on reclique sur la même carte
  } else {
    // Permutation des deux éléments
    const prev = selectedSwapIndex.value;
    const temp = itemsEnCoursOrdonnancement.value[prev];
    itemsEnCoursOrdonnancement.value[prev] = itemsEnCoursOrdonnancement.value[index];
    itemsEnCoursOrdonnancement.value[index] = temp;
    selectedSwapIndex.value = null;
  }
};

const handlePuzzleSuccess = () => {
  if (puzzleErrorTimer) clearTimeout(puzzleErrorTimer);
  puzzleError.value = null;
  isPuzzleSolved.value = true;
};

const handlePuzzleError = () => {
  puzzleError.value = 'Mauvais coup, cherchez encore !';
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

    // Préparer les cartes mélangées pour l'étape d'ordonnancement
    const melange = [...itemsSelectionnes.value];
    for (let i = melange.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [melange[i], melange[j]] = [melange[j], melange[i]];
    }
    itemsEnCoursOrdonnancement.value = melange;
    itemsSelectionnes.value = [];
    sousEtape.value = 'ordonnancement';
    return;
  }

  if (sousEtape.value === 'ordonnancement') {
    if (!isOrdonnancementValid.value) return;
    isPuzzleSolved.value = false;
    sousEtape.value = 'resolution';
    return;
  }

  if (sousEtape.value === 'resolution') {
    if (!isPuzzleSolved.value) return;

    if (serieCouranteIndex.value < nbSeries.value - 1) {
      serieCouranteIndex.value++;
      isPuzzleSolved.value = false;

      // Pour la dernière série, si les cartes restantes correspondent exactement à la dernière série
      if (serieCouranteIndex.value === nbSeries.value - 1) {
        // Passer directement à l'étape d'ordonnancement !
        const melange = [...diagrammesBank.value];
        for (let i = melange.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [melange[i], melange[j]] = [melange[j], melange[i]];
        }
        itemsEnCoursOrdonnancement.value = melange;
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
  isPuzzleSolved.value = false;

  diagrammesOriginalParSerie = Array.from({ length: nbSeries.value }, () => []);
  const bank: Diagramme[] = [];
  const solutions: Solution[] = [];

  const parseSanAndPlay = (pos: Chess, san: string) => {
    try {
      const parsed = parseSan(pos, san);
      if (parsed) {
        pos.play(parsed);
      }
    } catch {
      // Ignorer si le coup est invalide
    }
  };

  for (let serieIndex = 0; serieIndex < Math.min(config.series.length, nbSeries.value); serieIndex++) {
    const serie = config.series[serieIndex];
    const games = parsePgn(serie.pgn_data || '');
    const game = games[0];
    const fenInitiale = game?.headers.get('FEN') || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const history: string[] = [];
    if (game) {
      let node = game.moves;
      while (node.children.length > 0) {
        const child = node.children[0];
        history.push(child.data.san);
        node = child;
      }
    }

    const initSetup = parseFen(fenInitiale);
    const tempPos = initSetup.isOk ? Chess.fromSetup(initSetup.value).unwrap() : Chess.default();
    const tourInitial = tempPos.turn;
    const orientation = serie.orientation || serie.couleur_joueur || 'white';

    let startIndex = 0;
    const replayPos = tempPos.clone();

    const joueurDoitJouer = (orientation === 'white' && tourInitial === 'white') || (orientation === 'black' && tourInitial === 'black');
    if (!joueurDoitJouer && history.length > 0) {
      parseSanAndPlay(replayPos, history[0]);
      startIndex = 1;
    }

    const diag0: Diagramme = { id: `${serieIndex}-0`, fen: makeFen(replayPos.toSetup()), orientation, serieIndex, ordre: 0 };
    bank.push(diag0);
    diagrammesOriginalParSerie[serieIndex].push(diag0);

    const maxIndexPourReconstitution = history.length - 1;
    let ordre = 1;
    let i = startIndex;

    while (ordre < nbDiagrammesPerSerie.value && i < maxIndexPourReconstitution) {
      if (i < maxIndexPourReconstitution) parseSanAndPlay(replayPos, history[i]);
      if (i + 1 < maxIndexPourReconstitution) parseSanAndPlay(replayPos, history[i + 1]);
      i += 2;

      const diagN: Diagramme = { id: `${serieIndex}-${ordre}`, fen: makeFen(replayPos.toSetup()), orientation, serieIndex, ordre };
      bank.push(diagN);
      diagrammesOriginalParSerie[serieIndex].push(diagN);
      ordre++;
    }

    const indexCoupATrouver = i;
    const dernierCoup = history[indexCoupATrouver] || (history.length > 0 ? history[history.length - 1] : '');

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
      orientation,
      solution: [dernierCoup],
      shapes: serie.shapes || [],
      ...(lastMoveHighlight ? { lastMoveHighlight } : {})
    });
  }

  // Mélange aléatoire de la banque initiale pour le tri
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }

  diagrammesBank.value = bank;
  solutionsSeries.value = [...solutions];
};

onMounted(() => {
  initExercice();
});

watch(
  () => props.config,
  () => {
    initExercice();
  },
  { deep: true }
);
</script>

<style scoped>
.exercice-type-marche-heros {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 12px 16px 80px 16px;
  box-sizing: border-box;
}

.phase-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

/* Consignes / Instructions */
.order-instructions-bar {
  width: 100%;
  background: var(--ion-color-step-100, #f4f5f8);
  border-radius: 8px;
  padding: 10px 14px;
  box-sizing: border-box;
  text-align: center;
  font-size: 0.95rem;
  color: var(--ion-color-dark, #222);
  border: 1px solid var(--ion-color-step-200, #e0e0e0);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.inline-handle-icon {
  font-size: 1.2rem;
  vertical-align: middle;
  color: var(--ion-color-primary, #3880ff);
}

/* Grille 2 colonnes pour l'étape de sélection */
.cards-grid-2col {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.diagram-card-item {
  position: relative;
  width: 100%;
  background: var(--ion-card-background, #fff);
  border: 2px solid var(--ion-color-step-200, #e0e0e0);
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.diagram-card-item:hover {
  border-color: var(--ion-color-step-400, #b0b0b0);
}

.diagram-card-item.is-selected {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 4px 16px rgba(56, 128, 255, 0.25);
  transform: translateY(-2px);
}

.card-selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.empty-circle {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--ion-color-step-400, #bbb);
  background: #fff;
  transition: all 0.2s ease;
}

.check-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ion-color-primary, #3880ff);
  color: #fff;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(56, 128, 255, 0.4);
}

.card-board-wrapper {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.board-display {
  width: 100%;
  height: 100%;
}

/* Étape d'ordonnancement */
.order-cards-grid {
  width: 100%;
}

.order-cards-grid .order-card-item:last-child:nth-child(odd) {
  grid-column: 1 / -1;
  max-width: calc(50% - 6px);
  margin: 0 auto;
  width: 100%;
}

.order-card-item {
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.order-card-item:hover {
  border-color: var(--ion-color-step-400, #999);
}

.order-card-item.is-swap-selected {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 0 0 3px rgba(56, 128, 255, 0.4), 0 4px 16px rgba(56, 128, 255, 0.25);
  transform: translateY(-2px) scale(1.02);
}

.order-rank-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: var(--ion-color-primary, #3880ff);
  color: #fff;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

/* Phase de résolution */
.puzzle-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>