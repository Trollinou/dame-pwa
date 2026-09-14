<template>
  <div class="qui-suis-je-viewer-wrapper">
    <!-- En-tête Unifié de l'exercice avec consigne et badge d'étape -->
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneTexte"
      :stepBadgeText="`Carte ${indexCourant + 1} / ${seriesListe.length}`"
    />

    <!-- Zone des Indices (Multiligne) -->
    <div class="indices-container animate-fade-in">
      <div class="indices-card">
        <div class="indices-header">
          <ion-icon :icon="helpCircleOutline" class="indices-icon" />
          <span class="indices-title">Indices & Affirmations</span>
        </div>
        <div class="indices-content">
          <p class="indices-text">{{ carteCourante.indices || 'Aucun indice fourni.' }}</p>
        </div>
      </div>
    </div>

    <!-- Zone d'Interaction selon la Variante -->
    <div class="interaction-zone animate-fade-in">
      <!-- Variante 1 : Pièces (Palette des 6 pièces blanches) -->
      <div v-if="resolvedVariante === 'pieces'" class="pieces-panel">
        <p class="section-instruction">Sélectionnez la pièce blanche mystère :</p>
        <div :class="['piece-palette', 'cg-board', `piece-set-${chessPreferences.pieceSet || 'cburnett'}`]">
          <button
            v-for="item in whitePieces"
            :key="item.code"
            type="button"
            class="piece-btn"
            :class="{ 'is-selected': selectedPieceCode === item.code }"
            :disabled="isCardSolved"
            :aria-label="item.label"
            @click="verifierPiece(item.code)"
          >
            <piece :class="['piece', item.cgClass, 'white']"></piece>
          </button>
        </div>
      </div>

      <!-- Variante 2 : Cases (Échiquier vide interactif avec révélation cercle vert) -->
      <div v-else-if="resolvedVariante === 'cases'" class="cases-panel">
        <p class="section-instruction">Cliquez sur la case mystère sur l'échiquier :</p>
        <div class="chessboard-container">
          <Chessboard
            :key="`t12-board-${indexCourant}`"
            fen="8/8/8/8/8/8/8/8 w - - 0 1"
            orientation="white"
            player-color="white"
            :shapes="currentShapes"
            :view-only="isCardSolved"
            @square-click="verifierCase"
          />
        </div>
      </div>
    </div>

    <!-- Footer de Navigation par Carte avec Feedback Fixe -->
    <SeriesCardFooter
      :currentCard="indexCourant + 1"
      :totalCards="seriesListe.length"
      :isSolved="isCardSolved"
      :feedback="feedback"
      :pendingHint="pendingHintTexte"
      @next="passerCarteSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IonIcon } from '@ionic/vue';
import { helpCircleOutline } from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import type { DrawShape } from 'eg-chessboard';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { useChessPreferencesStore } from '@/stores/chessPreferences';

const chessPreferences = useChessPreferencesStore();

export interface SerieQuiSuisJe {
  indices?: string;
  piece?: string;
  piece_attendue?: string;
  fen?: string;
  shapes?: DrawShape[];
  case_attendue?: string;
  reponse_case?: string;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    variante?: string;
    series?: SerieQuiSuisJe[];
    metaTitre?: string;
    metaTypeLabel?: string;
    metaChapitreNiveauLabel?: string;
  }>(),
  {
    consigne: '',
    variante: 'pieces',
    series: () => [],
    metaTitre: 'T12 - Qui suis-je ?',
    metaTypeLabel: 'Qui suis-je ?',
    metaChapitreNiveauLabel: '',
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const headerMeta = computed(() => ({
  title: props.metaTitre || 'T12 - Qui suis-je ?',
  typeLabel: props.metaTypeLabel || 'Qui suis-je ?',
  chapitreNiveauLabel: props.metaChapitreNiveauLabel || '',
}));

const whitePieces = [
  { code: 'R', role: 'k', frCode: 'R', cgClass: 'king', label: 'Roi', article: 'le' },
  { code: 'D', role: 'q', frCode: 'D', cgClass: 'queen', label: 'Dame', article: 'la' },
  { code: 'T', role: 'r', frCode: 'T', cgClass: 'rook', label: 'Tour', article: 'la' },
  { code: 'F', role: 'b', frCode: 'F', cgClass: 'bishop', label: 'Fou', article: 'le' },
  { code: 'C', role: 'n', frCode: 'C', cgClass: 'knight', label: 'Cavalier', article: 'le' },
  { code: 'P', role: 'p', frCode: 'P', cgClass: 'pawn', label: 'Pion', article: 'le' },
];

const resolvedVariante = computed<'pieces' | 'cases'>(() => {
  const v = (props.variante || 'pieces').toLowerCase();
  if (v === 'case' || v === 'cases' || v === 'square') {
    return 'cases';
  }
  return 'pieces';
});

const defaultSeries: SerieQuiSuisJe[] = [
  { indices: '', piece: 'R', fen: '8/8/8/8/8/8/8/8 w - - 0 1', shapes: [], case_attendue: '' },
  { indices: '', piece: 'D', fen: '8/8/8/8/8/8/8/8 w - - 0 1', shapes: [], case_attendue: '' },
  { indices: '', piece: 'T', fen: '8/8/8/8/8/8/8/8 w - - 0 1', shapes: [], case_attendue: '' },
  { indices: '', piece: 'F', fen: '8/8/8/8/8/8/8/8 w - - 0 1', shapes: [], case_attendue: '' },
  { indices: '', piece: 'C', fen: '8/8/8/8/8/8/8/8 w - - 0 1', shapes: [], case_attendue: '' },
  { indices: '', piece: 'P', fen: '8/8/8/8/8/8/8/8 w - - 0 1', shapes: [], case_attendue: '' },
];

const seriesListe = computed<SerieQuiSuisJe[]>(() => {
  if (props.series && Array.isArray(props.series) && props.series.length > 0) {
    return props.series;
  }
  return defaultSeries;
});

const indexCourant = ref(0);
const isCardSolved = ref(false);
const feedback = ref<CardFeedback | null>(null);
const selectedPieceCode = ref<string | null>(null);
const currentShapes = ref<DrawShape[]>([]);

const carteCourante = computed<SerieQuiSuisJe>(() => {
  return seriesListe.value[indexCourant.value] || { indices: '' };
});

const consigneTexte = computed<string>(() => {
  if (props.consigne) return props.consigne;
  return resolvedVariante.value === 'pieces'
    ? 'Devinez la pièce mystère d\'après les indices.'
    : 'Trouvez la case mystère sur l\'échiquier d\'après les indices.';
});

const pendingHintTexte = computed<string>(() => {
  return resolvedVariante.value === 'pieces'
    ? 'Sélectionnez la bonne pièce pour continuer'
    : 'Cliquez sur la bonne case pour continuer';
});

// Réinitialisation de l'état de la carte lors du changement de carte
watch(
  indexCourant,
  () => {
    isCardSolved.value = false;
    feedback.value = null;
    selectedPieceCode.value = null;
    currentShapes.value = [];
  },
  { immediate: true }
);

/**
 * Normalise une chaîne ou notation SAN vers le code français de pièce (R, D, T, F, C, P).
 * Supporte les notations FR (Da1, Tf4, FC4, Ce5...) et EN (wQ, wK, wR, wB, wN, wP...).
 */
function normalizeFrPiece(codeOrNotation: string | undefined): string {
  if (!codeOrNotation) return '';
  let clean = codeOrNotation.trim().toUpperCase();
  if (clean.startsWith('W') && clean.length === 2) {
    clean = clean.substring(1);
  }
  const first = clean.charAt(0);
  switch (first) {
    case 'D':
    case 'Q':
      return 'D';
    case 'T':
      return 'T';
    case 'F':
    case 'B':
      return 'F';
    case 'C':
    case 'N':
      return 'C';
    case 'P':
      return 'P';
    case 'K':
    case 'R':
    default:
      return 'R';
  }
}

const verifierPiece = (code: string) => {
  if (isCardSolved.value) return;

  const attendue = carteCourante.value.piece || carteCourante.value.piece_attendue || 'R';
  const attendueNorm = normalizeFrPiece(attendue);
  const selectedNorm = normalizeFrPiece(code);

  const pieceInfo = whitePieces.find((p) => p.frCode === selectedNorm || p.code === code);
  const article = pieceInfo?.article || 'la';
  const pieceName = pieceInfo ? pieceInfo.label : 'cette pièce';

  if (selectedNorm === attendueNorm) {
    selectedPieceCode.value = code;
    isCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: `Bravo ! C'est bien ${article} ${pieceName}.`,
    };
  } else {
    selectedPieceCode.value = code;
    feedback.value = {
      type: 'danger',
      message: `Ce n'est pas ${article} ${pieceName}, réessaie !`,
    };
  }
};

function extractTargetSquare(card: SerieQuiSuisJe): string {
  if (card.case_attendue) return card.case_attendue.trim().toLowerCase();
  if (card.reponse_case) return card.reponse_case.trim().toLowerCase();
  if (Array.isArray(card.shapes)) {
    for (const s of card.shapes) {
      if (s && s.orig && (s.brush === 'green' || s.brush === 'g' || !s.brush)) {
        return s.orig.toLowerCase();
      }
    }
  }
  return '';
}

const verifierCase = (square: string) => {
  if (isCardSolved.value) return;

  const caseAttendue = extractTargetSquare(carteCourante.value);
  const clickedSquare = square.trim().toLowerCase();

  if (clickedSquare === caseAttendue) {
    currentShapes.value = [{ orig: clickedSquare, brush: 'green' } as DrawShape];
    isCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: `Bravo ! La case ${square.toUpperCase()} est la bonne réponse.`,
    };
  } else {
    feedback.value = {
      type: 'danger',
      message: `La case ${square.toUpperCase()} n'est pas la bonne réponse, réessaie !`,
    };
  }
};

const passerCarteSuivante = () => {
  if (indexCourant.value < seriesListe.value.length - 1) {
    indexCourant.value++;
  } else {
    emit('success');
  }
};
</script>

<style scoped>
.qui-suis-je-viewer-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  box-sizing: border-box;
}

.indices-container {
  width: 100%;
}

.indices-card {
  background: var(--ion-color-light, #f4f5f8);
  border-radius: 8px;
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  padding: 10px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.indices-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.indices-icon {
  font-size: 1.15rem;
  color: var(--ion-color-primary, #3880ff);
}

.indices-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ion-color-primary, #3880ff);
}

.indices-content {
  padding-left: 2px;
}

.indices-text {
  white-space: pre-line;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--ion-color-dark, #222428);
  font-weight: 500;
  margin: 0;
}

.interaction-zone {
  width: 100%;
}

.section-instruction {
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  margin: 0 0 10px 0;
  color: var(--ion-color-step-800, #333333);
}

.pieces-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: var(--ion-color-light, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--ion-color-step-150, #e9ecef);
}

.cases-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chessboard-container {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1;
  margin: 0 auto;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

