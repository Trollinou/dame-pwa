import confetti from 'canvas-confetti';
import { Haptics, NotificationType } from '@capacitor/haptics';

let lastCelebrationTime = 0;

/**
 * Déclenche une vibration haptique de succès sur mobile de façon sécurisée.
 */
export const triggerSuccessHaptics = async (): Promise< void > => {
	try {
		await Haptics.notification( { type: NotificationType.Success } );
	} catch {
		// Silencieux sur les plateformes web sans support haptique
	}
};

/**
 * Lance un feu d'artifice de confettis festifs en deux gerbes latérales (gauche et droite).
 * zIndex élevé pour s'afficher au-dessus du shadow DOM et des composants Ionic sur ordinateur et mobile.
 */
export const launchConfetti = (): void => {
	try {
		// Gerbe gauche
		confetti( {
			particleCount: 70,
			angle: 60,
			spread: 65,
			origin: { x: 0.05, y: 0.7 },
			colors: [ '#2dd36f', '#3880ff', '#ffc409', '#eb445a', '#7044ff' ],
			zIndex: 99999,
			ticks: 250,
		} );

		// Gerbe droite
		confetti( {
			particleCount: 70,
			angle: 120,
			spread: 65,
			origin: { x: 0.95, y: 0.7 },
			colors: [ '#2dd36f', '#3880ff', '#ffc409', '#eb445a', '#7044ff' ],
			zIndex: 99999,
			ticks: 250,
		} );
	} catch {
		// Silencieux si l'environnement ne supporte pas le canvas
	}
};

/**
 * Célébration complète de réussite d'exercice : confettis + retour haptique.
 * Intègre un anti-rebond (throttle 1.5s) pour éviter les tirs redondants.
 */
export const fireExerciseCelebration = (): void => {
	const now = Date.now();
	if ( now - lastCelebrationTime < 1500 ) {
		return;
	}
	lastCelebrationTime = now;

	launchConfetti();
	void triggerSuccessHaptics();
};
