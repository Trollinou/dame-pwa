<!-- src/components/shared/OrderViewer.vue -->
<template>
  <div class="exercise-stage">
    
    <div class="columns-layout">
      <!-- Colonne Gauche : La Banque (À classer) -->
      <div class="column bank-column">
        <div class="column-header">
          <h3 class="column-title">À trier</h3>
          <span class="column-subtitle">Toucher pour sélectionner</span>
        </div>
        
        <div class="column-content">
          <div 
            v-for="(item, index) in bank" 
            :key="'bank-' + item.id"
            class="learning-board-card"
            :class="{ 'is-selected': selectionBank === index }"
            @click="selectBank(index)"
          >
            <div class="chessboard-container chessboard-container--mini">
              <DiagramViewer :fen="item.fen" :orientation="item.orientation" />
            </div>
          </div>

          <div v-if="bank.length === 0" class="learning-callout learning-callout--success ion-text-center">
            <span class="empty-icon">✓</span>
            <p><strong>Tout est placé</strong></p>
          </div>
        </div>
      </div>

      <!-- Colonne Droite : Les Emplacements (Ordre) -->
      <div class="column slots-column">
        <div class="column-header">
          <h3 class="column-title">Classement final</h3>
          <span class="column-subtitle">De 1 à {{ correctItems.length }}</span>
        </div>
        
        <div class="column-content">
          <div 
            v-for="(slot, index) in slots" 
            :key="'slot-' + index"
            class="learning-board-card"
            :class="{ 'is-selected': selectionSlot === index, 'is-linked': !!slot }"
            @click="selectSlot(index)"
          >
            <!-- Badge de numérotation universel (Ordre ou Force) -->
            <div class="learning-board-card__badge">{{ index + 1 }}</div>

            <template v-if="slot">
              <div class="chessboard-container chessboard-container--mini">
                <DiagramViewer :fen="slot.fen" :orientation="slot.orientation" />
              </div>
            </template>
            <div v-else class="empty-placeholder">
              <span>Libre</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SeriesCardFooter
      :currentCard="1"
      :totalCards="1"
      :isSolved="isSolved"
      :disabled="!isSolved && bank.length > 0"
      :feedback="footerFeedback"
      :showActionButtonWhenUnsolved="true"
      actionButtonText="Valider l'ordre"
      badgePrefix="Étape"
      :finishText="'Terminer l\'exercice'"
      @action="validerOrdre"
      @next="emit('success')"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import DiagramViewer from '@/components/learning/viewers/DiagramViewer.vue';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import { shuffleArray } from '@/utils/chess/chessNotation';

const exerciseHeader = useExerciseHeader();

interface OrderItem {
  id: string | number;
  fen: string;
  orientation: 'white' | 'black';
  [key: string]: unknown;
}

const props = defineProps<{
  correctItems: OrderItem[]; // Le tableau des éléments dans l'ordre EXACT attendu
  consigne?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const bank = ref<OrderItem[]>([]);
const slots = ref<(OrderItem | null)[]>([]);
const selectionBank = ref<number | null>(null);
const selectionSlot = ref<number | null>(null);
const isSolved = ref(false);
const footerFeedback = ref<CardFeedback | null>(null);

const placedCount = computed(() => slots.value.filter(Boolean).length);

watch(
  [placedCount, () => props.correctItems.length, () => props.consigne],
  () => {
    exerciseHeader?.setHeaderState({
      consigne: props.consigne || 'Classez les positions dans l\'ordre demandé.',
      stepBadgeText: `${placedCount.value} / ${props.correctItems.length}`
    });
  },
  { immediate: true }
);

// Initialisation et mélange
const initOrder = () => {
  bank.value = shuffleArray(props.correctItems);
  // Génère dynamiquement le bon nombre de cases vides (3 ou 5)
  slots.value = Array(props.correctItems.length).fill(null);
  selectionBank.value = null;
  selectionSlot.value = null;
  isSolved.value = false;
  footerFeedback.value = null;
};

onMounted(() => { initOrder(); });
watch(() => props.correctItems, () => { initOrder(); }, { deep: true });

// Logique Tap & Tap
const selectBank = (index: number) => {
  selectionSlot.value = null;
  selectionBank.value = selectionBank.value === index ? null : index;
};

const selectSlot = (index: number) => {
  const currentContent = slots.value[index];

  if (!currentContent && selectionBank.value !== null) {
    // Placement depuis la banque vers la case
    slots.value[index] = bank.value[selectionBank.value];
    bank.value.splice(selectionBank.value, 1);
    selectionBank.value = null;
  } else if (currentContent) {
    // Retour de la case vers la banque
    bank.value.push(currentContent);
    slots.value[index] = null;
    selectionBank.value = null;
    selectionSlot.value = null;
  }
};

// Validation
const validerOrdre = async () => {
  let hasError = false;

  for (let i = 0; i < slots.value.length; i++) {
    const slot = slots.value[i];
    // On compare l'ID de l'élément placé avec l'ID de l'élément correct attendu à cet index
    if (!slot || slot.id !== props.correctItems[i].id) {
      hasError = true;
      if (slot) {
        bank.value.push(slot); // Renvoie automatiquement l'erreur dans la banque
        slots.value[i] = null;
      }
    }
  }

  if (hasError) {
    footerFeedback.value = {
      type: 'danger',
      message: 'L\'ordre est incorrect. Observez bien les positions !'
    };
  } else {
    isSolved.value = true;
    footerFeedback.value = {
      type: 'success',
      message: 'Bravo ! L\'ordre est exact.'
    };
  }
};
</script>
