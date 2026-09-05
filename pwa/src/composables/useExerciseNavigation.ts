import type { InjectionKey, ComputedRef } from 'vue';
import { inject } from 'vue';

/**
 * Contexte de navigation fourni par la page hôte (ex: ContenuPage)
 * aux composants d'exercice et à SeriesCardFooter.
 */
export interface ExerciseNavigationContext {
	/**
	 * Indique s'il existe un exercice ou une leçon suivante dans le parcours.
	 */
	hasNext: ComputedRef< boolean >;

	/**
	 * Libellé du bouton d'action principal (« Exercice suivant », « Leçon suivante », ou « Terminer le cours »).
	 */
	nextLabel: ComputedRef< string >;

	/**
	 * Indique si le cours parent est connu.
	 */
	hasCourse: ComputedRef< boolean >;

	/**
	 * URL de redirection vers le cours parent ou la liste des cours.
	 */
	courseUrl: ComputedRef< string >;

	/**
	 * Déclenche le passage à l'élément suivant dans le parcours.
	 */
	onNext: () => void;

	/**
	 * Déclenche le retour au cours parent ou à la liste.
	 */
	onCourse: () => void;
}

export const EXERCISE_NAVIGATION_KEY: InjectionKey< ExerciseNavigationContext > =
	Symbol( 'exerciseNavigation' );

/**
 * Récupère le contexte de navigation globale injecté par le shell d'apprentissage (ContenuPage).
 * Retourne null si le composant est exécuté en dehors de ContenuPage (ex: tests unitaires ou page autonome).
 */
export function useExerciseNavigation(): ExerciseNavigationContext | null {
	return inject( EXERCISE_NAVIGATION_KEY, null );
}
