<template>
  <div class="exercise-stage">
    <!-- En-tête Unifié ContentHeader -->
    <ContentHeader
      :title="metaTitre || 'Ouvre-Boîte'"
      :typeLabel="metaTypeLabel || 'Ouvre-Boîte'"
      :chapitreNiveauLabel="metaChapitreNiveauLabel || ''"
      :consigne="consigneAffichee"
      :stepBadgeText="`Carte ${carteIndex + 1} / ${totalCartes}`"
    />

    <!-- Échiquier avec FEN de départ et flèches [%cal] -->
    <div v-if="carteActuelle" class="chessboard-container">
      <Chessboard
        :key="`board-${carteIndex}-${carteActuelle.fenDepart}`"
        :fen="fenAffichee"
        :shapes="carteActuelle.shapes"
        :orientation="carteActuelle.orientation"
        :player-color="carteActuelle.orientation"
        :view-only="true"
        @board-created="onBoardCreated"
      />
    </div>

    <!-- Choix de déplacements (3 choix possibles mélangés) -->
    <ion-card v-if="carteActuelle" class="exercise-card">
      <ion-card-header>
        <ion-card-title class="exercise-card-header">
          Quel coup choisissez-vous ?
        </ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <div class="qcm-choices">
          <ion-button
            v-for="choix in carteActuelle.choix"
            :key="choix.id"
            expand="block"
            :color="getButtonColor(choix)"
            :fill="getButtonFill(choix)"
            :disabled="isCurrentCardSolved"
            class="choice-btn"
            @click="selectionnerChoix(choix)"
          >
            <span class="choice-text" style="flex: 1; text-align: left;">{{ choix.texte }}</span>
            <ion-icon
              v-if="selectedChoixId === choix.id && choix.isCorrect"
              slot="end"
              :icon="checkmarkCircleOutline"
            />
            <ion-icon
              v-else-if="selectedChoixId === choix.id && !choix.isCorrect"
              slot="end"
              :icon="closeCircleOutline"
            />
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Panneau d'Explication Détaillée Unifié via learning-callout -->
    <div
      v-if="currentExplanation"
      class="learning-callout animate-fade-in"
      :class="currentExplanation.type === 'success' ? 'learning-callout--success' : 'learning-callout--error'"
    >
      <div class="learning-callout__title">
        <ion-icon
          :icon="currentExplanation.type === 'success' ? checkmarkCircleOutline : alertCircleOutline"
        />
        <span>{{ currentExplanation.title }}</span>
      </div>
      <p class="learning-callout-text">
        {{ currentExplanation.message }}
      </p>
    </div>

    <!-- Footer Fixe Unifié SeriesCardFooter -->
    <SeriesCardFooter
      :currentCard="carteIndex + 1"
      :totalCards="totalCartes"
      :isSolved="isCurrentCardSolved"
      :feedback="feedback"
      @next="passerCarteSuivante"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, watch } from 'vue';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon
} from '@ionic/vue';
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import {
  parseOuvreBoiteMiniPgn,
  type CarteOuvreBoite,
  type OuvreBoiteChoix
} from '@/utils/ouvreBoiteParser';
import type { BoardCore } from 'eg-chessboard';

export interface ExerciceItem {
  pgn?: string;
  [key: string]: unknown;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    exercices?: Array<ExerciceItem | string>;
    metaTitre?: string;
    metaTypeLabel?: string;
    metaChapitreNiveauLabel?: string;
  }>(),
  {
    consigne: '',
    exercices: () => [],
    metaTitre: "Ouvre'boîte",
    metaTypeLabel: "Ouvre'boîte",
    metaChapitreNiveauLabel: ''
  }
);

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const boardApi = shallowRef<BoardCore | null>(null);
const carteIndex = ref(0);
const selectedChoixId = ref<number | null>(null);
const isCurrentCardSolved = ref(false);
const feedback = ref<CardFeedback | null>(null);
const fenAffichee = ref<string>('');
const currentExplanation = ref<{
  type: 'success' | 'error';
  title: string;
  message: string;
} | null>(null);

// Parsing des cartes depuis les mini-PGNs fournis
const cartes = computed<CarteOuvreBoite[]>(() => {
  if (!props.exercices || !Array.isArray(props.exercices) || props.exercices.length === 0) {
    return [];
  }

  return props.exercices.map((item, idx) => {
    const rawPgn = typeof item === 'string' ? item : item?.pgn || '';
    return parseOuvreBoiteMiniPgn(rawPgn, idx);
  });
});

const totalCartes = computed(() => cartes.value.length || 1);

const carteActuelle = computed<CarteOuvreBoite | null>(() => {
  if (cartes.value.length === 0) return null;
  return cartes.value[carteIndex.value] || null;
});

const consigneAffichee = computed(() => {
  return props.consigne || 'Trouvez le bon coup d’ouverture.';
});

const onBoardCreated = (api: BoardCore) => {
  boardApi.value = api;
};

// Initialisation de la carte courante
const initCarte = () => {
  selectedChoixId.value = null;
  isCurrentCardSolved.value = false;
  feedback.value = null;
  currentExplanation.value = null;

  if (carteActuelle.value) {
    fenAffichee.value = carteActuelle.value.fenDepart;
    if (boardApi.value) {
      boardApi.value.setPosition(carteActuelle.value.fenDepart);
    }
  }
};

watch(
  () => [carteIndex.value, props.exercices],
  () => {
    initCarte();
  },
  { immediate: true, deep: true }
);

// Style et couleur des boutons de choix
const getButtonColor = (choix: OuvreBoiteChoix) => {
  if (selectedChoixId.value === choix.id) {
    return choix.isCorrect ? 'success' : 'danger';
  }
  if (isCurrentCardSolved.value && choix.isCorrect) {
    return 'success';
  }
  return 'primary';
};

const getButtonFill = (choix: OuvreBoiteChoix) => {
  if (selectedChoixId.value === choix.id || (isCurrentCardSolved.value && choix.isCorrect)) {
    return 'solid';
  }
  return 'outline';
};

// Sélection d'un choix
const selectionnerChoix = (choix: OuvreBoiteChoix) => {
  selectedChoixId.value = choix.id;

  if (choix.isCorrect) {
    isCurrentCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: 'Excellent coup !'
    };
    currentExplanation.value = {
      type: 'success',
      title: '✓ Bonne réponse !',
      message: choix.explication
    };

    // Animer ou jouer le coup sur l'échiquier
    if (boardApi.value && choix.orig && choix.dest) {
      try {
        boardApi.value.move(choix.orig + choix.dest);
      } catch (e) {
        console.warn('Erreur animation coup échiquier:', e);
      }
    }
  } else {
    isCurrentCardSolved.value = false;
    feedback.value = {
      type: 'danger',
      message: 'Ce n’est pas le bon coup. Observez bien l’explication !'
    };
    currentExplanation.value = {
      type: 'error',
      title: '✗ Mauvais choix',
      message: choix.explication
    };
  }
};

// Passage à la carte suivante ou validation finale
const passerCarteSuivante = () => {
  if (carteIndex.value < totalCartes.value - 1) {
    carteIndex.value++;
  } else {
    emit('success');
  }
};
</script>

