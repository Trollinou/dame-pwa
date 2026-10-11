import { toastController } from '@ionic/vue';

export type FeedbackType =
	| 'success'
	| 'danger'
	| 'warning'
	| 'info'
	| 'primary'
	| 'medium';

export interface FeedbackOptions {
	duration?: number;
	position?: 'top' | 'middle' | 'bottom';
	cssClass?: string;
	buttons?: Array< {
		text?: string;
		icon?: string;
		role?: 'cancel' | string;
		handler?: () => boolean | void | Promise< boolean | void >;
	} >;
}

/**
 * Composable standardisant la gestion des retours utilisateurs (Toasts) via Ionic.
 *
 * @example
 * ```ts
 * const { showSuccess, showError, showToast } = useFeedback();
 *
 * // Succès rapide
 * showSuccess('Exercice réussi !');
 *
 * // Erreur
 * showError('Coup incorrect, réessaie.');
 * ```
 */
export function useFeedback() {
	/**
	 * Affiche un toast personnalisé.
	 * @param message
	 * @param type
	 * @param options
	 */
	const showToast = async (
		message: string,
		type: FeedbackType = 'info',
		options: FeedbackOptions = {}
	): Promise< HTMLIonToastElement > => {
		const {
			duration = 2000,
			position = 'bottom',
			cssClass,
			buttons,
		} = options;

		const toast = await toastController.create( {
			message,
			duration,
			color: type,
			position,
			cssClass,
			buttons,
		} );

		await toast.present();
		return toast;
	};

	/**
	 * Affiche un toast de succès (vert).
	 * @param message
	 * @param duration
	 * @param options
	 */
	const showSuccess = (
		message: string,
		duration = 2000,
		options?: Omit< FeedbackOptions, 'duration' >
	) => showToast( message, 'success', { duration, ...options } );

	/**
	 * Affiche un toast d'erreur (rouge).
	 * @param message
	 * @param duration
	 * @param options
	 */
	const showError = (
		message: string,
		duration = 2500,
		options?: Omit< FeedbackOptions, 'duration' >
	) => showToast( message, 'danger', { duration, ...options } );

	/**
	 * Affiche un toast d'avertissement (jaune/orange).
	 * @param message
	 * @param duration
	 * @param options
	 */
	const showWarning = (
		message: string,
		duration = 2500,
		options?: Omit< FeedbackOptions, 'duration' >
	) => showToast( message, 'warning', { duration, ...options } );

	/**
	 * Affiche un toast d'information (bleu/primaire).
	 * @param message
	 * @param duration
	 * @param options
	 */
	const showInfo = (
		message: string,
		duration = 2000,
		options?: Omit< FeedbackOptions, 'duration' >
	) => showToast( message, 'primary', { duration, ...options } );

	return {
		showToast,
		showSuccess,
		showError,
		showWarning,
		showInfo,
	};
}
