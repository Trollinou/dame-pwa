<template>
  <div class="dame-panel chess-theme-customizer">
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
          <Chessboard
            :key="`${stagedPieceSet}-${stagedBoardTheme}`"
            :piece-set="stagedPieceSet"
            :board-theme="stagedBoardTheme"
            :view-only="true"
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
          class="dame-btn-large"
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
import { Chessboard } from '@/components/shared/Chessboard';
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
