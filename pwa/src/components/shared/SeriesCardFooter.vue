<template>
  <Teleport defer :to="portalTarget || 'body'" :disabled="!isTeleportEnabled">
    <div :key="`footer-${props.currentCard}-${props.totalCards}`" class="series-card-footer-container">
    <!-- Zone de feedback (conditionnelle selon le type de contenu) -->
    <div
      v-if="!hideFeedback"
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
      <!-- Mode Terminé -->
      <template v-if="isFinalCompleted">
        <!-- Pendant la temporisation (laissant le temps de voir la résolution et les confettis) -->
        <template v-if="!showNextExerciseBtn">
          <ion-badge color="medium" class="card-badge">
            {{ badgePrefix }} {{ currentCard }} / {{ totalCards }}
          </ion-badge>
          <div class="action-zone">
            <ion-badge color="success" class="card-badge success-resolu-badge animate-fade-in">
              {{ completedText }}
            </ion-badge>
          </div>
        </template>

        <!-- Après la temporisation : Bouton Retour au cours à gauche + Bouton Suivant à droite -->
        <template v-else>
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

          <!-- Bouton d'action directe quand non-résolu (ex: vidéo ou étape passive) -->
          <ion-button
            v-else-if="showActionButtonWhenUnsolved"
            :color="actionButtonColor || 'primary'"
            size="small"
            fill="solid"
            :disabled="disabled"
            class="next-card-btn animate-fade-in"
            @click="!disabled && emit('action')"
          >
            <span>{{ actionButtonText }}</span>
            <ion-icon slot="end" :icon="checkmarkCircleOutline" />
          </ion-button>

          <span v-else class="pending-hint">
            {{ pendingHintText }}
          </span>
        </div>
      </template>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, ref, onUnmounted, inject } from 'vue';
import type { Ref } from 'vue';
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
    completedText?: string;
    pendingHint?: string;
    disabledHint?: string;
    badgePrefix?: string;
    showActionButtonWhenUnsolved?: boolean;
    actionButtonText?: string;
    actionButtonColor?: string;
    isAlreadyCompleted?: boolean;
    hideFeedback?: boolean;
  }>(),
  {
    disabled: false,
    feedback: null,
    nextText: 'Carte suivante',
    finishText: 'Terminer l\'exercice',
    completedText: '🎉 Exercice réussi !',
    pendingHint: 'Trouvez la solution pour continuer',
    disabledHint: 'Visionnez tous les coups pour continuer',
    badgePrefix: 'Carte',
    showActionButtonWhenUnsolved: false,
    actionButtonText: 'Valider',
    actionButtonColor: 'primary',
    isAlreadyCompleted: false,
    hideFeedback: false
  }
);

const emit = defineEmits<{
  (e: 'next'): void;
  (e: 'action'): void;
}>();

const exerciseNav = useExerciseNavigation();
const footerPortalRef = inject<Ref<HTMLElement | null> | HTMLElement | null>('exerciseFooterPortal', null);

const portalTarget = computed<HTMLElement | null>(() => {
  if (!footerPortalRef) return null;
  if (footerPortalRef && typeof footerPortalRef === 'object' && 'value' in footerPortalRef) {
    return footerPortalRef.value;
  }
  return footerPortalRef as HTMLElement;
});

const isTeleportEnabled = computed(() => !!portalTarget.value);

const showNextExerciseBtn = ref(false);
let nextButtonTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialMount = true;

const isLastCard = computed(() => props.currentCard >= props.totalCards);

const isFinalCompleted = computed(() => {
  return isLastCard.value && props.isSolved && !props.disabled && exerciseNav !== null;
});

watch(
  () => isFinalCompleted.value,
  (completed) => {
    if (isInitialMount) {
      isInitialMount = false;
      if (completed && props.isAlreadyCompleted) {
        showNextExerciseBtn.value = true;
        return;
      }
    }

    if (completed) {
      fireExerciseCelebration();
      if (exerciseNav?.onSuccess) {
        exerciseNav.onSuccess();
      }
      showNextExerciseBtn.value = false;
      if (nextButtonTimer) {
        clearTimeout(nextButtonTimer);
      }
      nextButtonTimer = setTimeout(() => {
        showNextExerciseBtn.value = true;
      }, 2200);
    } else {
      showNextExerciseBtn.value = false;
      if (nextButtonTimer) {
        clearTimeout(nextButtonTimer);
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (nextButtonTimer) {
    clearTimeout(nextButtonTimer);
  }
});

const effectiveFeedback = computed<CardFeedback | null>(() => {
  if (isFinalCompleted.value) {
    return {
      type: 'success',
      message: props.feedback?.message
        ? `🎉 Exercice réussi ! ${props.feedback.message}`
        : '🎉 Exercice réussi !'
    };
  }
  if (props.feedback) {
    return props.feedback;
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

const handleFinalNext = async () => {
  if (props.disabled) return;
  emit('next');
  if (exerciseNav?.onSuccess) {
    try {
      await exerciseNav.onSuccess();
    } catch {
      // ignore
    }
  }
  if (exerciseNav) {
    exerciseNav.onNext();
  }
};
</script>
