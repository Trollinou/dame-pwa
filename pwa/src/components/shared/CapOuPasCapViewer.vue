<template>
  <div class="cap-ou-pas-cap-viewer-wrapper">
    <!-- En-tête Unifié de l'exercice avec la consigne de la série -->
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneTexte"
      :stepBadgeText="`Carte ${indexCourant + 1} / ${exercicesListe.length}`"
    />

    <!-- Échiquier -->
    <div class="chessboard-panel">
      <div class="chessboard-container">
        <Chessboard
          :key="`cap-${indexCourant}-${currentPgnData.fen}`"
          :fen="fenAffichee"
          :shapes="shapesAffichees"
          :orientation="couleurJoueur"
          :player-color="couleurJoueur"
          :view-only="resolvedVariante !== 'move' || isCardSolved"
          :highlight-last-move="true"
          @board-created="onBoardCreated"
          @move="verifierCoup"
        />
      </div>
    </div>

    <!-- Zone d'interaction sous l'échiquier -->
    <div class="interaction-card animate-fade-in">
      <!-- Variante 1 : QCM Multiple (liste de propositions avec toggle Oui/Non) -->
      <div v-if="resolvedVariante === 'qcm_multiple'" class="qcm-multiple-panel">
        <div
          v-for="(prop, pIdx) in propositionsListe"
          :key="pIdx"
          class="proposition-row"
        >
          <div class="proposition-text">{{ prop }}</div>
          <div class="neutral-toggle">
            <button
              type="button"
              class="toggle-btn toggle-btn--oui"
              :class="{ 'is-selected': multipleAnswers[pIdx] === true }"
              :disabled="isCardSolved"
              @click="setMultipleAnswer(pIdx, true)"
            >
              <span class="toggle-icon">✓</span>
              <span class="toggle-label">OUI</span>
            </button>
            <button
              type="button"
              class="toggle-btn toggle-btn--non"
              :class="{ 'is-selected': multipleAnswers[pIdx] === false }"
              :disabled="isCardSolved"
              @click="setMultipleAnswer(pIdx, false)"
            >
              <span class="toggle-icon">✗</span>
              <span class="toggle-label">NON</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Variante 2 : QCM Oui/Non (question commune avec toggle Oui/Non) -->
      <div v-else-if="resolvedVariante === 'qcm_oui_non'" class="qcm-oui-non-panel">
        <div class="question-header">
          <span class="question-text">{{ questionTexte }}</span>
        </div>
        <div class="neutral-toggle neutral-toggle--large">
          <button
            type="button"
            class="toggle-btn toggle-btn--oui"
            :class="{ 'is-selected': singleAnswer === true }"
            :disabled="isCardSolved"
            @click="setSingleAnswer(true)"
          >
            <span class="toggle-icon">✓</span>
            <span class="toggle-label">OUI</span>
          </button>
          <button
            type="button"
            class="toggle-btn toggle-btn--non"
            :class="{ 'is-selected': singleAnswer === false }"
            :disabled="isCardSolved"
            @click="setSingleAnswer(false)"
          >
            <span class="toggle-icon">✗</span>
            <span class="toggle-label">NON</span>
          </button>
        </div>
      </div>

      <!-- Variante 3 : Move (Déplacement attendu) -->
      <div v-else-if="resolvedVariante === 'move'" class="move-panel">
        <div v-if="!isCardSolved" class="move-hint">
          <span class="move-hint-icon">♟</span>
          <span>Jouez le coup attendu directement sur l'échiquier.</span>
        </div>
        <div v-else class="move-success-hint">
          <span class="move-success-icon">✓</span>
          <span>{{ exerciceCourant.move_explication || 'Coup réussi !' }}</span>
        </div>
      </div>

      <!-- Variante 4 : Notation (Saisie de la position de chaque pièce) -->
      <div v-else-if="resolvedVariante === 'notation'" class="notation-panel">
        <div class="notation-pieces-list">
          <div
            v-for="(pieceItem, pIdx) in currentBoardPieces"
            :key="pieceItem.id"
            class="notation-piece-row"
            :class="{
              'is-valid': isNotationRowValid(pIdx) === true,
              'is-invalid': isNotationRowValid(pIdx) === false
            }"
          >
            <div class="piece-info">
              <div :class="['piece-icon-box', 'cg-board', `piece-set-${chessPreferences.pieceSet || 'cburnett'}`]">
                <piece :class="['piece', pieceItem.role, pieceItem.color]"></piece>
              </div>
              <span class="piece-label">{{ pieceItem.label }}</span>
            </div>

            <div class="notation-input-wrapper">
              <input
                type="text"
                class="notation-input"
                :value="notationInputs[pIdx] || ''"
                :disabled="isCardSolved"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                maxlength="5"
                @input="onNotationInput(pIdx, ($event.target as HTMLInputElement).value)"
              />
              <span v-if="isNotationRowValid(pIdx) === true" class="notation-status-icon success-icon">✓</span>
              <span v-else-if="isNotationRowValid(pIdx) === false" class="notation-status-icon error-icon">✗</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer de Navigation par Carte avec Feedback Fixe -->
    <SeriesCardFooter
      :currentCard="indexCourant + 1"
      :totalCards="exercicesListe.length"
      :isSolved="isCardSolved"
      :feedback="feedback"
      :pendingHint="pendingHintTexte"
      @next="passerCarteSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { Chessboard } from '@/components/shared/Chessboard';
import type { BoardCore, DrawShape, Move, Key } from 'eg-chessboard';
import { getActiveColorFromFen } from '@/utils/fenUtils';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { parsePgn } from 'chessops/pgn';
import { parseFen } from 'chessops/fen';
import { parseSan, makeSanAndPlay } from 'chessops/san';
import { Chess } from 'chessops';
import { useChessPreferencesStore } from '@/stores/chessPreferences';

const chessPreferences = useChessPreferencesStore();

export interface ExerciceCapOuPasCap {
  pgn?: string;
  fen?: string;
  couleur_joueur?: 'white' | 'black';
  shapes?: DrawShape[];
  reponses_multiple?: boolean[];
  reponse_oui_non?: boolean;
  qcm_bonne_reponse?: number;
  move_san?: string;
  move_explication?: string;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    variante?: string;
    propositions?: string[];
    question?: string;
    exercices?: ExerciceCapOuPasCap[];
    metaTitre?: string;
    metaTypeLabel?: string;
    metaChapitreNiveauLabel?: string;
  }>(),
  {
    consigne: '',
    variante: 'qcm_oui_non',
    propositions: () => [],
    question: '',
    exercices: () => [],
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const headerMeta = computed(() => ({
  title: props.metaTitre || 'T14 - Cap ou pas Cap ?',
  typeLabel: props.metaTypeLabel || 'Cap ou pas Cap ?',
  chapitreNiveauLabel: props.metaChapitreNiveauLabel || '',
}));

const indexCourant = ref(0);
const isCardSolved = ref(false);
const boardApi = ref<BoardCore | null>(null);
const feedback = ref<CardFeedback | null>(null);

const multipleAnswers = ref<(boolean | null)[]>([]);
const singleAnswer = ref<boolean | null>(null);

const resolvedVariante = computed<'qcm_multiple' | 'qcm_oui_non' | 'move' | 'notation'>(() => {
  const v = props.variante || 'qcm_oui_non';
  if (v === 'qcm') return 'qcm_oui_non';
  if (v === 'qcm_multiple' || v === 'qcm_oui_non' || v === 'move' || v === 'notation') return v;
  return 'qcm_oui_non';
});

const consigneTexte = computed<string>(() => {
  return props.consigne || 'Relevez le défi Cap ou pas Cap ?';
});

const propositionsListe = computed<string[]>(() => {
  if (props.propositions && Array.isArray(props.propositions) && props.propositions.length > 0) {
    return props.propositions;
  }
  return [];
});

const questionTexte = computed<string>(() => {
  return props.question || 'Cette action est-elle possible dans cette position ?';
});

const exercicesListe = computed<ExerciceCapOuPasCap[]>(() => {
  if (props.exercices && Array.isArray(props.exercices) && props.exercices.length > 0) {
    return props.exercices;
  }
  return [
    { pgn: '' },
    { pgn: '' },
    { pgn: '' },
    { pgn: '' },
    { pgn: '' },
  ];
});

const exerciceCourant = computed<ExerciceCapOuPasCap>(() => {
  return exercicesListe.value[indexCourant.value] || exercicesListe.value[0];
});

const pendingHintTexte = computed<string>(() => {
  if (resolvedVariante.value === 'move') {
    return "Jouez le coup attendu pour continuer";
  }
  if (resolvedVariante.value === 'notation') {
    return "Saisissez la notation de chaque pièce pour continuer";
  }
  return "Sélectionnez vos réponses pour continuer";
});

// Extraction et parsing PGN du mini-PGN courant
interface ParsedPgnData {
  fen: string;
  fenAfterMoves: string;
  orientation: 'white' | 'black';
  shapes: DrawShape[];
  moves: string[];
}

const currentPgnData = computed<ParsedPgnData>(() => {
  const rawPgn = (exerciceCourant.value?.pgn || '').trim();
  const defaultFen = exerciceCourant.value?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const initialShapes: DrawShape[] = Array.isArray(exerciceCourant.value?.shapes) ? [...exerciceCourant.value.shapes] : [];

  if (!rawPgn) {
    return {
      fen: defaultFen,
      fenAfterMoves: defaultFen,
      orientation: exerciceCourant.value?.couleur_joueur || getActiveColorFromFen(defaultFen),
      shapes: initialShapes,
      moves: [],
    };
  }

  let fen = defaultFen;
  const fenMatch = rawPgn.match(/\[FEN\s+"([^"]+)"\]/i);
  if (fenMatch && fenMatch[1]) {
    fen = fenMatch[1].trim();
  }

  const orientation = (exerciceCourant.value?.couleur_joueur || getActiveColorFromFen(fen)) as 'white' | 'black';
  const moves: string[] = [];
  const extractedShapes: DrawShape[] = [...initialShapes];

  try {
    const games = parsePgn(rawPgn);
    if (games.length > 0) {
      const game = games[0];
      const setupFen = game.headers.get('FEN') || fen;
      const setupRes = setupFen && setupFen !== 'start' ? parseFen(setupFen) : null;
      const chessSetup = setupRes && setupRes.isOk ? Chess.fromSetup(setupRes.value) : null;
      const pos = chessSetup && chessSetup.isOk ? chessSetup.value : null;

      // Extraction des commentaires et annotations shapes [%cal ...] [%csl ...]
      const allComments: string[] = [];
      if (Array.isArray(game.comments)) {
        allComments.push(...game.comments);
      }

      let currentNode = game.moves;
      while (currentNode.children.length > 0) {
        const child = currentNode.children[0];
        if (Array.isArray(child.data.comments)) {
          allComments.push(...child.data.comments);
        }
        if (pos) {
          const parsedMove = parseSan(pos, child.data.san);
          if (parsedMove) {
            const san = makeSanAndPlay(pos, parsedMove);
            moves.push(san || child.data.san);
          } else {
            moves.push(child.data.san);
          }
        } else {
          moves.push(child.data.san);
        }
        currentNode = child;
      }

      // Parser les flèches et cercles dans les commentaires
      if (allComments.length > 0) {
        const fullText = allComments.join(' ');
        const calRegex = /\[%(?:cal|cpl)\s+([^\]]+)\]/gi;
        let calMatch: RegExpExecArray | null;
        while ((calMatch = calRegex.exec(fullText)) !== null) {
          const items = calMatch[1].split(',');
          for (const item of items) {
            const clean = item.trim();
            if (clean.length >= 5) {
              const brushChar = clean[0].toLowerCase();
              const orig = clean.substring(1, 3).toLowerCase() as Key;
              const dest = clean.substring(3, 5).toLowerCase() as Key;
              const brush = brushChar === 'y' || brushChar === 'o' ? 'yellow' : brushChar === 'b' ? 'blue' : brushChar === 'r' ? 'red' : 'green';
              extractedShapes.push({ orig, dest, brush });
            }
          }
        }

        const cslRegex = /\[%(?:csl)\s+([^\]]+)\]/gi;
        let cslMatch: RegExpExecArray | null;
        while ((cslMatch = cslRegex.exec(fullText)) !== null) {
          const items = cslMatch[1].split(',');
          for (const item of items) {
            const clean = item.trim();
            if (clean.length >= 3) {
              const brushChar = clean[0].toLowerCase();
              const orig = clean.substring(1, 3).toLowerCase() as Key;
              const brush = brushChar === 'y' || brushChar === 'o' ? 'yellow' : brushChar === 'b' ? 'blue' : brushChar === 'r' ? 'red' : 'green';
              extractedShapes.push({ orig, brush });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Erreur parsePgn dans CapOuPasCapViewer:', e);
  }

  // Calcul de la FEN après les coups du mini-PGN si applicable
  let fenAfterMoves = fen;
  if (moves.length > 0) {
    try {
      const setupRes = fen && fen !== 'start' ? parseFen(fen) : null;
      const chessSetup = setupRes && setupRes.isOk ? Chess.fromSetup(setupRes.value) : null;
      const pos = chessSetup && chessSetup.isOk ? chessSetup.value : null;
      if (pos) {
        for (const moveSan of moves) {
          const parsed = parseSan(pos, moveSan);
          if (parsed) {
            makeSanAndPlay(pos, parsed);
          }
        }
        // FEN après coup
      }
    } catch (e) {
      console.warn('Erreur calcul FEN après coup:', e);
    }
  }

  return {
    fen,
    fenAfterMoves,
    orientation,
    shapes: extractedShapes,
    moves,
  };
});

const fenAffichee = computed<string>(() => {
  return currentPgnData.value.fen;
});

const couleurJoueur = computed<'white' | 'black'>(() => {
  return currentPgnData.value.orientation;
});

const shapesAffichees = computed<DrawShape[]>(() => {
  if (isCardSolved.value) {
    return currentPgnData.value.shapes;
  }
  return [];
});

export interface BoardPieceItem {
  id: string;
  role: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
  square: string;
  letterFr: string;
  expectedNotation: string;
  label: string;
}

function extractPiecesFromFen(fen: string): BoardPieceItem[] {
  if (!fen || typeof fen !== 'string') return [];
  const cleanFen = fen.trim();
  const placement = cleanFen.split(' ')[0] || '';
  const rows = placement.split('/');
  if (rows.length !== 8) return [];

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const pieces: BoardPieceItem[] = [];

  const roleOrder: Record<string, number> = {
    king: 1,
    queen: 2,
    rook: 3,
    bishop: 4,
    knight: 5,
    pawn: 6,
  };

  rows.forEach((rowStr, rowIndex) => {
    const rank = 8 - rowIndex;
    let fileIdx = 0;

    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char >= '1' && char <= '8') {
        fileIdx += parseInt(char, 10);
      } else {
        const file = files[fileIdx] || 'a';
        const square = `${file}${rank}`;
        const isWhite = char === char.toUpperCase();
        const color: 'white' | 'black' = isWhite ? 'white' : 'black';
        const lower = char.toLowerCase();

        let role: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn' = 'pawn';
        let letterFr = '';
        let nameFr = 'Pion';
        let isFeminine = false;

        switch (lower) {
          case 'k':
            role = 'king';
            letterFr = 'R';
            nameFr = 'Roi';
            break;
          case 'q':
            role = 'queen';
            letterFr = 'D';
            nameFr = 'Dame';
            isFeminine = true;
            break;
          case 'r':
            role = 'rook';
            letterFr = 'T';
            nameFr = 'Tour';
            isFeminine = true;
            break;
          case 'b':
            role = 'bishop';
            letterFr = 'F';
            nameFr = 'Fou';
            break;
          case 'n':
            role = 'knight';
            letterFr = 'C';
            nameFr = 'Cavalier';
            break;
          case 'p':
          default:
            role = 'pawn';
            letterFr = '';
            nameFr = 'Pion';
            break;
        }

        const colorAdjective = isWhite
          ? (isFeminine ? 'blanche' : 'blanc')
          : (isFeminine ? 'noire' : 'noir');
        const label = `${nameFr} ${colorAdjective}`;
        const expectedNotation = `${letterFr}${square}`;

        pieces.push({
          id: `${color}-${letterFr || 'P'}-${square}-${pieces.length}`,
          role,
          color,
          square,
          letterFr,
          expectedNotation,
          label,
        });

        fileIdx++;
      }
    }
  });

  pieces.sort((a, b) => {
    if (a.color !== b.color) {
      return a.color === 'white' ? -1 : 1;
    }
    const orderA = roleOrder[a.role] || 99;
    const orderB = roleOrder[b.role] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.square.localeCompare(b.square);
  });

  return pieces;
}

const currentBoardPieces = computed<BoardPieceItem[]>(() => {
  return extractPiecesFromFen(currentPgnData.value.fen);
});

const notationInputs = ref<string[]>([]);

const normalizeNotation = (raw: string): string => {
  const clean = (raw || '').trim().replace(/\s+/g, '');
  if (!clean) return '';
  if (clean.length === 2) {
    return clean.toLowerCase();
  }
  if (clean.length >= 3) {
    const pieceChar = clean[0].toUpperCase();
    const squarePart = clean.slice(1).toLowerCase();
    return `${pieceChar}${squarePart}`;
  }
  return clean;
};

const isNotationRowValid = (idx: number): boolean | null => {
  const val = (notationInputs.value[idx] || '').trim();
  if (!val) return null;

  const item = currentBoardPieces.value[idx];
  if (!item) return null;

  const normalized = normalizeNotation(val);

  if (normalized === item.expectedNotation) {
    return true;
  }

  // Check among identical piece types on the board
  const samePieces = currentBoardPieces.value.filter(
    (p) => p.role === item.role && p.color === item.color
  );
  const matchingPiece = samePieces.find((p) => p.expectedNotation === normalized);
  if (matchingPiece) {
    const firstOccurIdx = currentBoardPieces.value.findIndex(
      (p, i) => p.role === item.role && p.color === item.color && normalizeNotation(notationInputs.value[i] || '') === normalized
    );
    if (firstOccurIdx === idx) {
      return true;
    }
  }

  return false;
};

const onNotationInput = (idx: number, val: string) => {
  if (isCardSolved.value) return;

  notationInputs.value[idx] = val;

  const pieces = currentBoardPieces.value;
  if (pieces.length === 0) return;

  const allFilled = notationInputs.value.length === pieces.length &&
    notationInputs.value.every((v) => (v || '').trim().length > 0);

  const allCorrect = pieces.every((_, i) => isNotationRowValid(i) === true);

  if (allCorrect) {
    isCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: 'Bravo ! Toutes les notations de pièces sont exactes.',
    };
    if (boardApi.value) {
      boardApi.value.setShapes(currentPgnData.value.shapes);
    }
  } else if (allFilled) {
    feedback.value = {
      type: 'danger',
      message: "Certaines notations sont inexactes. Vérifiez l'initiale de la pièce et les coordonnées.",
    };
  } else {
    feedback.value = null;
  }
};

const initCardState = () => {
  isCardSolved.value = false;
  feedback.value = null;
  singleAnswer.value = null;
  multipleAnswers.value = propositionsListe.value.map(() => null);
  notationInputs.value = currentBoardPieces.value.map(() => '');

  nextTick(() => {
    if (boardApi.value) {
      boardApi.value.setPosition(currentPgnData.value.fen);
      boardApi.value.setShapes([]);

      // Si le mini-pgn contient 1 coup d'animation initial
      if (currentPgnData.value.moves.length > 0 && resolvedVariante.value !== 'move') {
        const moveSan = currentPgnData.value.moves[0];
        setTimeout(() => {
          if (boardApi.value) {
            boardApi.value.move(moveSan);
          }
        }, 300);
      }
    }
  });
};

watch(indexCourant, () => {
  initCardState();
}, { immediate: true });

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  initCardState();
};

const setMultipleAnswer = (propIdx: number, val: boolean) => {
  if (isCardSolved.value) return;

  multipleAnswers.value[propIdx] = val;

  // Vérifier si toutes les propositions ont reçu une réponse
  const allAnswered = multipleAnswers.value.length > 0 &&
    multipleAnswers.value.every((ans) => ans !== null);

  if (allAnswered) {
    const expected = exerciceCourant.value.reponses_multiple || [];
    let isAllCorrect = true;

    for (let i = 0; i < propositionsListe.value.length; i++) {
      const expVal = typeof expected[i] === 'boolean' ? expected[i] : true;
      if (multipleAnswers.value[i] !== expVal) {
        isAllCorrect = false;
        break;
      }
    }

    if (isAllCorrect) {
      isCardSolved.value = true;
      feedback.value = {
        type: 'success',
        message: 'Excellent ! Toutes vos réponses sont exactes.',
      };
      if (boardApi.value) {
        boardApi.value.setShapes(currentPgnData.value.shapes);
      }
    } else {
      feedback.value = {
        type: 'danger',
        message: 'Certaines réponses sont inexactes. Modifiez vos choix.',
      };
    }
  } else {
    feedback.value = null;
  }
};

const setSingleAnswer = (val: boolean) => {
  if (isCardSolved.value) return;

  singleAnswer.value = val;

  let expected = true;
  if (typeof exerciceCourant.value.reponse_oui_non === 'boolean') {
    expected = exerciceCourant.value.reponse_oui_non;
  } else if (typeof exerciceCourant.value.qcm_bonne_reponse === 'number') {
    expected = exerciceCourant.value.qcm_bonne_reponse === 0;
  }

  if (val === expected) {
    isCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: "Bravo ! C'est la bonne réponse.",
    };
    if (boardApi.value) {
      boardApi.value.setShapes(currentPgnData.value.shapes);
    }
  } else {
    feedback.value = {
      type: 'danger',
      message: 'Mauvaise réponse. Réessayez !',
    };
  }
};

const verifierCoup = (move: Move) => {
  if (isCardSolved.value || resolvedVariante.value !== 'move') return;

  const expectedSan = (exerciceCourant.value.move_san || '').trim();
  const playerColorShort = (couleurJoueur.value === 'black') ? 'b' : 'w';

  if (move.color !== playerColorShort) {
    return;
  }

  if (move.san === expectedSan) {
    isCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: exerciceCourant.value.move_explication || 'Bien joué ! Coup gagnant.',
    };
    if (boardApi.value) {
      boardApi.value.setShapes(currentPgnData.value.shapes);
    }
  } else {
    boardApi.value?.undoLastMove();
    feedback.value = {
      type: 'danger',
      message: exerciceCourant.value.move_explication || "Ce n'est pas le bon coup. Réessayez !",
    };
  }
};

const passerCarteSuivante = () => {
  if (indexCourant.value < exercicesListe.value.length - 1) {
    indexCourant.value++;
  } else {
    emit('success');
  }
};
</script>

<style scoped>
.cap-ou-pas-cap-viewer-wrapper {
  width: 100%;
}

.chessboard-panel {
  width: 100%;
  margin: 4px 0;
}

.interaction-card {
  width: 100%;
  margin: 6px 0 12px 0;
  background: var(--ion-card-background, #ffffff);
  border-radius: 10px;
  border: 1px solid var(--ion-color-step-150, #e2e4e7);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  padding: 8px 10px;
  box-sizing: border-box;
}

/* QCM Multiple Panel */
.qcm-multiple-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.proposition-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: var(--ion-color-step-50, #f9fafb);
  border: 1px solid var(--ion-color-step-150, #eef0f2);
  border-radius: 6px;
  box-sizing: border-box;
}

.proposition-text {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ion-color-step-850, #1f2937);
  flex: 1;
  line-height: 1.3;
}

/* QCM Oui/Non Panel */
.qcm-oui-non-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 6px 4px;
}

.question-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.question-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ion-color-step-900, #111827);
  line-height: 1.4;
}

/* Move Panel */
.move-panel {
  padding: 8px;
  text-align: center;
}

.move-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ion-color-step-650, #4b5563);
}

.move-hint-icon {
  font-size: 1.25rem;
}

.move-success-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #198754;
}

.move-success-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

/* Neutral Toggle (3-state: neutral -> Oui/Non) */
.neutral-toggle {
  display: inline-flex;
  align-items: center;
  background: var(--ion-color-step-100, #f1f3f5);
  border: 1px solid var(--ion-color-step-250, #d1d5db);
  border-radius: 30px;
  padding: 2px 3px;
  gap: 3px;
  user-select: none;
  flex-shrink: 0;
}

.neutral-toggle--large {
  padding: 4px;
  gap: 8px;
  border-radius: 36px;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--ion-color-step-600, #6b7280);
  font-size: 0.82rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.neutral-toggle--large .toggle-btn {
  font-size: 0.95rem;
  padding: 8px 24px;
  border-radius: 28px;
}

.toggle-icon {
  font-size: 0.9rem;
  font-weight: 800;
}

.toggle-btn--oui:hover:not(:disabled) {
  color: #198754;
  background: rgba(25, 135, 84, 0.08);
}

.toggle-btn--non:hover:not(:disabled) {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.08);
}

.toggle-btn--oui.is-selected {
  background: #198754 !important;
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(25, 135, 84, 0.35);
}

.toggle-btn--non.is-selected {
  background: #dc3545 !important;
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(220, 53, 69, 0.35);
}

.toggle-btn:disabled {
  opacity: 0.8;
  cursor: default;
}

/* Notation Panel */
.notation-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px;
}

.notation-pieces-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 2px;
}

.notation-piece-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: var(--ion-color-step-50, #f9fafb);
  border: 1.5px solid var(--ion-color-step-150, #eef0f2);
  border-radius: 8px;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.notation-piece-row.is-valid {
  border-color: #198754;
  background: rgba(25, 135, 84, 0.05);
}

.notation-piece-row.is-invalid {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.05);
}

.piece-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.piece-icon-box {
  position: relative;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-step-100, #f3f4f6);
  border-radius: 6px;
  overflow: hidden;
}

.piece-icon-box piece {
  width: 32px;
  height: 32px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  display: block;
}

.piece-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ion-color-step-850, #1f2937);
  line-height: 1.2;
}

.notation-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 110px;
  flex-shrink: 0;
}

.notation-input {
  width: 100%;
  height: 34px;
  border: 1.5px solid var(--ion-color-step-250, #d1d5db);
  border-radius: 6px;
  padding: 4px 26px 4px 8px;
  font-size: 0.95rem;
  font-weight: 700;
  font-family: inherit;
  color: var(--ion-color-step-900, #111827);
  background: #ffffff;
  text-align: center;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.notation-input:focus {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 0 0 2px rgba(56, 128, 255, 0.15);
}

.notation-input:disabled {
  background: var(--ion-color-step-100, #f3f4f6);
  color: var(--ion-color-step-700, #374151);
  cursor: default;
}

.notation-status-icon {
  position: absolute;
  right: 8px;
  font-size: 1rem;
  font-weight: 800;
  pointer-events: none;
}

.success-icon {
  color: #198754;
}

.error-icon {
  color: #dc3545;
}
</style>


