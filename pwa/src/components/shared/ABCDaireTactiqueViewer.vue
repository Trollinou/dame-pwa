<template>
  <div class="abcdaire-viewer-wrapper">
    <!-- En-tête Unifié de l'exercice -->
    <ExerciseHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneTexte"
      :stepBadgeText="`Carte ${indexCourant + 1} / ${exercicesListe.length}`"
    />

    <!-- Phase 1 : Jeu interactif du coup -->
    <div v-if="etapeJeu === 'playing'" class="chessboard-panel">
      <div class="chessboard-container">
        <Chessboard
          :key="`play-${indexCourant}-${fenDepart}`"
          mode="game"
          :fen="fenDepart"
          :orientation="couleurJoueur"
          :player-color="couleurJoueur"
          :view-only="isComputerPlaying"
          :highlight-last-move="true"
          @board-created="onBoardCreated"
          @move="verifierCoup"
        />
      </div>
    </div>

    <!-- Phase 2 : Révélation & Relecture PGN -->
    <div v-else-if="etapeJeu === 'recap'" class="recap-stage animate-fade-in">
      <PgnViewer
        :key="`recap-${indexCourant}`"
        :pgnString="currentPgnForViewer"
        :orientation="couleurJoueur"
        :hideEndButton="true"
        @finished="onPgnFinished"
      />
    </div>

    <!-- Footer de Navigation par Carte avec Feedback Fixe -->
    <SeriesCardFooter
      :currentCard="indexCourant + 1"
      :totalCards="exercicesListe.length"
      :isSolved="isCardSolved"
      :disabled="!isPgnFinished"
      :feedback="feedback"
      pendingHint="Trouvez le bon coup pour continuer"
      disabledHint="Visionnez tous les coups du PGN pour continuer"
      @next="passerCarteSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import PgnViewer from '@/components/shared/PgnViewer.vue';
import type { BoardCore, DrawShape, Move } from 'eg-chessboard';
import { getActiveColorFromFen } from '@/utils/fenUtils';
import ExerciseHeader from '@/components/shared/ExerciseHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { parsePgn } from 'chessops/pgn';
import { parseFen } from 'chessops/fen';
import { parseSan, makeSanAndPlay } from 'chessops/san';
import { Chess } from 'chessops';

export interface ExerciceABCDaire {
  pgn: string;
}

const props = defineProps<{
  consigne?: string;
  exercices?: ExerciceABCDaire[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
  // Rétrocompatibilité ancien format
  fen?: string;
  solution?: string[];
  couleurJoueur?: 'white' | 'black';
  shapes?: DrawShape[];
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const headerMeta = computed(() => ({
  title: props.metaTitre || 'T3 - ABCDaire Tactique',
  typeLabel: props.metaTypeLabel || 'ABCDaire Tactique',
  chapitreNiveauLabel: props.metaChapitreNiveauLabel || '',
}));

const indexCourant = ref(0);
const etapeJeu = ref<'playing' | 'recap'>('playing');
const isCardSolved = ref(false);
const isPgnFinished = ref(false);
const isComputerPlaying = ref(false);
const currentMoveIndex = ref(0);
const boardApi = ref<BoardCore | null>(null);
const feedback = ref<CardFeedback | null>(null);

// Normalisation de la liste des 4 exercices
const exercicesListe = computed<ExerciceABCDaire[]>(() => {
  if (props.exercices && Array.isArray(props.exercices) && props.exercices.length > 0) {
    return props.exercices;
  }
  // Rétrocompatibilité avec format FEN / solution
  if (props.fen) {
    const legacyPgn =
      `[SetUp "1"]\n[FEN "${props.fen}"]\n\n` +
      (props.solution ? props.solution.join(' ') : '');
    return [{ pgn: legacyPgn }];
  }
  return [
    { pgn: '' },
    { pgn: '' },
    { pgn: '' },
    { pgn: '' }
  ];
});

const consigneTexte = computed<string>(() => {
  return props.consigne || 'Trouver le meilleur coup.';
});

const exerciceCourant = computed<ExerciceABCDaire>(() => {
  return exercicesListe.value[indexCourant.value] || exercicesListe.value[0];
});

const currentPgnForViewer = computed<string>(() => {
  const pgn = (exerciceCourant.value?.pgn || '').trim();
  if (pgn) return pgn;

  if (props.fen) {
    return `[SetUp "1"]\n[FEN "${props.fen}"]\n\n` + (props.solution ? props.solution.join(' ') : '');
  }
  return '';
});

// Extraction des données du PGN courant
interface ParsedMove {
  san: string;
}

const parsedPgnData = computed(() => {
  const rawPgn = currentPgnForViewer.value;
  const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  if (!rawPgn) {
    return {
      fen: defaultFen,
      orientation: 'white' as const,
      moves: [] as ParsedMove[],
    };
  }

  // 1. Extraction de la FEN initiale
  let fen = defaultFen;
  const fenMatch = rawPgn.match(/\[FEN\s+"([^"]+)"\]/i);
  if (fenMatch && fenMatch[1]) {
    fen = fenMatch[1].trim();
  }

  const orientation = getActiveColorFromFen(fen);

  // 2. Extraction des coups via chessops/pgn
  const moves: ParsedMove[] = [];
  try {
    const games = parsePgn(rawPgn);
    if (games.length > 0) {
      const game = games[0];
      const setupFen = game.headers.get('FEN') || fen;
      const setupRes = setupFen && setupFen !== 'start' ? parseFen(setupFen) : null;
      const chessSetup = setupRes && setupRes.isOk ? Chess.fromSetup(setupRes.value) : null;
      const pos = chessSetup && chessSetup.isOk ? chessSetup.value : null;

      let currentNode = game.moves;
      while (currentNode.children.length > 0) {
        const child = currentNode.children[0];
        if (pos) {
          const parsedMove = parseSan(pos, child.data.san);
          if (parsedMove) {
            const san = makeSanAndPlay(pos, parsedMove);
            moves.push({ san: san || child.data.san });
          } else {
            moves.push({ san: child.data.san });
          }
        } else {
          moves.push({ san: child.data.san });
        }
        currentNode = child;
      }
    }
  } catch (e) {
    console.warn('parsePgn parsing fallback:', e);
  }

  // Fallback token extraction si chessops n'a pas trouvé de coups
  if (moves.length === 0) {
    try {
      const setupRes = fen && fen !== 'start' ? parseFen(fen) : null;
      const chessSetup = setupRes && setupRes.isOk ? Chess.fromSetup(setupRes.value) : null;
      const pos = chessSetup && chessSetup.isOk ? chessSetup.value : null;
      const textWithoutComments = rawPgn
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\d+\.\.\.|\d+\./g, '')
        .trim();
      const tokens = textWithoutComments.split(/\s+/).filter((t) => t && t !== '...' && t !== '*' && t !== '1-0' && t !== '0-1' && t !== '1/2-1/2');
      for (const token of tokens) {
        if (pos) {
          const parsed = parseSan(pos, token);
          if (parsed) {
            const san = makeSanAndPlay(pos, parsed);
            moves.push({ san: san || token });
            continue;
          }
        }
        // Si la position est illégale (ex: FEN sans Roi) ou parseSan échoue, conserver le token brut
        moves.push({ san: token });
      }
    } catch {
      // Ignorer
    }
  }

  return {
    fen,
    orientation,
    moves,
  };
});

const fenDepart = computed<string>(() => parsedPgnData.value.fen);
const couleurJoueur = computed<'white' | 'black'>(() => parsedPgnData.value.orientation);
const movesSequence = computed<ParsedMove[]>(() => parsedPgnData.value.moves);

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  initialiserPositionJeu();
};

const initialiserPositionJeu = () => {
  etapeJeu.value = 'playing';
  isCardSolved.value = false;
  isPgnFinished.value = false;
  isComputerPlaying.value = false;
  currentMoveIndex.value = 0;
  feedback.value = null;

  if (boardApi.value) {
    boardApi.value.setPosition(fenDepart.value);
    boardApi.value.setShapes([]);
  }
};

// Réinitialisation lors du changement d'exercice dans la série
watch(indexCourant, () => {
  nextTick(() => {
    initialiserPositionJeu();
  });
});

const onPgnFinished = () => {
  isPgnFinished.value = true;
};

const activerModeRecapitulatif = () => {
  etapeJeu.value = 'recap';
  isCardSolved.value = true;
  isPgnFinished.value = false;
  feedback.value = {
    type: 'success',
    message: 'Bravo ! Exercice réussi.'
  };
};

const verifierCoup = async (move: Move) => {
  if (isComputerPlaying.value || isCardSolved.value || etapeJeu.value !== 'playing') {
    return;
  }

  const expectedMove = movesSequence.value[currentMoveIndex.value];
  if (!expectedMove) {
    return;
  }

  const coupAttenduSan = expectedMove.san;
  const isCoupCorrect =
    move.san === coupAttenduSan ||
    move.lan === coupAttenduSan ||
    `${move.from}${move.to}` === coupAttenduSan ||
    (move.san && coupAttenduSan.replace(/[+#x=]/g, '') === move.san.replace(/[+#x=]/g, ''));

  if (isCoupCorrect) {
    currentMoveIndex.value++;

    // Vérifie si la séquence de coups est terminée
    if (currentMoveIndex.value >= movesSequence.value.length) {
      // Fin du PGN atteinte par le coup gagnant du joueur
      activerModeRecapitulatif();
    } else {
      // Réponse de l'ordinateur
      isComputerPlaying.value = true;
      setTimeout(() => {
        if (!boardApi.value) return;
        const computerMove = movesSequence.value[currentMoveIndex.value];
        if (computerMove) {
          try {
            boardApi.value.move(computerMove.san);
            currentMoveIndex.value++;

            // Vérifie si le coup de l'ordinateur était le dernier coup du PGN
            if (currentMoveIndex.value >= movesSequence.value.length) {
              activerModeRecapitulatif();
            }
          } catch (err) {
            console.error('Erreur coup ordinateur:', err);
          } finally {
            isComputerPlaying.value = false;
          }
        } else {
          isComputerPlaying.value = false;
        }
      }, 500);
    }
  } else {
    // Mauvais coup
    boardApi.value?.undoLastMove();
    feedback.value = {
      type: 'danger',
      message: "Ce n'est pas le bon coup ! Cherchez encore."
    };
    setTimeout(() => {
      if (feedback.value?.type === 'danger') {
        feedback.value = null;
      }
    }, 2000);
  }
};

const passerCarteSuivante = () => {
  if (!isPgnFinished.value) {
    return;
  }
  feedback.value = null;
  if (indexCourant.value < exercicesListe.value.length - 1) {
    indexCourant.value += 1;
    etapeJeu.value = 'playing';
    isCardSolved.value = false;
    isPgnFinished.value = false;
    isComputerPlaying.value = false;
    currentMoveIndex.value = 0;
  } else {
    emit('success');
  }
};
</script>

<style scoped>
.abcdaire-viewer-wrapper {
  width: 100%;
}

.chessboard-panel,
.recap-stage {
  width: 100%;
  margin: 10px 0;
}



.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
