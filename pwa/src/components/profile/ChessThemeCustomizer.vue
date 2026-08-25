<template>
  <div class="chess-theme-customizer info-card">
    <div class="customizer-header" @click="toggleExpand" role="button" tabindex="0">
      <div class="header-title">
        <ion-icon :icon="colorPaletteOutline" color="primary" class="header-icon"></ion-icon>
        <div class="header-text">
          <div class="header-title-row">
            <h3>Personnalisation de l'Échiquier</h3>
            <ion-icon 
              :icon="chevronDownOutline" 
              class="chevron-icon" 
              :class="{ 'is-rotated': isExpanded }"
            ></ion-icon>
          </div>
          <p v-if="!isExpanded" class="summary-text">
            Style actif : <span class="summary-pill">{{ currentPieceLabel }}</span> &bull; <span class="summary-pill">{{ currentThemeLabel }}</span>
          </p>
          <p v-else>Faites tourner les rouleaux pour choisir les pièces et le fond du plateau.</p>
        </div>
      </div>
    </div>

    <!-- CONTENU DÉPLIABLE -->
    <div v-show="isExpanded" class="customizer-body">
      <!-- DOUBLE ROULEAU INLINE COMPACT (CÔTE À CÔTE SANS MODALE) -->
      <div class="wheel-picker-wrapper">
        <!-- En-têtes de colonnes -->
        <div class="wheel-headers">
          <div class="wheel-header-item">
            <span class="badge-num">1</span>
            <span>Pièces</span>
          </div>
          <div class="wheel-header-item">
            <span class="badge-num">2</span>
            <span>Fond</span>
          </div>
        </div>

        <!-- Corps des 2 rouleaux -->
        <div class="wheel-columns-container">
          <!-- Barre de sélection centrale commune -->
          <div class="wheel-highlight-lens"></div>

          <!-- Rouleau 1 : Pièces -->
          <div 
            ref="pieceScrollEl"
            class="wheel-scroll-col"
            @scroll="onPieceScroll"
          >
            <div class="wheel-padding-top"></div>
            <div
              v-for="(option, index) in pieceOptions"
              :key="option.id"
              class="wheel-item"
              :class="{ 'is-active': stagedPieceSet === option.id }"
              @click="scrollToPieceIndex(index)"
            >
              {{ option.label }}
            </div>
            <div class="wheel-padding-bottom"></div>
          </div>

          <div class="wheel-divider"></div>

          <!-- Rouleau 2 : Fond -->
          <div 
            ref="themeScrollEl"
            class="wheel-scroll-col"
            @scroll="onThemeScroll"
          >
            <div class="wheel-padding-top"></div>
            <div
              v-for="(option, index) in themeOptions"
              :key="option.id"
              class="wheel-item"
              :class="{ 'is-active': stagedBoardTheme === option.id }"
              @click="scrollToThemeIndex(index)"
            >
              {{ option.label }}
            </div>
            <div class="wheel-padding-bottom"></div>
          </div>
        </div>
      </div>

      <!-- ÉCHIQUIER DE PRÉVISUALISATION DIRECTEMENT DESSOUS -->
      <div class="preview-container">
        <div class="board-wrapper">
          <TheChessboard
            :key="`${stagedPieceSet}-${stagedBoardTheme}`"
            :piece-set="stagedPieceSet"
            :board-theme="stagedBoardTheme"
            :board-config="{ viewOnly: true }"
            fit-container
          />
        </div>
      </div>

      <!-- ACTIONS DE VALIDATION & RÉINITIALISATION -->
      <div class="actions-section">
        <ion-button 
          expand="block" 
          color="primary" 
          fill="solid"
          class="customizer-save-btn"
          :disabled="isSaving"
          @click="handleSavePreferences"
        >
          <ion-icon slot="start" :icon="checkmarkCircleOutline"></ion-icon>
          {{ isSaved ? 'Préférences enregistrées !' : 'Enregistrer mon style d\'échiquier' }}
        </ion-button>

        <div class="secondary-actions-row">
          <ion-button 
            expand="block" 
            fill="clear" 
            size="small" 
            color="medium"
            @click="handleResetDefaults"
          >
            <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
            Rétablir les valeurs par défaut (CBurnett & Brown)
          </ion-button>
        </div>
      </div>
    </div>

    <!-- Toast Ionic de confirmation -->
    <ion-toast
      :is-open="showToast"
      message="Votre style d'échiquier a été enregistré avec succès !"
      :duration="2500"
      color="success"
      @did-dismiss="showToast = false"
    ></ion-toast>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { 
  IonButton, 
  IonIcon, 
  IonToast 
} from '@ionic/vue';
import { 
  colorPaletteOutline, 
  checkmarkCircleOutline, 
  refreshOutline,
  chevronDownOutline
} from 'ionicons/icons';
import TheChessboard from 'eg-chessboard/vue';
import 'eg-chessboard/style.css';
import type { PieceSet, BoardTheme } from 'eg-chessboard';
import { 
  useChessPreferencesStore, 
  AVAILABLE_PIECE_SET_OPTIONS, 
  AVAILABLE_BOARD_THEME_OPTIONS,
  type PieceSetOption,
  type BoardThemeOption 
} from '@/stores/chessPreferences';

const chessPreferences = useChessPreferencesStore();

const isExpanded = ref(false);

const currentPieceLabel = computed(() => {
  return pieceOptions.find(p => p.id === (chessPreferences.pieceSet || 'cburnett'))?.label || 'CBurnett';
});

const currentThemeLabel = computed(() => {
  return themeOptions.find(t => t.id === (chessPreferences.boardTheme || 'brown'))?.label || 'Bois Classique';
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    nextTick(() => {
      const pieceIdx = pieceOptions.findIndex(p => p.id === stagedPieceSet.value);
      if (pieceIdx !== -1) scrollToPieceIndex(pieceIdx, false);

      const themeIdx = themeOptions.findIndex(t => t.id === stagedBoardTheme.value);
      if (themeIdx !== -1) scrollToThemeIndex(themeIdx, false);
    });
  }
};

const pieceOptions: PieceSetOption[] = AVAILABLE_PIECE_SET_OPTIONS;
const themeOptions: BoardThemeOption[] = AVAILABLE_BOARD_THEME_OPTIONS;

const ITEM_HEIGHT = 36; // Hauteur exacte d'un élément de rouleau en px

const pieceScrollEl = ref<HTMLElement | null>(null);
const themeScrollEl = ref<HTMLElement | null>(null);

// Valeurs en cours de sélection
const stagedPieceSet = ref<PieceSet>(chessPreferences.pieceSet || 'cburnett');
const stagedBoardTheme = ref<BoardTheme>(chessPreferences.boardTheme || 'brown');

const scrollToPieceIndex = (index: number, smooth = true) => {
  if (pieceScrollEl.value) {
    pieceScrollEl.value.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
};

const scrollToThemeIndex = (index: number, smooth = true) => {
  if (themeScrollEl.value) {
    themeScrollEl.value.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
};

let pieceScrollTimeout: ReturnType<typeof setTimeout> | null = null;
const onPieceScroll = () => {
  if (!pieceScrollEl.value) return;
  const scrollTop = pieceScrollEl.value.scrollTop;
  const index = Math.round(scrollTop / ITEM_HEIGHT);
  const clampedIndex = Math.max(0, Math.min(pieceOptions.length - 1, index));
  const option = pieceOptions[clampedIndex];
  if (option && stagedPieceSet.value !== option.id) {
    stagedPieceSet.value = option.id;
  }

  if (pieceScrollTimeout) clearTimeout(pieceScrollTimeout);
  pieceScrollTimeout = setTimeout(() => {
    scrollToPieceIndex(clampedIndex, true);
  }, 120);
};

let themeScrollTimeout: ReturnType<typeof setTimeout> | null = null;
const onThemeScroll = () => {
  if (!themeScrollEl.value) return;
  const scrollTop = themeScrollEl.value.scrollTop;
  const index = Math.round(scrollTop / ITEM_HEIGHT);
  const clampedIndex = Math.max(0, Math.min(themeOptions.length - 1, index));
  const option = themeOptions[clampedIndex];
  if (option && stagedBoardTheme.value !== option.id) {
    stagedBoardTheme.value = option.id;
  }

  if (themeScrollTimeout) clearTimeout(themeScrollTimeout);
  themeScrollTimeout = setTimeout(() => {
    scrollToThemeIndex(clampedIndex, true);
  }, 120);
};

onMounted(() => {
  stagedPieceSet.value = chessPreferences.pieceSet || 'cburnett';
  stagedBoardTheme.value = chessPreferences.boardTheme || 'brown';

  nextTick(() => {
    const pieceIdx = pieceOptions.findIndex(p => p.id === stagedPieceSet.value);
    if (pieceIdx !== -1) scrollToPieceIndex(pieceIdx, false);

    const themeIdx = themeOptions.findIndex(t => t.id === stagedBoardTheme.value);
    if (themeIdx !== -1) scrollToThemeIndex(themeIdx, false);
  });
});

// Enregistrement des préférences
const isSaving = ref(false);
const isSaved = ref(false);
const showToast = ref(false);

const handleSavePreferences = () => {
  isSaving.value = true;
  chessPreferences.savePreferences(stagedPieceSet.value, stagedBoardTheme.value);
  isSaving.value = false;
  isSaved.value = true;
  showToast.value = true;

  setTimeout(() => {
    isSaved.value = false;
  }, 3000);
};

const handleResetDefaults = () => {
  stagedPieceSet.value = 'cburnett';
  stagedBoardTheme.value = 'brown';
  scrollToPieceIndex(0, true);
  scrollToThemeIndex(0, true);
  chessPreferences.resetDefaults();
  showToast.value = true;
};
</script>

<style scoped>
.chess-theme-customizer {
  background: var(--ion-card-background, var(--ion-item-background, #fff));
  border-radius: 14px;
  border: 1px solid var(--ion-color-step-150, #e2e8f0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.customizer-header {
  cursor: pointer;
  user-select: none;
  margin-bottom: 0;
  -webkit-tap-highlight-color: transparent;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-text {
  flex: 1;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.header-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-dark, #1f1f1f);
}

.chevron-icon {
  font-size: 18px;
  color: var(--ion-color-step-600, #666);
  transition: transform 0.25s ease;
}

.chevron-icon.is-rotated {
  transform: rotate(180deg);
}

.header-text p {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--ion-color-step-600, #666);
  line-height: 1.35;
}

.summary-text {
  font-size: 12.5px;
}

.summary-pill {
  color: var(--ion-color-primary, #0073aa);
  font-weight: 600;
}

.customizer-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 4px;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.customizer-save-btn {
  --min-height: 48px;
  --border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
}

/* DOUBLE ROULEAU INLINE COMPACT */
.wheel-picker-wrapper {
  width: 100%;
  box-sizing: border-box;
  background: var(--ion-color-light, #f4f5f8);
  border: 1px solid var(--ion-color-step-150, #e9ecef);
  border-radius: 10px;
  padding: 8px 10px;
  position: relative;
  overflow: hidden;
}

.wheel-headers {
  display: flex;
  justify-content: space-around;
  margin-bottom: 4px;
  padding: 0 10px;
}

.wheel-header-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ion-color-step-700, #444);
}

.badge-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: #fff;
  font-size: 9.5px;
  font-weight: 700;
}

.wheel-columns-container {
  display: flex;
  align-items: center;
  position: relative;
  height: 108px; /* 3 éléments visibles de 36px */
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 25%,
    black 75%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 25%,
    black 75%,
    transparent 100%
  );
}

.wheel-highlight-lens {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  height: 36px;
  background: var(--ion-color-primary-light, #e8f0fe);
  border-radius: 8px;
  border: 1px solid rgba(56, 128, 255, 0.2);
  pointer-events: none;
  z-index: 1;
}

.wheel-divider {
  width: 1px;
  height: 70%;
  background: var(--ion-color-step-200, #dee2e6);
  z-index: 2;
}

.wheel-scroll-col {
  flex: 1;
  height: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  z-index: 2;
}

.wheel-scroll-col::-webkit-scrollbar {
  display: none;
}

.wheel-padding-top,
.wheel-padding-bottom {
  height: 36px;
  flex-shrink: 0;
}

.wheel-item {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ion-color-step-600, #777);
  scroll-snap-align: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.wheel-item.is-active {
  color: var(--ion-color-primary-shade, #1a5cff);
  font-weight: 700;
  font-size: 14.5px;
  transform: scale(1.04);
}

/* PRÉVISUALISATION DE L'ÉCHIQUIER */
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.board-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f0d9b5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  border: 1px solid var(--ion-color-step-150, #e2e8f0);
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

:deep(cg-board) {
  border-radius: 0 !important;
}

.actions-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.secondary-actions-row {
  display: flex;
  justify-content: center;
}
</style>
