<template>
  <div class="exercice-type-associ-plan">
    <!-- Phase de choix par élimination (Plans A à C) ou prise de connaissance (Plan D) -->
    <div
      v-if="phase === 'choice' || phase === 'preview'"
      class="phase-container associ-plan-phase"
    >
      <div v-if="paireActive" class="associ-plan-stage">
        <!-- Colonne gauche : Description du plan courant -->
        <div class="associ-plan-desc-col">
          <ion-card class="associ-plan-desc-card">
            <ion-card-content>
              <div class="associ-plan-badge">
                {{ getPlanLabel(currentPlanIndex) }}
              </div>
              <p class="associ-plan-desc-text">
                {{ paireActive.description }}
              </p>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Colonne droite : Diagrammes restants empilés (ou diagramme unique en phase preview) -->
        <div class="associ-plan-boards-col">
          <div
            v-for="item in remainingPaires"
            :key="item.originalIndex"
            class="associ-plan-board-card"
            :class="{
              'is-clickable': phase === 'choice',
              'is-wrong': phase === 'choice' && wrongClickedIndex === item.originalIndex,
            }"
            @click="phase === 'choice' ? onSelectBoard(item.originalIndex) : undefined"
          >
            <div class="chessboard-container--mini">
              <Chessboard
                :fen="item.fen"
                :player-color="item.couleurJoueur"
                :orientation="item.couleurJoueur"
                :shapes="item.shapes || []"
                :view-only="true"
                :coordinates="false"
                :zoomable="phase === 'preview'"
              />
            </div>
          </div>
        </div>
      </div>

      <SeriesCardFooter
        :currentCard="currentPlanIndex + 1"
        :totalCards="totalPlans"
        :isSolved="phase === 'preview'"
        :feedback="phase === 'choice' ? choiceFeedback : null"
        :pendingHint="phase === 'choice' ? 'Clique sur le diagramme correspondant à la description' : undefined"
        :nextText="`Dérouler le ${getPlanLabel(currentPlanIndex)}`"
        @next="startPgnPhase"
      />
    </div>

    <!-- Phase PGN : Visualisation du PGN du plan sélectionné -->
    <div v-else-if="phase === 'pgn'" class="phase-container pgn-phase">
      <div v-if="paireActive" class="pgn-card-wrapper">
        <PgnViewer
          :key="`pgn-view-${currentPlanIndex}`"
          :pgnString="paireActive.pgn"
          :orientation="paireActive.couleurJoueur"
          @finished="onPgnFinished"
        />

        <SeriesCardFooter
          :currentCard="currentPlanIndex + 1"
          :totalCards="totalPlans"
          :isSolved="pgnVisionne"
          :feedback="pgnVisionne ? { type: 'success', message: `${getPlanLabel(currentPlanIndex)} visualisé avec succès !` } : null"
          pendingHint="Déroule tous les coups du PGN jusqu'au bout pour continuer"
          :nextText="isLastPlan ? 'Terminer l\'exercice' : 'Plan suivant'"
          finishText="Terminer l'exercice"
          @next="passerPlanSuivant"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IonCard, IonCardContent } from '@ionic/vue';
import { useExerciseHeader } from '@/composables/learning/useExerciseHeader';
import SeriesCardFooter, { type CardFeedback } from '@/components/learning/SeriesCardFooter.vue';
import { Chessboard } from '@/components/shared/Chessboard';
import PgnViewer from '@/components/learning/viewers/PgnViewer.vue';
import { shuffleArray } from '@/utils/chess/chessNotation';
import {
  parseAssociPlanPaires,
  getPlanLabel,
  type AssociPlanPaire,
} from '@/utils/parsers/associPlanParser';
import type { ExerciseType6Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType6Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

type AssociPlanPhase = 'choice' | 'preview' | 'pgn';

const currentPlanIndex = ref(0);
const phase = ref<AssociPlanPhase>('choice');
const solvedIndices = ref<number[]>([]);
const wrongClickedIndex = ref<number | null>(null);
const choiceFeedback = ref<CardFeedback | null>(null);
const pgnVisionne = ref(false);
const shuffledBoardOrder = ref<number[]>([]);

// Extraction et parsing des PGNs (4 plans max : A, B, C, D)
const paires = computed<AssociPlanPaire[]>(() => {
  return parseAssociPlanPaires((props.config as any)?.paires || []);
});

const totalPlans = computed(() => paires.value.length || 1);
const isLastPlan = computed(() => currentPlanIndex.value >= totalPlans.value - 1);

const paireActive = computed<AssociPlanPaire | null>(() => {
  return paires.value[currentPlanIndex.value] || null;
});

const remainingPaires = computed<AssociPlanPaire[]>(() => {
  const remainingSet = new Set(
    shuffledBoardOrder.value.filter((idx) => !solvedIndices.value.includes(idx))
  );
  return shuffledBoardOrder.value
    .filter((idx) => remainingSet.has(idx))
    .map((idx) => paires.value[idx])
    .filter((p): p is AssociPlanPaire => Boolean(p));
});

const initExercise = () => {
  currentPlanIndex.value = 0;
  solvedIndices.value = [];
  wrongClickedIndex.value = null;
  choiceFeedback.value = null;
  pgnVisionne.value = false;

  const indices = paires.value.map((p) => p.originalIndex);
  shuffledBoardOrder.value = indices.length > 1 ? shuffleArray(indices) : indices;
  phase.value = indices.length <= 1 ? 'preview' : 'choice';
};

watch(
  paires,
  () => {
    initExercise();
  },
  { immediate: true }
);

const exerciseHeader = useExerciseHeader();

const consigneActuelle = computed(() => {
  const label = getPlanLabel(currentPlanIndex.value);
  if (phase.value === 'choice') {
    return `Associe le ${label} au bon diagramme.`;
  }
  if (phase.value === 'preview') {
    return `Découvre le ${label}.`;
  }
  return label;
});

watch(
  [consigneActuelle, currentPlanIndex, totalPlans],
  ([consigne, idx, total]) => {
    exerciseHeader?.setHeaderState({
      consigne,
      stepBadgeText: `Carte ${idx + 1} / ${total}`,
    });
  },
  { immediate: true }
);

const startPgnPhase = () => {
  const pgn = paireActive.value?.pgn || '';
  const hasMoves = /\b\d+\s*\./.test(pgn);
  pgnVisionne.value = !hasMoves;
  wrongClickedIndex.value = null;
  choiceFeedback.value = null;
  phase.value = 'pgn';
};

const onSelectBoard = (clickedOriginalIndex: number) => {
  if (phase.value !== 'choice') return;

  if (clickedOriginalIndex === currentPlanIndex.value) {
    startPgnPhase();
  } else {
    wrongClickedIndex.value = clickedOriginalIndex;
    choiceFeedback.value = {
      type: 'danger',
      message: 'Ce n’est pas le bon diagramme pour ce plan. Réessaie !',
    };
  }
};

const onPgnFinished = () => {
  pgnVisionne.value = true;
};

const passerPlanSuivant = () => {
  if (!isLastPlan.value) {
    solvedIndices.value = [...solvedIndices.value, currentPlanIndex.value];
    currentPlanIndex.value++;
    wrongClickedIndex.value = null;
    choiceFeedback.value = null;
    pgnVisionne.value = false;

    const remainingCount = paires.value.length - solvedIndices.value.length;
    phase.value = remainingCount <= 1 ? 'preview' : 'choice';
  } else {
    emit('success');
  }
};
</script>
