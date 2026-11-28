<template>
  <div class="exercise-viewer-layout">
    <!-- PHASE 1 : ORDER -->
    <div v-if="phase === 'order'" class="exercise-stage">
      <!-- Échiquier de départ -->
      <div class="chessboard-container">
        <Chessboard
          :fen="props.fenDepart || 'start'"
          :orientation="couleurJoueurTyped"
          :player-color="couleurJoueurTyped"
          :view-only="true"
        />
      </div>

      <!-- Liste des étapes à réordonner -->
      <ion-card class="exercise-card">
        <ion-list>
          <ion-reorder-group :disabled="false" @ionItemReorder="handleReorder">
            <ion-item v-for="etape in shuffledEtapes" :key="etape.id">
              <ion-label class="ion-text-wrap">{{ etape.texte }}</ion-label>
              <ion-reorder slot="end"></ion-reorder>
            </ion-item>
          </ion-reorder-group>
        </ion-list>
      </ion-card>
    </div>

    <!-- PHASE 2 : SOLUTION -->
    <div v-else-if="phase === 'solution'" class="exercise-stage">
      <PgnViewer
        :orientation="couleurJoueurTyped"
        :pgn="pgnExplication"
        :pgnString="pgnExplication"
      />
    </div>

    <SeriesCardFooter
      :currentCard="phase === 'order' ? 1 : 2"
      :totalCards="2"
      :isSolved="phase === 'solution'"
      :showActionButtonWhenUnsolved="phase === 'order'"
      actionButtonText="Valider l'ordre"
      :feedback="footerFeedback"
      badgePrefix="Étape"
      :finishText="'Terminer l\'exercice'"
      @action="validerOrdre"
      @next="finishExercise"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  IonCard,
  IonList,
  IonReorderGroup,
  IonItem,
  IonLabel,
  IonReorder,
  type ItemReorderCustomEvent
} from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/core/useFeedback';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import { shuffleArray } from '@/utils/chess/chessNotation';
import PgnViewer from '@/components/learning/viewers/PgnViewer.vue';

const { showSuccess, showError } = useFeedback();
const exerciseHeader = useExerciseHeader();

export interface EtapeTexte {
  id: number;
  texte: string;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    fenDepart?: string;
    couleurJoueur?: 'white' | 'black' | string;
    etapesCorrectes?: string[];
    pgnExplication?: string;
  }>(),
  {
    consigne: '',
    fenDepart: '',
    couleurJoueur: 'white',
    etapesCorrectes: () => [],
    pgnExplication: ''
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const phase = ref<'order' | 'solution'>('order');
const footerFeedback = ref<CardFeedback | null>(null);
const shuffledEtapes = ref<EtapeTexte[]>([]);

watch(
  [phase, () => props.consigne],
  () => {
    if (phase.value === 'order') {
      exerciseHeader?.setHeaderState({
        consigne: props.consigne || 'Remets les étapes dans le bon ordre.',
        stepBadgeText: 'Étape 1 / 2\nClassement'
      });
    } else {
      exerciseHeader?.setHeaderState({
        consigne: 'Explication détaillée',
        stepBadgeText: 'Étape 2 / 2\nSolution'
      });
      footerFeedback.value = {
        type: 'success',
        message: 'Ordre des étapes validé !'
      };
    }
  },
  { immediate: true }
);

const couleurJoueurTyped = computed<'white' | 'black'>(() => {
  return props.couleurJoueur === 'black' ? 'black' : 'white';
});

const boardConfig = computed(() => ({
  fen: props.fenDepart || 'start',
  orientation: couleurJoueurTyped.value,
  viewOnly: true
}));

const initShuffledEtapes = () => {
  if (!props.etapesCorrectes || props.etapesCorrectes.length === 0) {
    shuffledEtapes.value = [];
    return;
  }
  const originalList: EtapeTexte[] = props.etapesCorrectes.map((texte, index) => ({
    id: index,
    texte
  }));

  let shuffled = shuffleArray(originalList);
  // S'assurer que le tableau n'est pas déjà ordonné si plus de 1 élément
  if (originalList.length > 1 && shuffled.every((item, idx) => item.id === idx)) {
    shuffled = shuffleArray(originalList);
  }

  shuffledEtapes.value = shuffled;
};

onMounted(() => {
  initShuffledEtapes();
});

watch(
  () => props.etapesCorrectes,
  () => {
    initShuffledEtapes();
  },
  { deep: true }
);

const handleReorder = (event: ItemReorderCustomEvent) => {
  const movedItem = shuffledEtapes.value.splice(event.detail.from, 1)[0];
  shuffledEtapes.value.splice(event.detail.to, 0, movedItem);
  event.detail.complete();
};

const validerOrdre = async () => {
  const estCorrect = shuffledEtapes.value.every((etape, index) => etape.id === index);

  if (estCorrect) {
    await showSuccess("Excellente réponse ! L'ordre des étapes est parfait.", 2000);
    phase.value = 'solution';
  } else {
    await showError("L'ordre des étapes n'est pas correct, réessaie !", 2500);
  }
};

const finishExercise = () => {
  emit('success');
};
</script>

