<template>
  <div class="exercise-viewer-layout">
    <!-- PHASE 1 : OBSERVATION -->
    <div v-if="phase === 'observation'" class="observation-stage">
      <!-- Grande FEN de départ -->
      <div class="main-board-wrapper">
        <div class="chessboard-container">
          <Chessboard
            :fen="props.fenDepart || 'start'"
            :orientation="playerColorTyped"
            :player-color="playerColorTyped"
            :view-only="true"
            @board-created="onMainBoardCreated"
          />
        </div>
        <div class="board-caption">Position de départ</div>
      </div>

      <!-- Les 3 Scénarios -->
      <div class="scenarios-container">
        <div
          v-for="(scenario, index) in scenarios"
          :key="index"
          class="scenario-card"
          @click="selectScenario(index)"
        >
          <div class="scenario-header">
            <span class="scenario-badge">Plan {{ index + 1 }}</span>
            <span class="scenario-hint">Choisir</span>
          </div>
          <div class="chessboard-container--mini">
            <Chessboard
              :fen="props.fenDepart || 'start'"
              :orientation="playerColorTyped"
              :player-color="playerColorTyped"
              :view-only="true"
              :zoomable="true"
              @board-created="(api: BoardCore) => onScenarioBoardCreated(index, api)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- PHASE 2 : EXPLICATION -->
    <div v-else-if="phase === 'explication'" class="exercise-stage">
      <PgnViewer
        :pgnString="pgnExplication"
        :orientation="playerColorTyped"
        :autoCompleteDelay="0"
        @finished="onPgnFinished"
      />
    </div>

    <SeriesCardFooter
      :currentCard="phase === 'observation' ? 1 : 2"
      :totalCards="2"
      :isSolved="phase === 'explication'"
      :disabled="phase === 'explication' && !isPgnFinished"
      :feedback="footerFeedback"
      badgePrefix="Étape"
      disabledHint="Visionne tous les coups du PGN pour continuer"
      :finishText="'Terminer l\'exercice'"
      @next="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onBeforeUnmount } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/core/useFeedback';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import type { BoardCore } from 'eg-chessboard';
import { Chess } from 'chessops';
import { parseFen } from 'chessops/fen';
import { parseSan, makeSanAndPlay } from 'chessops/san';
import { parsePgn } from 'chessops/pgn';
import PgnViewer from '@/components/learning/viewers/PgnViewer.vue';

const { showSuccess, showError } = useFeedback();
const exerciseHeader = useExerciseHeader();

export interface ScenarioJugementFinal {
  pgn: string;
  is_correct: boolean;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    fenDepart?: string;
    couleurJoueur?: 'white' | 'black';
    scenarios?: ScenarioJugementFinal[];
    pgnExplication?: string;
  }>(),
  {
    consigne: '',
    fenDepart: '',
    couleurJoueur: 'white',
    scenarios: () => [],
    pgnExplication: ''
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const MOVE_INTERVAL_MS = 1000;
const END_PAUSE_MS = 2500;

const phase = ref<'observation' | 'explication'>('observation');
const isPgnFinished = ref(false);
const footerFeedback = ref<CardFeedback | null>(null);
const mainBoardApi = shallowRef<BoardCore | null>(null);
const boardApis = shallowRef<Map<number, BoardCore>>(new Map());
let masterPlaybackTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  [phase, () => props.consigne],
  () => {
    if (phase.value === 'observation') {
      exerciseHeader?.setHeaderState({
        consigne: props.consigne || 'Observe les différents plans et choisis le meilleur.',
        stepBadgeText: 'Étape 1 / 2\nObservation'
      });
    } else {
      exerciseHeader?.setHeaderState({
        consigne: 'Explication du plan gagnant',
        stepBadgeText: 'Étape 2 / 2\nExplication'
      });
      footerFeedback.value = {
        type: 'success',
        message: 'Excellente analyse !'
      };
    }
  },
  { immediate: true }
);

const playerColorTyped = computed<'white' | 'black'>(() => {
  return props.couleurJoueur === 'black' ? 'black' : 'white';
});

const mainBoardConfig = computed(() => ({
  fen: props.fenDepart || 'start',
  orientation: playerColorTyped.value,
  viewOnly: true
}));

const getScenarioBoardConfig = () => ({
  fen: props.fenDepart || 'start',
  orientation: playerColorTyped.value,
  viewOnly: true
});

const onMainBoardCreated = (api: BoardCore) => {
  mainBoardApi.value = api;
  if (props.fenDepart) {
    api.setPosition(props.fenDepart);
  }
};

const clearAllTimers = () => {
  if (masterPlaybackTimer !== null) {
    clearTimeout(masterPlaybackTimer);
    masterPlaybackTimer = null;
  }
};

onBeforeUnmount(() => {
  clearAllTimers();
});

const getMoveSequence = (fenDepart: string, pgnString: string) => {
  if (!pgnString) return [];
  const cleaned = pgnString.trim().replace(/(\.\.\.|\.\.|\.)$/, '').trim();

  // Primary parsing using chessops
  try {
    const fullPgn = fenDepart && fenDepart !== 'start' && !cleaned.includes('[FEN ')
      ? `[SetUp "1"]\n[FEN "${fenDepart}"]\n\n${cleaned}`
      : cleaned;

    const games = parsePgn(fullPgn);
    if (games.length > 0) {
      const game = games[0];
      const setupFen = game.headers.get('FEN') || fenDepart;
      const setupRes = setupFen && setupFen !== 'start' ? parseFen(setupFen) : null;
      const pos = setupRes && setupRes.isOk ? Chess.fromSetup(setupRes.value).unwrap() : Chess.default();

      const moves: { san: string }[] = [];
      let currentNode = game.moves;
      while (currentNode.children.length > 0) {
        const child = currentNode.children[0];
        const parsedMove = parseSan(pos, child.data.san);
        if (parsedMove) {
          const san = makeSanAndPlay(pos, parsedMove);
          moves.push({ san: san || child.data.san });
        } else {
          moves.push({ san: child.data.san });
        }
        currentNode = child;
      }
      if (moves.length > 0) return moves;
    }
  } catch (e) {
    console.warn('parsePgn standard parse failed, fallback to token parsing', e);
  }

  // Token fallback parsing for partial or custom SAN streams
  try {
    const setupRes = fenDepart && fenDepart !== 'start' ? parseFen(fenDepart) : null;
    const pos = setupRes && setupRes.isOk ? Chess.fromSetup(setupRes.value).unwrap() : Chess.default();
    const textWithoutComments = cleaned.replace(/\{[^}]*\}/g, '').replace(/\d+\.\.\.|\d+\./g, '').trim();
    const tokens = textWithoutComments.split(/\s+/).filter(t => t && t !== '...');
    const moves: { san: string }[] = [];
    for (const token of tokens) {
      const parsed = parseSan(pos, token);
      if (parsed) {
        const san = makeSanAndPlay(pos, parsed);
        moves.push({ san: san || token });
      } else {
        break;
      }
    }
    return moves;
  } catch {
    return [];
  }
};

const startSynchronizedPlayback = () => {
  clearAllTimers();

  if (phase.value !== 'observation') return;
  if (props.scenarios.length === 0 || boardApis.value.size < props.scenarios.length) {
    return;
  }

  const sequences = props.scenarios.map((scenario) =>
    scenario?.pgn ? getMoveSequence(props.fenDepart, scenario.pgn) : []
  );
  const maxMoves = sequences.reduce((max, seq) => Math.max(max, seq.length), 0);

  const initialFen = props.fenDepart || 'start';
  boardApis.value.forEach((api) => {
    api.setPosition(initialFen);
  });

  if (maxMoves === 0) return;

  let currentMoveIndex = 0;

  const playStep = () => {
    if (phase.value !== 'observation') return;

    boardApis.value.forEach((api, index) => {
      const seq = sequences[index];
      if (seq && currentMoveIndex < seq.length) {
        try {
          api.move(seq[currentMoveIndex].san);
        } catch {
          // Ignorer si le coup échoue
        }
      }
    });

    currentMoveIndex++;

    if (currentMoveIndex < maxMoves) {
      masterPlaybackTimer = setTimeout(playStep, MOVE_INTERVAL_MS);
    } else {
      // Tous les échiquiers attendent la fin de la séquence la plus longue, puis redémarrent ensemble
      masterPlaybackTimer = setTimeout(() => {
        if (phase.value !== 'observation') return;
        const resetFen = props.fenDepart || 'start';
        boardApis.value.forEach((api) => {
          api.setPosition(resetFen);
        });
        currentMoveIndex = 0;
        masterPlaybackTimer = setTimeout(playStep, MOVE_INTERVAL_MS);
      }, END_PAUSE_MS);
    }
  };

  masterPlaybackTimer = setTimeout(playStep, MOVE_INTERVAL_MS);
};

const onScenarioBoardCreated = (index: number, api: BoardCore) => {
  boardApis.value.set(index, api);
  api.setPosition(props.fenDepart || 'start');
  startSynchronizedPlayback();
};

watch([() => props.fenDepart, () => props.scenarios], ([newFen]) => {
  if (mainBoardApi.value && newFen) {
    mainBoardApi.value.setPosition(newFen);
  }
  startSynchronizedPlayback();
});

const selectScenario = async (index: number) => {
  if (phase.value !== 'observation') return;

  const scenario = props.scenarios[index];
  if (!scenario) return;

  if (scenario.is_correct) {
    clearAllTimers();
    isPgnFinished.value = !props.pgnExplication?.trim();
    phase.value = 'explication';
    await showSuccess("Excellente analyse ! Voici l'explication détaillée.", 2000);
  } else {
    await showError("Ce n'est pas le meilleur plan, observe encore !", 2500);
  }
};

const onPgnFinished = () => {
  isPgnFinished.value = true;
};

const onSuccess = () => {
  emit('success');
};
</script>
