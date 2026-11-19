import type { InjectionKey, Ref } from 'vue';
import { inject, provide, ref } from 'vue';

/**
 * État dynamique de l'en-tête unifié d'exercice (`ContentHeader`) piloté par le shell.
 */
export interface ExerciseHeaderState {
  consigne?: string;
  stepBadgeText?: string;
  hideSubPanel?: boolean;
}

/**
 * Contexte fourni par `ContenuPage.vue` pour centraliser `ContentHeader`.
 */
export interface ExerciseHeaderContext {
  state: Ref<ExerciseHeaderState>;
  isManagedByShell: Ref<boolean>;
  setHeaderState: (_next: ExerciseHeaderState) => void;
  resetHeaderState: () => void;
}

export const EXERCISE_HEADER_KEY: InjectionKey<ExerciseHeaderContext> =
  Symbol('exerciseHeader');

/**
 * Initialise et fournit le contexte d'en-tête dans la page hôte (`ContenuPage`).
 */
export function provideExerciseHeader(): ExerciseHeaderContext {
  const state = ref<ExerciseHeaderState>({});
  const isManagedByShell = ref(false);

  const setHeaderState = (next: ExerciseHeaderState) => {
    isManagedByShell.value = true;
    state.value = { ...next };
  };

  const resetHeaderState = () => {
    isManagedByShell.value = false;
    state.value = {};
  };

  const context: ExerciseHeaderContext = {
    state,
    isManagedByShell,
    setHeaderState,
    resetHeaderState,
  };

  provide(EXERCISE_HEADER_KEY, context);
  return context;
}

/**
 * Récupère le contexte d'en-tête injecté par `ContenuPage`.
 * Retourne null en dehors du shell (ex: tests unitaires isolés).
 */
export function useExerciseHeader(): ExerciseHeaderContext | null {
  return inject(EXERCISE_HEADER_KEY, null);
}
