<template>
  <div class="exercise-viewer-layout">
    <!-- Card des indices -->
    <ion-card class="exercise-card">
      <ion-card-header>
        <ion-card-title class="indices-title">
          <ion-icon :icon="helpCircleOutline" class="title-icon"></ion-icon>
          Qui suis-je ?
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ul class="indices-list">
          <li v-for="(indice, index) in indicesVisibles" :key="index" class="indice-item">
            <span class="indice-badge">Indice {{ index + 1 }}</span>
            <span class="indice-texte">{{ indice }}</span>
          </li>
        </ul>

        <div v-if="!toutDevoile" class="ion-text-center ion-margin-top">
          <ion-button fill="outline" size="small" color="secondary" @click="afficherIndiceSuivant">
            <ion-icon slot="start" :icon="bulbOutline"></ion-icon>
            Indice suivant ({{ indicesAffichesCount }}/{{ indices.length }})
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Zone de réponse selon typeReponse -->
    <div class="reponse-zone ion-margin-top">
      <!-- Mode PIECE: Palette flex 2x6 -->
      <div v-if="typeReponse === 'piece'" class="palette-wrapper">
        <p class="section-instruction">Sélectionnez la bonne pièce :</p>
        <div :class="['piece-palette', 'cg-board', `piece-set-${chessPreferences.pieceSet || 'staunton'}`]">
          <button
            v-for="code in pieceCodes"
            :key="code"
            type="button"
            class="piece-btn"
            :aria-label="getPieceLabel(code)"
            @click="verifierPiece(code)"
          >
            <piece :class="getPieceClasses(code)"></piece>
          </button>
        </div>
      </div>

      <!-- Mode SQUARE: Échiquier vide interactif -->
      <div v-else-if="typeReponse === 'square'" class="square-wrapper">
        <p class="section-instruction">Cliquez sur la bonne case de l'échiquier :</p>
        <div class="chessboard-container">
          <Chessboard
            fen="8/8/8/8/8/8/8/8 w - - 0 1"
            :view-only="true"
            @square-click="verifierCase"
          />
        </div>
      </div>

      <!-- Mode QCM: Liste de boutons de choix -->
      <div v-else-if="typeReponse === 'qcm'" class="qcm-wrapper">
        <p class="section-instruction">Choisissez la bonne réponse :</p>
        <div class="qcm-choices">
          <ion-button
            v-for="(item, index) in (reponseQcm?.choix || [])"
            :key="index"
            expand="block"
            fill="solid"
            color="primary"
            class="choice-btn"
            @click="verifierQcm(index)"
          >
            {{ item.texte }}
          </ion-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon
} from '@ionic/vue';
import { helpCircleOutline, bulbOutline } from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/useFeedback';
import { useChessPreferencesStore } from '@/stores/chessPreferences';

const chessPreferences = useChessPreferencesStore();
const { showSuccess, showError } = useFeedback();

export interface QcmChoix {
  texte: string;
  explication?: string;
}

export interface QcmConfig {
  choix: QcmChoix[];
  bonne_reponse: number;
}

const props = withDefaults(
  defineProps<{
    indices?: string[];
    typeReponse?: 'piece' | 'square' | 'qcm' | string;
    reponsePiece?: string;
    reponseCase?: string;
    reponseQcm?: QcmConfig;
  }>(),
  {
    indices: () => [],
    typeReponse: 'piece',
    reponsePiece: '',
    reponseCase: '',
    reponseQcm: () => ({ choix: [], bonne_reponse: 0 })
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const aTrouve = ref(false);
const indicesAffichesCount = ref(1);

const indicesVisibles = computed(() => {
  if (!props.indices || props.indices.length === 0) return [];
  return props.indices.slice(0, indicesAffichesCount.value);
});

const toutDevoile = computed(() => {
  if (!props.indices || props.indices.length === 0) return true;
  return indicesAffichesCount.value >= props.indices.length;
});

const afficherIndiceSuivant = () => {
  if (props.indices && indicesAffichesCount.value < props.indices.length) {
    indicesAffichesCount.value++;
  }
};

// Liste des 12 pièces (Blanc puis Noir: Roi, Dame, Tour, Fou, Cavalier, Pion)
const pieceCodes = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

const getPieceClasses = (code: string) => {
  const colorChar = code.charAt(0);
  const typeChar = code.charAt(1);

  const color = colorChar === 'w' ? 'white' : 'black';
  const typeMap: Record<string, string> = {
    K: 'king',
    Q: 'queen',
    R: 'rook',
    B: 'bishop',
    N: 'knight',
    P: 'pawn'
  };
  const type = typeMap[typeChar] || 'pawn';
  return ['piece', type, color];
};

const getPieceLabel = (code: string) => {
  const colorChar = code.charAt(0);
  const typeChar = code.charAt(1);
  const colorName = colorChar === 'w' ? 'Blanc' : 'Noir';
  const typeNames: Record<string, string> = {
    K: 'Roi',
    Q: 'Dame',
    R: 'Tour',
    B: 'Fou',
    N: 'Cavalier',
    P: 'Pion'
  };
  return `${typeNames[typeChar] || 'Pièce'} ${colorName}`;
};

const verifierPiece = async (code: string) => {
  if (aTrouve.value) return;

  if (code.toLowerCase() === props.reponsePiece.trim().toLowerCase()) {
    aTrouve.value = true;
    await showSuccess('Bravo ! C\'est la bonne pièce.', 2000);
    setTimeout(() => {
      emit('success');
    }, 800);
  } else {
    await showError('Ce n\'est pas la bonne pièce, réessaie !', 2000);
  }
};

const verifierCase = async (square: string) => {
  if (aTrouve.value) return;

  if (square.toLowerCase() === props.reponseCase.trim().toLowerCase()) {
    aTrouve.value = true;
    await showSuccess(`Bravo ! La case ${square.toUpperCase()} est la bonne réponse.`, 2000);
    setTimeout(() => {
      emit('success');
    }, 800);
  } else {
    await showError(`La case ${square.toUpperCase()} n'est pas la bonne réponse, réessaie !`, 2000);
  }
};

const verifierQcm = async (index: number) => {
  if (aTrouve.value) return;

  const bonneIndex = props.reponseQcm?.bonne_reponse ?? 0;
  if (index === bonneIndex) {
    aTrouve.value = true;
    await showSuccess('Bravo ! Bonne réponse.', 2000);
    setTimeout(() => {
      emit('success');
    }, 800);
  } else {
    const explication = props.reponseQcm?.choix?.[index]?.explication || 'Mauvaise réponse, réessaie !';
    await showError(explication, 2500);
  }
};
</script>

<style scoped>
.indices-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.title-icon {
  font-size: 1.4rem;
}

.indices-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.indice-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ion-color-light, #f4f5f8);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 1rem;
}

.indice-badge {
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

.indice-texte {
  color: var(--ion-color-step-800, #333);
  font-weight: 500;
}

.section-instruction {
  font-size: 1.05rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 12px;
  color: var(--ion-color-step-800, #333);
}
</style>
