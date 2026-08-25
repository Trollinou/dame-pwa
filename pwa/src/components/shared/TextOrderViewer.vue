<template>
  <div class="exercise-viewer-layout">
    <!-- PHASE 1 : ORDER -->
    <div v-if="phase === 'order'" class="exercise-stage">
      <!-- Card Consigne -->
      <ion-card v-if="consigne" class="exercise-card">
        <ion-card-header>
          <ion-card-title class="exercise-card-header">{{ consigne }}</ion-card-title>
        </ion-card-header>
      </ion-card>

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

      <!-- Bouton de validation -->
      <ion-button
        expand="block"
        color="primary"
        class="exercise-action-btn ion-margin-top"
        @click="validerOrdre"
      >
        Valider l'ordre
      </ion-button>
    </div>

    <!-- PHASE 2 : SOLUTION -->
    <div v-else-if="phase === 'solution'" class="exercise-stage">
      <ion-card class="exercise-card">
        <ion-card-header>
          <ion-card-title class="exercise-card-header">💡 Explication détaillée</ion-card-title>
        </ion-card-header>
      </ion-card>

      <PgnViewer
        :orientation="couleurJoueurTyped"
        :pgn="pgnExplication"
        :pgnString="pgnExplication"
      />

      <ion-button
        expand="block"
        color="success"
        class="exercise-action-btn ion-margin-top"
        @click="finishExercise"
      >
        Terminer l'exercice
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonList,
  IonReorderGroup,
  IonItem,
  IonLabel,
  IonReorder,
  IonButton,
  type ItemReorderCustomEvent
} from '@ionic/vue';
import { Chessboard } from '@/components/shared/Chessboard';
import { useFeedback } from '@/composables/useFeedback';
import PgnViewer from '@/components/shared/PgnViewer.vue';

const { showSuccess, showError } = useFeedback();

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
const shuffledEtapes = ref<EtapeTexte[]>([]);

const couleurJoueurTyped = computed<'white' | 'black'>(() => {
  return props.couleurJoueur === 'black' ? 'black' : 'white';
});

const boardConfig = computed(() => ({
  fen: props.fenDepart || 'start',
  orientation: couleurJoueurTyped.value,
  viewOnly: true
}));

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

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
    await showError("L'ordre des étapes n'est pas correct, réessayez !", 2500);
  }
};

const finishExercise = () => {
  emit('success');
};
</script>

