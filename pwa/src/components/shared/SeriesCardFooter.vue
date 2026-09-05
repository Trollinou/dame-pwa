<template>
  <div class="series-card-footer-container">
    <!-- Zone de feedback toujours présente (réservée dès le départ pour éviter tout décalage) -->
    <div
      class="feedback-row"
      :class="[effectiveFeedback ? 'feedback-' + effectiveFeedback.type : 'feedback-empty']"
    >
      <template v-if="effectiveFeedback">
        <ion-icon
          :icon="effectiveFeedback.type === 'success' ? checkmarkCircleOutline : alertCircleOutline"
          class="feedback-icon"
        />
        <span class="feedback-message">{{ effectiveFeedback.message }}</span>
      </template>
    </div>

    <!-- Bar de cartes compacte -->
    <div class="series-card-footer">
      <!-- Mode Terminé : Bouton Retour au cours à gauche + Bouton Suivant à droite -->
      <template v-if="isFinalCompleted">
        <ion-button
          fill="outline"
          size="small"
          color="medium"
          class="footer-course-btn animate-fade-in"
          title="Retour au cours"
          @click="exerciseNav?.onCourse"
        >
          <ion-icon slot="start" :icon="listOutline" />
          <span>Cours</span>
        </ion-button>

        <div class="action-zone">
          <ion-button
            color="success"
            size="small"
            fill="solid"
            :disabled="disabled"
            class="next-card-btn next-exercise-btn animate-fade-in"
            @click="handleFinalNext"
          >
            <span>{{ exerciseNav?.nextLabel.value }}</span>
            <ion-icon slot="end" :icon="exerciseNav?.hasNext.value ? arrowForwardOutline : checkmarkCircleOutline" />
          </ion-button>
        </div>
      </template>

      <!-- Mode Standard (en cours d'exercice ou sans contexte injecté) -->
      <template v-else>
        <!-- Badge compact d'étape / carte -->
        <ion-badge color="medium" class="card-badge">
          {{ badgePrefix }} {{ currentCard }} / {{ totalCards }}
        </ion-badge>

        <!-- Zone d'action interactive -->
        <div class="action-zone">
          <ion-button
            v-if="isSolved"
            :color="isLastCard ? 'success' : 'primary'"
            size="small"
            fill="solid"
            :disabled="disabled"
            class="next-card-btn animate-fade-in"
            :title="disabled ? disabledHint : buttonLabel"
            @click="!disabled && emit('next')"
          >
            <span>{{ buttonLabel }}</span>
            <ion-icon slot="end" :icon="isLastCard ? checkmarkCircleOutline : arrowForwardOutline" />
          </ion-button>

          <span v-else class="pending-hint">
            {{ pendingHintText }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { IonBadge, IonButton, IonIcon } from '@ionic/vue';
import {
  arrowForwardOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  listOutline
} from 'ionicons/icons';
import { useExerciseNavigation } from '@/composables/useExerciseNavigation';
import { fireExerciseCelebration } from '@/composables/useCelebration';

export interface CardFeedback {
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
}

const props = withDefaults(
  defineProps<{
    currentCard: number;
    totalCards: number;
    isSolved: boolean;
    disabled?: boolean;
    feedback?: CardFeedback | null;
    nextText?: string;
    finishText?: string;
    pendingHint?: string;
    disabledHint?: string;
    badgePrefix?: string;
  }>(),
  {
    disabled: false,
    feedback: null,
    nextText: 'Carte suivante',
    finishText: 'Terminer l\'exercice',
    pendingHint: 'Trouvez la solution pour continuer',
    disabledHint: 'Visionnez tous les coups pour continuer',
    badgePrefix: 'Carte'
  }
);

const emit = defineEmits<{
  (e: 'next'): void;
}>();

const exerciseNav = useExerciseNavigation();

const isLastCard = computed(() => props.currentCard >= props.totalCards);

const isFinalCompleted = computed(() => {
  return isLastCard.value && props.isSolved && exerciseNav !== null;
});

watch(
  () => isFinalCompleted.value,
  (completed) => {
    if (completed) {
      fireExerciseCelebration();
    }
  },
  { immediate: true }
);

const effectiveFeedback = computed<CardFeedback | null>(() => {
  if (props.feedback) {
    return props.feedback;
  }
  if (isFinalCompleted.value) {
    return {
      type: 'success',
      message: '🎉 Exercice réussi !'
    };
  }
  return null;
});

const buttonLabel = computed(() => {
  if (isLastCard.value) {
    return props.finishText;
  }
  return props.nextText;
});

const pendingHintText = computed(() => {
  if (props.pendingHint) {
    return props.pendingHint;
  }
  return 'Trouvez la solution pour continuer';
});

const handleFinalNext = () => {
  if (props.disabled) return;
  emit('next');
  if (exerciseNav) {
    exerciseNav.onNext();
  }
};
</script>

<style scoped>
.series-card-footer-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
}

/* Zone de Feedback Fixe et Pré-réservée */
.feedback-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  box-sizing: border-box;
  transition: opacity 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.feedback-empty {
  visibility: hidden;
  border: 1px solid transparent;
}

.feedback-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.feedback-message {
  flex: 1;
  line-height: 1.2;
}

.feedback-success {
  background: var(--ion-color-success, #2dd36f);
  color: var(--ion-color-success-contrast, #ffffff);
  border: 1px solid var(--ion-color-success-shade, #28ba62);
}

.feedback-danger {
  background: var(--ion-color-danger, #eb445a);
  color: var(--ion-color-danger-contrast, #ffffff);
  border: 1px solid var(--ion-color-danger-shade, #cf3c4f);
}

.feedback-warning {
  background: var(--ion-color-warning, #ffc409);
  color: var(--ion-color-warning-contrast, #000000);
  border: 1px solid var(--ion-color-warning-shade, #e0ac08);
}

.feedback-info {
  background: var(--ion-color-primary, #3880ff);
  color: var(--ion-color-primary-contrast, #ffffff);
  border: 1px solid var(--ion-color-primary-shade, #3171e0);
}

/* Bar de Cartes Compacte */
.series-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 40px;
  padding: 4px 12px;
  background: var(--ion-color-step-50, #f8f9fa);
  border: 1px solid var(--ion-color-step-200, #e9ecef);
  border-radius: 8px;
  box-sizing: border-box;
}

.card-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.action-zone {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  min-width: 0;
}

.footer-course-btn {
  --border-radius: 6px;
  font-weight: 600;
  font-size: 0.8rem;
  height: 30px;
  margin: 0;
  flex-shrink: 0;
}

.next-card-btn {
  --border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  height: 30px;
  margin: 0;
}

.next-exercise-btn {
  font-weight: 700;
  animation: pulseGlow 1.8s infinite;
}

@keyframes pulseGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(45, 211, 111, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(45, 211, 111, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(45, 211, 111, 0);
  }
}

.next-card-btn[disabled],
.next-card-btn.button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.pending-hint {
  font-size: 0.78rem;
  color: var(--ion-color-medium-shade, #888888);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
