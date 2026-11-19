import type { InjectionKey, Ref } from 'vue';
import { inject, provide, ref } from 'vue';
import type { CalloutType } from '@/components/learning/LearningFeedbackCallout.vue';

/**
 * État du feedback pédagogique détaillé de l'entraîneur (`LearningFeedbackCallout`).
 * Aligné 1:1 avec les props de `LearningFeedbackCallout.vue`.
 */
export interface CoachFeedbackState {
  type: CalloutType;
  title?: string;
  text: string;
  icon?: string;
}

/**
 * Contexte fourni par `ContenuPage.vue` pour centraliser le feedback riche sous l'exercice.
 */
export interface ExerciseFeedbackContext {
  coachFeedback: Ref<CoachFeedbackState | null>;
  setCoachFeedback: (_feedback: CoachFeedbackState) => void;
  clearCoachFeedback: () => void;
}

export const EXERCISE_FEEDBACK_KEY: InjectionKey<ExerciseFeedbackContext> =
  Symbol('exerciseFeedback');

/**
 * Initialise et fournit le contexte de feedback pédagogique dans la page hôte (`ContenuPage`).
 */
export function provideExerciseFeedback(): ExerciseFeedbackContext {
  const coachFeedback = ref<CoachFeedbackState | null>(null);

  const setCoachFeedback = (feedback: CoachFeedbackState) => {
    coachFeedback.value = { ...feedback };
  };

  const clearCoachFeedback = () => {
    coachFeedback.value = null;
  };

  const context: ExerciseFeedbackContext = {
    coachFeedback,
    setCoachFeedback,
    clearCoachFeedback,
  };

  provide(EXERCISE_FEEDBACK_KEY, context);
  return context;
}

/**
 * Récupère le contexte de feedback pédagogique injecté par `ContenuPage`.
 * Retourne null en dehors du shell (ex: tests unitaires isolés).
 */
export function useExerciseFeedback(): ExerciseFeedbackContext | null {
  return inject(EXERCISE_FEEDBACK_KEY, null);
}
