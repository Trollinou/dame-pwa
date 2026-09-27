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

    <template v-if="carteActuelle">
      <!-- Échiquier avec FEN de départ, flèches [%cal] et déplacement interactif -->
      <div class="chessboard-container">
        <Chessboard
          :key="`board-${carteIndex}-${carteActuelle.fenDepart}`"
          :fen="fenAffichee"
          :shapes="carteActuelle.shapes"
          :orientation="carteActuelle.orientation"
          :player-color="carteActuelle.orientation"
          :view-only="isCurrentCardSolved"
          @board-created="onBoardCreated"
          @move="handleBoardMove"
        />
      </div>

      <!-- Choix de déplacements (3 choix possibles mélangés) -->
      <ion-card class="exercise-card">
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
              @click="selectionnerChoix(choix, true)"
            >
              <span class="choice-text">{{ choix.texte }}</span>
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
        <p class="learning-callout-text">
          {{ currentExplanation.message }}
        </p>
      </div>
    </template>

    <div v-else class="ion-text-center ion-padding error-container">
      <p>Aucun mini-PGN configuré pour cet exercice.</p>
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
  closeCircleOutline
} from 'ionicons/icons';
import { Chessboard } from '@/components/shared/Chessboard';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import {
  parseOuvreBoiteMiniPgn,
  type CarteOuvreBoite,
  type OuvreBoiteChoix
} from '@/utils/ouvreBoiteParser';
import type { BoardCore, Move } from 'eg-chessboard';

export interface ExerciceItem {
  pgn?: string;
  [key: string]: unknown;
}

const props = withDefaults(
  defineProps<{
    consigne?: string;
    exercices?: Array<ExerciceItem | string>;
    pgn?: string;
    metaTitre?: string;
    metaTypeLabel?: string;
    metaChapitreNiveauLabel?: string;
  }>(),
  {
    consigne: '',
    exercices: () => [],
    pgn: '',
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
  message: string;
} | null>(null);

// Parsing des cartes depuis les mini-PGNs fournis (avec filtrage des cartes vides)
const cartes = computed<CarteOuvreBoite[]>(() => {
  const rawList: (ExerciceItem | string)[] = [];
  if (Array.isArray(props.exercices) && props.exercices.length > 0) {
    rawList.push(...props.exercices);
  } else if (props.pgn && typeof props.pgn === 'string' && props.pgn.trim() !== '') {
    rawList.push({ pgn: props.pgn });
  }

  return rawList
    .map((item) => {
      const rawPgn = typeof item === 'string' ? item : item?.pgn || '';
      return rawPgn.trim();
    })
    .filter((rawPgn) => rawPgn.length > 0)
    .map((rawPgn, filteredIdx) => parseOuvreBoiteMiniPgn(rawPgn, filteredIdx))
    .filter((carte) => carte.choix.length > 0);
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
  if (carteActuelle.value) {
    api.setPosition(carteActuelle.value.fenDepart);
    if (carteActuelle.value.shapes.length > 0) {
      api.setShapes(carteActuelle.value.shapes);
    }
  }
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
      if (carteActuelle.value.shapes.length > 0) {
        boardApi.value.setShapes(carteActuelle.value.shapes);
      }
    }
  }
};

watch(
  () => [carteIndex.value, props.exercices, props.pgn],
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

// Sélection d'un choix (via clic bouton ou déplacement sur l'échiquier)
const selectionnerChoix = (choix: OuvreBoiteChoix, animateOnBoard: boolean = true) => {
  selectedChoixId.value = choix.id;

  if (choix.isCorrect) {
    isCurrentCardSolved.value = true;
    feedback.value = {
      type: 'success',
      message: 'Excellent coup !'
    };
    currentExplanation.value = {
      type: 'success',
      message: choix.explication
    };

    // Animer ou jouer le coup sur l'échiquier si déclenché par le bouton
    if (animateOnBoard && boardApi.value && choix.orig && choix.dest) {
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
      message: choix.explication
    };

    // Si le coup a été joué directement sur l'échiquier mais est incorrect, réinitialiser la position après délai
    if (!animateOnBoard) {
      setTimeout(() => {
        if (boardApi.value && carteActuelle.value && !isCurrentCardSolved.value) {
          boardApi.value.setPosition(carteActuelle.value.fenDepart);
          if (carteActuelle.value.shapes.length > 0) {
            boardApi.value.setShapes(carteActuelle.value.shapes);
          }
        }
      }, 1200);
    }
  }
};

// Gestion du coup joué directement sur l'échiquier
const handleBoardMove = (move: Move) => {
  if (isCurrentCardSolved.value || !carteActuelle.value) return;

  const fromSq = (move.from || '').toLowerCase();
  const toSq = (move.to || '').toLowerCase();
  const moveUci = `${fromSq}${toSq}`;
  const moveSanClean = (move.san || '').replace(/[+#x=]/g, '').trim();

  // Chercher si ce coup correspond à l'un des 3 choix proposés
  const matchedChoix = carteActuelle.value.choix.find((c) => {
    if (c.orig && c.dest && `${c.orig.toLowerCase()}${c.dest.toLowerCase()}` === moveUci) {
      return true;
    }
    if (moveSanClean && c.san && c.san.replace(/[+#x=]/g, '').trim() === moveSanClean) {
      return true;
    }
    return false;
  });

  if (matchedChoix) {
    selectionnerChoix(matchedChoix, false);
  } else {
    // Coup non proposé dans cette situation d'ouverture
    feedback.value = {
      type: 'warning',
      message: 'Ce coup ne fait pas partie des propositions d’ouverture.'
    };
    currentExplanation.value = {
      type: 'error',
      message: 'Observez bien les flèches sur l’échiquier et choisissez l’un des coups proposés.'
    };
    setTimeout(() => {
      if (boardApi.value && carteActuelle.value && !isCurrentCardSolved.value) {
        boardApi.value.setPosition(carteActuelle.value.fenDepart);
        if (carteActuelle.value.shapes.length > 0) {
          boardApi.value.setShapes(carteActuelle.value.shapes);
        }
      }
    }, 800);
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

