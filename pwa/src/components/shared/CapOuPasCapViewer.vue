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
          :key="`cap-${indexCourant}-${currentPgnData.fen}-${setupPhase}-${clicPhase}`"
          :fen="fenAffichee"
          :shapes="shapesAffichees"
          :orientation="couleurJoueur"
          :player-color="couleurJoueur"
          :view-only="isBoardViewOnly"
          :highlight-last-move="true"
          @board-created="onBoardCreated"
          @move="verifierCoup"
          @square-click="onSquareClick"
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

      <!-- Variante 3 : Move (Déplacement attendu simple ou multi-coups) -->
      <div v-else-if="resolvedVariante === 'move'" class="move-panel">
        <div v-if="isMultiMove">
          <div class="multi-move-status">
            <span class="multi-move-badge">Trouvés : {{ foundMovesSan.length }} / {{ expectedMovesSan.length }}</span>
            <span v-if="!isCardSolved" class="multi-move-instruction">Trouvez tous les coups légaux possibles !</span>
            <span v-else class="multi-move-success">✓ Bravo ! Tous les coups ont été trouvés.</span>
          </div>
          <div v-if="foundMovesSan.length > 0" class="found-moves-chips">
            <span v-for="m in foundMovesSan" :key="m" class="move-chip">✓ {{ toFrenchNotation(m) }}</span>
          </div>
        </div>
        <div v-else>
          <div v-if="!isCardSolved" class="move-hint">
            <span class="move-hint-icon">♟</span>
            <span>Jouez le coup attendu directement sur l'échiquier.</span>
          </div>
          <div v-else class="move-success-hint">
            <span class="move-success-icon">✓</span>
            <span>{{ exerciceCourant.move_explication || 'Coup réussi !' }}</span>
          </div>
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

      <!-- Variante 5 : Clic (Sélection de cases / pièces sur l'échiquier) -->
      <div v-else-if="resolvedVariante === 'clic'" class="clic-panel">
        <div v-if="modeClic === 'materiel'" class="materiel-actions">
          <button
            type="button"
            class="action-btn action-btn--neutral"
            :disabled="isCardSolved"
            @click="verifierPasDeDifference"
          >
            ⚖️ Pas de différence de matériel
          </button>
        </div>
        <div v-if="!isCardSolved" class="clic-hint">
          <span class="clic-hint-icon">👆</span>
          <span v-if="modeClic === 'materiel'">Cliquez sur les pièces excédentaires pour les entourer.</span>
          <span v-else-if="modeClic === 'prises_meilleur_coup' && clicPhase === 'clic'">
            Étape 1/2 : Cliquez sur les pièces attaquées ({{ userSelectedSquares.size }} / {{ targetCirclesCount }} trouvée{{ targetCirclesCount > 1 ? 's' : '' }}).
          </span>
          <span v-else-if="modeClic === 'prises_meilleur_coup' && clicPhase === 'move'">Étape 2/2 : Jouez maintenant la meilleure prise !</span>
          <span v-else>Cliquez sur les pièces ou cases cibles pour les entourer ({{ userSelectedSquares.size }} / {{ targetCirclesCount }}).</span>
        </div>
        <div v-else class="move-success-hint">
          <span class="move-success-icon">✓</span>
          <span v-if="modeClic === 'prises_meilleur_coup'">{{ exerciceCourant.move_explication || 'Bravo ! Prises identifiées et meilleur coup joué avec succès.' }}</span>
          <span v-else>Bravo ! Vous avez trouvé toutes les cibles.</span>
        </div>
      </div>

      <!-- Variante 6 : Setup (Reconstitution d'échiquier) -->
      <div v-else-if="resolvedVariante === 'setup'" class="setup-panel">
        <!-- Mode Mémoire - Phase 1: Mémorisation -->
        <div v-if="modeSetup === 'memoire' && setupPhase === 'memorize'" class="setup-memorize-panel">
          <p class="setup-hint">👀 Mémorisez bien la position des pièces sur l'échiquier.</p>

          <div v-if="exerciceCourant.conseil" class="conseil-card">
            <span class="conseil-title">💡 Conseil de l'entraîneur :</span>
            <p class="conseil-text">{{ exerciceCourant.conseil }}</p>
          </div>

          <button type="button" class="action-btn action-btn--primary" @click="passerEnReconstitution">
            <span>{{ hasMemorizedOnce ? 'Reprendre la reconstitution' : "J'ai mémorisé !" }}</span>
          </button>
        </div>

        <!-- Mode Mémoire (Phase 2) ou Mode Texte -->
        <div v-else class="setup-reconstruct-panel">
          <div v-if="modeSetup === 'memoire'" class="setup-top-actions">
            <button
              type="button"
              class="action-btn action-btn--peek"
              :disabled="isCardSolved"
              @click="setupPhase = 'memorize'"
            >
              👁️ Revoir la position
            </button>
          </div>

          <div v-if="modeSetup === 'texte'" class="texte-description-box">
            <span class="texte-description-title">Position à reproduire :</span>
            <p class="texte-description-content">{{ textualPieceDescription }}</p>
          </div>

          <div v-if="modeSetup === 'texte' && exerciceCourant.conseil" class="conseil-card">
            <span class="conseil-title">💡 Conseil de l'entraîneur :</span>
            <p class="conseil-text">{{ exerciceCourant.conseil }}</p>
          </div>

          <!-- Palette des 12 pièces + Outil gomme (Grille 7 colonnes unifiée) -->
          <div :class="['setup-palette', 'cg-board', `piece-set-${chessPreferences.pieceSet || 'cburnett'}`]">
            <div class="setup-palette-grid">
              <!-- Ligne 1 : 6 pièces blanches (colonnes 1 à 6) -->
              <button
                v-for="p in palettePiecesWhite"
                :key="`white-${p.role}`"
                type="button"
                class="palette-btn"
                :class="{ 'is-selected': selectedPalettePiece?.role === p.role && selectedPalettePiece?.color === 'white' && !isEraseActive }"
                :disabled="isCardSolved"
                :aria-label="`Poser ${p.role} blanc`"
                @click="selectPalettePiece(p.role, 'white')"
              >
                <piece :class="['piece', p.role, 'white']"></piece>
              </button>

              <!-- Ligne 2 : 6 pièces noires (colonnes 1 à 6) -->
              <button
                v-for="p in palettePiecesBlack"
                :key="`black-${p.role}`"
                type="button"
                class="palette-btn"
                :class="{ 'is-selected': selectedPalettePiece?.role === p.role && selectedPalettePiece?.color === 'black' && !isEraseActive }"
                :disabled="isCardSolved"
                :aria-label="`Poser ${p.role} noir`"
                @click="selectPalettePiece(p.role, 'black')"
              >
                <piece :class="['piece', p.role, 'black']"></piece>
              </button>

              <!-- Colonne 7 : Outil gomme (s'étend sur les 2 lignes) -->
              <button
                type="button"
                class="palette-btn palette-btn--erase"
                :class="{ 'is-selected': isEraseActive }"
                :disabled="isCardSolved"
                title="Effacer une pièce"
                aria-label="Effacer une pièce"
                @click="toggleEraseTool"
              >
                <span class="erase-icon">❌</span>
              </button>
            </div>
          </div>
          <p class="setup-instruction">
            <span v-if="!isEraseActive">Pièce sélectionnée. Cliquez sur une case pour la poser.</span>
            <span v-else>Outil gomme actif. Cliquez sur une case pour retirer la pièce.</span>
          </p>
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
import { getActiveColorFromFen, parseFenPieces, filterYellowShapes, type PieceInfo } from '@/utils/fenUtils';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { parsePgn } from 'chessops/pgn';
import { parseFen } from 'chessops/fen';
import { parseSan, makeSanAndPlay } from 'chessops/san';
import { Chess } from 'chessops';
import { useChessPreferencesStore } from '@/stores/chessPreferences';
import { toFrenchNotation } from '@/utils/partieHerosParser';

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
  conseil?: string;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    variante?: string;
    mode_clic?: 'cibles' | 'materiel' | 'prises_meilleur_coup';
    mode_setup?: 'texte' | 'memoire';
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
    mode_clic: 'cibles',
    mode_setup: 'memoire',
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

// Clic Variant State
const userSelectedSquares = ref<Set<string>>(new Set());
const clicPhase = ref<'clic' | 'move'>('clic');

// Move Variant State (Multi-moves)
const foundMovesSan = ref<string[]>([]);

// Setup Variant State
const setupPhase = ref<'memorize' | 'reconstruct'>('memorize');
const hasMemorizedOnce = ref(false);
const selectedPalettePiece = ref<{ role: PieceInfo['role']; color: PieceInfo['color'] } | null>({
  role: 'pawn',
  color: 'white',
});
const isEraseActive = ref(false);
const placedPieces = ref<Map<string, { role: PieceInfo['role']; color: PieceInfo['color'] }>>(new Map());

const palettePiecesWhite: { role: PieceInfo['role'] }[] = [
  { role: 'king' },
  { role: 'queen' },
  { role: 'rook' },
  { role: 'bishop' },
  { role: 'knight' },
  { role: 'pawn' },
];

const palettePiecesBlack: { role: PieceInfo['role'] }[] = [
  { role: 'king' },
  { role: 'queen' },
  { role: 'rook' },
  { role: 'bishop' },
  { role: 'knight' },
  { role: 'pawn' },
];

const resolvedVariante = computed<'qcm_multiple' | 'qcm_oui_non' | 'move' | 'notation' | 'clic' | 'setup'>(() => {
  const v = props.variante || 'qcm_oui_non';
  if (v === 'qcm') return 'qcm_oui_non';
  if (v === 'qcm_multiple' || v === 'qcm_oui_non' || v === 'move' || v === 'notation' || v === 'clic' || v === 'setup') return v;
  return 'qcm_oui_non';
});

const modeClic = computed<'cibles' | 'materiel' | 'prises_meilleur_coup'>(() => {
  return props.mode_clic || 'cibles';
});

const modeSetup = computed<'texte' | 'memoire'>(() => {
  return props.mode_setup || 'memoire';
});

const isBoardViewOnly = computed<boolean>(() => {
  if (resolvedVariante.value === 'move') {
    return isCardSolved.value;
  }
  if (resolvedVariante.value === 'clic' && modeClic.value === 'prises_meilleur_coup') {
    return clicPhase.value !== 'move' || isCardSolved.value;
  }
  return true;
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
    return isMultiMove.value ? "Trouvez tous les coups légaux pour continuer" : "Jouez le coup attendu pour continuer";
  }
  if (resolvedVariante.value === 'notation') {
    return "Saisissez la notation de chaque pièce pour continuer";
  }
  if (resolvedVariante.value === 'clic') {
    if (modeClic.value === 'materiel') return "Entourez les pièces excédentaires pour continuer";
    if (modeClic.value === 'prises_meilleur_coup') {
      return clicPhase.value === 'clic'
        ? `Entourez toutes les pièces attaquées (${userSelectedSquares.value.size} / ${targetCirclesCount.value})`
        : "Jouez la meilleure prise pour continuer";
    }
    return `Entourez les pièces cibles (${userSelectedSquares.value.size} / ${targetCirclesCount.value})`;
  }
  if (resolvedVariante.value === 'setup') {
    return setupPhase.value === 'memorize' ? "Mémorisez la position puis retournez la carte" : "Placez les pièces sur l'échiquier pour continuer";
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
  alternativeMoves: string[];
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
      alternativeMoves: [],
    };
  }

  let fen = defaultFen;
  const fenMatch = rawPgn.match(/\[FEN\s+"([^"]+)"\]/i);
  if (fenMatch && fenMatch[1]) {
    fen = fenMatch[1].trim();
  }

  const orientation = (exerciceCourant.value?.couleur_joueur || getActiveColorFromFen(fen)) as 'white' | 'black';
  const moves: string[] = [];
  const alternativeMoves: string[] = [];
  const extractedShapes: DrawShape[] = [];

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

      // Extraction de toutes les variantes au premier coup
      if (game.moves && game.moves.children.length > 0) {
        for (const child of game.moves.children) {
          if (Array.isArray(child.data.comments)) {
            allComments.push(...child.data.comments);
          }
          if (pos) {
            const parsedMove = parseSan(pos.clone(), child.data.san);
            if (parsedMove) {
              const san = makeSanAndPlay(pos.clone(), parsedMove);
              alternativeMoves.push(san || child.data.san);
            } else {
              alternativeMoves.push(child.data.san);
            }
          } else {
            alternativeMoves.push(child.data.san);
          }
        }
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
              if (!extractedShapes.some((s) => s.orig === orig && s.dest === dest)) {
                extractedShapes.push({ orig, dest, brush });
              }
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
              if (!extractedShapes.some((s) => s.orig === orig && !s.dest)) {
                extractedShapes.push({ orig, brush });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Erreur parsePgn dans CapOuPasCapViewer:', e);
  }

  // Fallback direct sur le texte brut du PGN pour extraire les annotations de forme si non trouvées
  const calRegex = /\[%(?:cal|cpl)\s+([^\]]+)\]/gi;
  let calMatch: RegExpExecArray | null;
  while ((calMatch = calRegex.exec(rawPgn)) !== null) {
    const items = calMatch[1].split(',');
    for (const item of items) {
      const clean = item.trim();
      if (clean.length >= 5) {
        const brushChar = clean[0].toLowerCase();
        const orig = clean.substring(1, 3).toLowerCase() as Key;
        const dest = clean.substring(3, 5).toLowerCase() as Key;
        const brush = brushChar === 'y' || brushChar === 'o' ? 'yellow' : brushChar === 'b' ? 'blue' : brushChar === 'r' ? 'red' : 'green';
        if (!extractedShapes.some((s) => s.orig === orig && s.dest === dest)) {
          extractedShapes.push({ orig, dest, brush });
        }
      }
    }
  }

  const cslRegex = /\[%(?:csl)\s+([^\]]+)\]/gi;
  let cslMatch: RegExpExecArray | null;
  while ((cslMatch = cslRegex.exec(rawPgn)) !== null) {
    const items = cslMatch[1].split(',');
    for (const item of items) {
      const clean = item.trim();
      if (clean.length >= 3) {
        const brushChar = clean[0].toLowerCase();
        const orig = clean.substring(1, 3).toLowerCase() as Key;
        const brush = brushChar === 'y' || brushChar === 'o' ? 'yellow' : brushChar === 'b' ? 'blue' : brushChar === 'r' ? 'red' : 'green';
        if (!extractedShapes.some((s) => s.orig === orig && !s.dest)) {
          extractedShapes.push({ orig, brush });
        }
      }
    }
  }

  if (extractedShapes.length === 0 && initialShapes.length > 0) {
    extractedShapes.push(...initialShapes);
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
    alternativeMoves,
  };
});

// Multi-Move expected solutions
const expectedMovesSan = computed<string[]>(() => {
  const alts = currentPgnData.value.alternativeMoves;
  if (alts.length > 0) {
    return Array.from(new Set(alts));
  }
  const single = (exerciceCourant.value?.move_san || '').trim();
  if (single) {
    return [single];
  }
  return [];
});

const isMultiMove = computed<boolean>(() => {
  return resolvedVariante.value === 'move' && expectedMovesSan.value.length > 1;
});

// Setup FEN calculation
function buildFenFromPlacedPieces(piecesMap: Map<string, { role: PieceInfo['role']; color: PieceInfo['color'] }>, activeColor: 'white' | 'black' = 'white'): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rows: string[] = [];

  const pieceRoleToChar: Record<PieceInfo['role'], string> = {
    king: 'k',
    queen: 'q',
    rook: 'r',
    bishop: 'b',
    knight: 'n',
    pawn: 'p',
  };

  for (let r = 8; r >= 1; r--) {
    let emptyCount = 0;
    let rowStr = '';

    for (let f = 0; f < 8; f++) {
      const sq = `${files[f]}${r}`;
      const p = piecesMap.get(sq);

      if (p) {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        const char = pieceRoleToChar[p.role] || 'p';
        rowStr += p.color === 'white' ? char.toUpperCase() : char.toLowerCase();
      } else {
        emptyCount++;
      }
    }

    if (emptyCount > 0) {
      rowStr += emptyCount;
    }
    rows.push(rowStr);
  }

  const activeShort = activeColor === 'black' ? 'b' : 'w';
  return `${rows.join('/')} ${activeShort} - - 0 1`;
}

const fenAffichee = computed<string>(() => {
  if (resolvedVariante.value === 'setup') {
    if (setupPhase.value === 'reconstruct') {
      return buildFenFromPlacedPieces(placedPieces.value, couleurJoueur.value);
    }
  }
  return currentPgnData.value.fen;
});

const couleurJoueur = computed<'white' | 'black'>(() => {
  return currentPgnData.value.orientation;
});

const userClicShapes = computed<DrawShape[]>(() => {
  return Array.from(userSelectedSquares.value).map((sq) => ({
    orig: sq as Key,
    brush: 'red',
  }));
});

const initialGuideShapes = computed<DrawShape[]>(() => {
  return filterYellowShapes(currentPgnData.value.shapes) as DrawShape[];
});

const targetCircles = computed<string[]>(() => {
  const allCircles = currentPgnData.value.shapes.filter((s) => s.orig && !s.dest);
  // Seuls les cercles jaunes/oranges sont des repères visuels d'observation (non comptés dans les cibles à trouver).
  // Toutes les autres couleurs (rouge, vert, bleu, etc.) sont des cibles à trouver par l'élève.
  const targetCirclesList = allCircles.filter(
    (s) => s.brush !== 'yellow' && s.brush !== 'y' && s.brush !== 'o'
  );
  return Array.from(new Set(targetCirclesList.map((s) => s.orig.toLowerCase())));
});

const targetCirclesCount = computed<number>(() => {
  return targetCircles.value.length;
});

const shapesAffichees = computed<DrawShape[]>(() => {
  if (isCardSolved.value) {
    return currentPgnData.value.shapes;
  }
  if (resolvedVariante.value === 'clic') {
    return [...initialGuideShapes.value, ...userClicShapes.value];
  }
  if (resolvedVariante.value === 'setup' && setupPhase.value === 'reconstruct') {
    return [];
  }
  return initialGuideShapes.value;
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

// Description textuelle des pièces pour le mode setup texte
const textualPieceDescription = computed<string>(() => {
  const pieces = currentBoardPieces.value;
  const whites = pieces.filter((p) => p.color === 'white').map((p) => p.expectedNotation);
  const blacks = pieces.filter((p) => p.color === 'black').map((p) => p.expectedNotation);

  const parts: string[] = [];
  if (whites.length > 0) {
    parts.push(`Blancs : ${whites.join(', ')}`);
  }
  if (blacks.length > 0) {
    parts.push(`Noirs : ${blacks.join(', ')}`);
  }
  return parts.join(' — ');
});

const notationInputs = ref<string[]>([]);

const cleanNotation = (raw: string): string => {
  return (raw || '').trim();
};

const isNotationRowValid = (idx: number): boolean | null => {
  const val = cleanNotation(notationInputs.value[idx] || '');
  if (!val) return null;

  const item = currentBoardPieces.value[idx];
  if (!item) return null;

  if (val === item.expectedNotation) {
    return true;
  }

  // Check among identical piece types on the board with exact case match
  const samePieces = currentBoardPieces.value.filter(
    (p) => p.role === item.role && p.color === item.color
  );
  const matchingPiece = samePieces.find((p) => p.expectedNotation === val);
  if (matchingPiece) {
    const firstOccurIdx = currentBoardPieces.value.findIndex(
      (p, i) => p.role === item.role && p.color === item.color && cleanNotation(notationInputs.value[i] || '') === val
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

// Material Balance Calculation
interface MaterialBalance {
  isBalanced: boolean;
  whiteExcess: Record<string, number>;
  blackExcess: Record<string, number>;
  totalExcessPieces: number;
}

function calculateMaterialBalance(fen: string): MaterialBalance {
  const pieces = parseFenPieces(fen);
  const countsWhite: Record<string, number> = { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 };
  const countsBlack: Record<string, number> = { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 };

  for (const p of pieces) {
    if (p.color === 'white') {
      countsWhite[p.role] = (countsWhite[p.role] || 0) + 1;
    } else {
      countsBlack[p.role] = (countsBlack[p.role] || 0) + 1;
    }
  }

  const whiteExcess: Record<string, number> = {};
  const blackExcess: Record<string, number> = {};
  let totalExcess = 0;

  for (const role of ['queen', 'rook', 'bishop', 'knight', 'pawn']) {
    const diff = (countsWhite[role] || 0) - (countsBlack[role] || 0);
    if (diff > 0) {
      whiteExcess[role] = diff;
      totalExcess += diff;
    } else if (diff < 0) {
      blackExcess[role] = Math.abs(diff);
      totalExcess += Math.abs(diff);
    }
  }

  return {
    isBalanced: totalExcess === 0,
    whiteExcess,
    blackExcess,
    totalExcessPieces: totalExcess,
  };
}

// Clic Verification
const verifierClic = () => {
  if (isCardSolved.value) return;

  if (modeClic.value === 'materiel') {
    const balance = calculateMaterialBalance(currentPgnData.value.fen);
    const selectedList = Array.from(userSelectedSquares.value);
    const pieces = parseFenPieces(currentPgnData.value.fen);

    const selectedPieces = selectedList
      .map((sq) => pieces.find((p) => p.square.toLowerCase() === sq.toLowerCase()))
      .filter((p): p is PieceInfo => Boolean(p));

    if (selectedPieces.length !== balance.totalExcessPieces) {
      return;
    }

    // Check if the selected pieces match the excess by color and role
    const selWhite: Record<string, number> = {};
    const selBlack: Record<string, number> = {};

    for (const sp of selectedPieces) {
      if (sp.color === 'white') {
        selWhite[sp.role] = (selWhite[sp.role] || 0) + 1;
      } else {
        selBlack[sp.role] = (selBlack[sp.role] || 0) + 1;
      }
    }

    let isMatch = true;
    for (const [role, count] of Object.entries(balance.whiteExcess)) {
      if ((selWhite[role] || 0) !== count) isMatch = false;
    }
    for (const [role, count] of Object.entries(balance.blackExcess)) {
      if ((selBlack[role] || 0) !== count) isMatch = false;
    }

    if (isMatch) {
      isCardSolved.value = true;
      feedback.value = {
        type: 'success',
        message: 'Bravo ! Vous avez correctement identifié les pièces en plus.',
      };
      if (boardApi.value) {
        boardApi.value.setShapes(currentPgnData.value.shapes);
      }
    } else {
      feedback.value = {
        type: 'danger',
        message: 'Les pièces sélectionnées ne correspondent pas au différentiel de matériel.',
      };
    }
  } else {
    // Mode cibles précises [%csl]
    const targets = targetCircles.value;
    const selected = Array.from(userSelectedSquares.value).map((s) => s.toLowerCase());

    if (targets.length === 0) {
      return;
    }

    if (selected.length === targets.length) {
      const allFound = targets.every((t) => selected.includes(t));
      if (allFound) {
        if (modeClic.value === 'prises_meilleur_coup') {
          clicPhase.value = 'move';
          feedback.value = {
            type: 'success',
            message: "Bravo ! Toutes les prises ont été identifiées. Étape 2/2 : Jouez maintenant la meilleure prise !",
          };
        } else {
          isCardSolved.value = true;
          feedback.value = {
            type: 'success',
            message: 'Bravo ! Toutes les cibles ont été trouvées.',
          };
          if (boardApi.value) {
            boardApi.value.setShapes(currentPgnData.value.shapes);
          }
        }
      } else {
        feedback.value = {
          type: 'danger',
          message: modeClic.value === 'prises_meilleur_coup'
            ? 'Certaines pièces sélectionnées ne sont pas des prises possibles.'
            : 'Certaines pièces ou cases sélectionnées ne sont pas des cibles.',
        };
      }
    } else if (selected.length > targets.length) {
      feedback.value = {
        type: 'danger',
        message: modeClic.value === 'prises_meilleur_coup'
          ? 'Vous avez sélectionné trop de pièces. Cliquez sur une case pour désélectionner.'
          : 'Vous avez sélectionné trop de cibles.',
      };
    } else {
      feedback.value = null;
    }
  }
};

const verifierPasDeDifference = () => {
  if (isCardSolved.value) return;

  const balance = calculateMaterialBalance(currentPgnData.value.fen);
  if (balance.isBalanced) {
    isCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: 'Exact ! Le matériel est parfaitement égal entre les Blancs et les Noirs.',
    };
    if (boardApi.value) {
      boardApi.value.setShapes(currentPgnData.value.shapes);
    }
  } else {
    feedback.value = {
      type: 'danger',
      message: 'Il y a bien une différence de matériel dans cette position. Observez attentivement !',
    };
  }
};

// Setup / Placement Verification
const verifierSetup = () => {
  if (isCardSolved.value) return;

  const targetPieces = parseFenPieces(currentPgnData.value.fen);
  if (placedPieces.value.size !== targetPieces.length) {
    return;
  }

  let isMatch = true;
  for (const tp of targetPieces) {
    const placed = placedPieces.value.get(tp.square);
    if (!placed || placed.role !== tp.role || placed.color !== tp.color) {
      isMatch = false;
      break;
    }
  }

  if (isMatch) {
    isCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: 'Parfait ! Vous avez reproduit exactement la position.',
    };
    if (boardApi.value) {
      boardApi.value.setShapes(currentPgnData.value.shapes);
    }
  }
};

const selectPalettePiece = (role: PieceInfo['role'], color: PieceInfo['color']) => {
  selectedPalettePiece.value = { role, color };
  isEraseActive.value = false;
};

const toggleEraseTool = () => {
  isEraseActive.value = !isEraseActive.value;
};

const passerEnReconstitution = () => {
  setupPhase.value = 'reconstruct';
  if (!hasMemorizedOnce.value) {
    hasMemorizedOnce.value = true;
    placedPieces.value = new Map();
    nextTick(() => {
      if (boardApi.value) {
        boardApi.value.setPosition('8/8/8/8/8/8/8/8 w - - 0 1');
        boardApi.value.setShapes([]);
      }
    });
  } else {
    nextTick(() => {
      if (boardApi.value) {
        const fenReconstituee = buildFenFromPlacedPieces(placedPieces.value, couleurJoueur.value);
        boardApi.value.setPosition(fenReconstituee);
        boardApi.value.setShapes([]);
      }
    });
  }
};

// Square Click Handler
const onSquareClick = (square: string) => {
  if (isCardSolved.value) return;

  const cleanSquare = square.toLowerCase();

  if (resolvedVariante.value === 'clic') {
    if (modeClic.value === 'prises_meilleur_coup' && clicPhase.value === 'move') {
      return;
    }
    if (userSelectedSquares.value.has(cleanSquare)) {
      userSelectedSquares.value.delete(cleanSquare);
    } else {
      userSelectedSquares.value.add(cleanSquare);
    }
    // Trigger reactivity
    userSelectedSquares.value = new Set(userSelectedSquares.value);
    verifierClic();
  } else if (resolvedVariante.value === 'setup' && setupPhase.value === 'reconstruct') {
    if (isEraseActive.value) {
      placedPieces.value.delete(cleanSquare);
    } else if (selectedPalettePiece.value) {
      placedPieces.value.set(cleanSquare, { ...selectedPalettePiece.value });
    }
    placedPieces.value = new Map(placedPieces.value);

    const newFen = buildFenFromPlacedPieces(placedPieces.value, couleurJoueur.value);
    if (boardApi.value) {
      boardApi.value.setPosition(newFen);
    }
    verifierSetup();
  }
};

const initCardState = () => {
  isCardSolved.value = false;
  feedback.value = null;
  singleAnswer.value = null;
  multipleAnswers.value = propositionsListe.value.map(() => null);
  notationInputs.value = currentBoardPieces.value.map(() => '');
  userSelectedSquares.value = new Set();
  clicPhase.value = 'clic';
  foundMovesSan.value = [];
  setupPhase.value = modeSetup.value === 'texte' ? 'reconstruct' : 'memorize';
  hasMemorizedOnce.value = modeSetup.value === 'texte';
  placedPieces.value = new Map();

  nextTick(() => {
    if (boardApi.value) {
      const initialFen = resolvedVariante.value === 'setup' && modeSetup.value === 'texte'
        ? '8/8/8/8/8/8/8/8 w - - 0 1'
        : currentPgnData.value.fen;

      boardApi.value.setPosition(initialFen);
      boardApi.value.setShapes(shapesAffichees.value);
    }
  });
};

watch(indexCourant, () => {
  initCardState();
}, { immediate: true });

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
  if (shapesAffichees.value.length > 0) {
    api.setShapes(shapesAffichees.value);
  }
};

const setMultipleAnswer = (propIdx: number, val: boolean) => {
  if (isCardSolved.value) return;

  multipleAnswers.value[propIdx] = val;

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
  if (isCardSolved.value) return;

  const isMoveVariant = resolvedVariante.value === 'move';
  const isPrisesMeilleurCoupPhase2 = resolvedVariante.value === 'clic' && modeClic.value === 'prises_meilleur_coup' && clicPhase.value === 'move';

  if (!isMoveVariant && !isPrisesMeilleurCoupPhase2) return;

  const playerColorShort = (couleurJoueur.value === 'black') ? 'b' : 'w';

  if (move.color !== playerColorShort) {
    return;
  }

  if (isPrisesMeilleurCoupPhase2) {
    // Mode Clic - Étape 2 : Meilleure prise
    const greenArrow = currentPgnData.value.shapes.find(
      (s) => s.brush === 'green' && s.orig && s.dest
    );
    const greenCircle = currentPgnData.value.shapes.find(
      (s) => s.brush === 'green' && s.orig && !s.dest
    );
    const expectedSan = (exerciceCourant.value.move_san || currentPgnData.value.moves[0] || '').trim();

    const moveFrom = (move.from || (move as any).orig || '').toLowerCase();
    const moveTo = (move.to || (move as any).dest || '').toLowerCase();

    let isMatch = false;
    if (greenCircle && greenCircle.orig) {
      // Priorité 1 : La cible du meilleur coup est désignée par le cercle vert [%csl G...]
      isMatch = moveTo === greenCircle.orig.toLowerCase();
    } else if (expectedSan) {
      isMatch = (move.san && (move.san === expectedSan || move.san.replace(/[+#]/g, '') === expectedSan.replace(/[+#]/g, ''))) || false;
    } else if (greenArrow && greenArrow.orig && greenArrow.dest) {
      isMatch = moveFrom === greenArrow.orig.toLowerCase() &&
                moveTo === greenArrow.dest.toLowerCase();
    } else if (currentPgnData.value.moves.length > 0) {
      isMatch = currentPgnData.value.moves.some(
        (m) => move.san && (m === move.san || m.replace(/[+#]/g, '') === move.san.replace(/[+#]/g, ''))
      );
    }

    if (isMatch) {
      isCardSolved.value = true;
      feedback.value = {
        type: 'success',
        message: exerciceCourant.value.move_explication || 'Bravo ! Excellente prise !',
      };
      if (boardApi.value) {
        boardApi.value.setShapes(currentPgnData.value.shapes);
      }
    } else {
      boardApi.value?.undoLastMove();
      feedback.value = {
        type: 'danger',
        message: exerciceCourant.value.move_explication || "Ce n'est pas la meilleure prise. Observez la valeur des pièces et réessayez !",
      };
    }
    return;
  }

  if (isMoveVariant && isMultiMove.value) {
    // Mode Multi-moves
    const expectedList = expectedMovesSan.value;
    const isExpected = expectedList.some((exp) => exp === move.san || exp.replace(/[+#]/g, '') === move.san.replace(/[+#]/g, ''));

    if (isExpected) {
      if (!foundMovesSan.value.includes(move.san)) {
        foundMovesSan.value.push(move.san);
      }

      if (foundMovesSan.value.length >= expectedList.length) {
        isCardSolved.value = true;
        feedback.value = {
          type: 'success',
          message: exerciceCourant.value.move_explication || `Bravo ! Vous avez trouvé tous les ${expectedList.length} coups possibles.`,
        };
        if (boardApi.value) {
          boardApi.value.setShapes(currentPgnData.value.shapes);
        }
      } else {
        feedback.value = {
          type: 'success',
          message: `Coup trouvé (${foundMovesSan.value.length}/${expectedList.length}) ! Cherchez les autres.`,
        };
        setTimeout(() => {
          if (boardApi.value && !isCardSolved.value) {
            boardApi.value.setPosition(currentPgnData.value.fen);
          }
        }, 700);
      }
    } else {
      boardApi.value?.undoLastMove();
      feedback.value = {
        type: 'danger',
        message: "Ce coup ne répond pas à la consigne. Réessayez !",
      };
    }
  } else {
    // Mode coup unique (move)
    const expectedSan = (exerciceCourant.value.move_san || currentPgnData.value.moves[0] || '').trim();

    const isMatch = (
      (expectedSan && (move.san === expectedSan || move.san.replace(/[+#]/g, '') === expectedSan.replace(/[+#]/g, ''))) ||
      (currentPgnData.value.moves.length > 0 && currentPgnData.value.moves.some((m) => m === move.san || m.replace(/[+#]/g, '') === move.san.replace(/[+#]/g, '')))
    );

    if (isMatch) {
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

.multi-move-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.multi-move-badge {
  display: inline-block;
  background: var(--ion-color-primary, #3880ff);
  color: #fff;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 700;
}

.multi-move-instruction {
  font-size: 0.9rem;
  color: var(--ion-color-step-700, #374151);
  font-weight: 500;
}

.multi-move-success {
  font-size: 0.95rem;
  font-weight: 700;
  color: #198754;
}

.found-moves-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}

.move-chip {
  background: rgba(25, 135, 84, 0.12);
  color: #198754;
  border: 1px solid #198754;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
}

/* Clic Panel */
.clic-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
}

.materiel-actions {
  margin-bottom: 6px;
}

.clic-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ion-color-step-650, #4b5563);
  text-align: center;
}

.clic-hint-icon {
  font-size: 1.2rem;
}

/* Setup Panel */
.setup-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px;
}

.setup-memorize-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px;
}

.setup-hint {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ion-color-step-850, #1f2937);
  margin: 0;
  text-align: center;
}

.setup-top-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 6px;
}

.conseil-card {
  width: 100%;
  box-sizing: border-box;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  text-align: left;
}

.conseil-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #f57f17;
  display: block;
  margin-bottom: 2px;
}

.conseil-text {
  font-size: 0.88rem;
  color: #3e2723;
  margin: 0;
  line-height: 1.35;
}

.texte-description-box {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
}

.texte-description-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #4338ca;
  display: block;
  margin-bottom: 2px;
}

.texte-description-content {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e1b4b;
  margin: 0;
}

.setup-palette {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  background: var(--ion-card-background, var(--ion-item-background, #fff));
  border: 1px solid var(--ion-color-step-150, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 8px;
  background-image: none !important;

  :deep(:is(piece, .piece)) {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    top: 0 !important;
    left: 0 !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    display: block !important;
    pointer-events: none;
  }
}

.setup-palette-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
  width: 100%;
  box-sizing: border-box;

  @media (min-width: 400px) {
    gap: 8px;
  }
}

.palette-btn {
  width: 100%;
  min-width: 0;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--ion-color-light-shade, #ddd);
  background: var(--ion-color-light, #fafafa);
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    border-color: var(--ion-color-primary);
    background: var(--ion-color-primary-tint, #e8f0fe);
  }

  &.is-selected {
    border-color: var(--ion-color-primary);
    background: var(--ion-color-primary-tint, #e8f0fe);
    box-shadow: 0 0 0 2px var(--ion-color-primary);
  }

  &:disabled {
    cursor: default;
    opacity: 0.85;
    pointer-events: none;
  }
}

.palette-btn--erase {
  grid-column: 7;
  grid-row: 1 / span 2;
  aspect-ratio: auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .erase-icon {
    font-size: 1.35rem;
    line-height: 1;
  }

  &.is-selected {
    border-color: #dc3545;
    background: rgba(220, 53, 69, 0.1);
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.3);
  }
}

.setup-instruction {
  font-size: 0.82rem;
  color: var(--ion-color-step-600, #4b5563);
  text-align: center;
  margin: 4px 0 0 0;
}

/* Action Buttons */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn--primary {
  background: var(--ion-color-primary, #3880ff);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(56, 128, 255, 0.3);
}

.action-btn--primary:hover:not(:disabled) {
  opacity: 0.92;
}

.action-btn--neutral {
  background: var(--ion-color-step-100, #f3f4f6);
  color: var(--ion-color-step-800, #1f2937);
  border: 1px solid var(--ion-color-step-250, #d1d5db);
}

.action-btn--neutral:hover:not(:disabled) {
  background: var(--ion-color-step-150, #e5e7eb);
}

.action-btn--peek {
  background: #ede9fe;
  color: #6d28d9;
  border: 1px solid #c4b5fd;
  font-size: 0.84rem;
  padding: 5px 12px;
  border-radius: 6px;
}

.action-btn--peek:hover:not(:disabled) {
  background: #ddd6fe;
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


