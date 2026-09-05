import confetti from 'canvas-confetti';
import { Haptics, NotificationType } from '@capacitor/haptics';

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
 */
export const launchConfetti = (): void => {
	try {
		// Gerbe gauche
		confetti( {
			particleCount: 50,
			angle: 60,
			spread: 55,
			origin: { x: 0.1, y: 0.75 },
			colors: [ '#2dd36f', '#3880ff', '#ffc409', '#eb445a', '#7044ff' ],
			disableForReducedMotion: true,
		} );

		// Gerbe droite
		confetti( {
			particleCount: 50,
			angle: 120,
			spread: 55,
			origin: { x: 0.9, y: 0.75 },
			colors: [ '#2dd36f', '#3880ff', '#ffc409', '#eb445a', '#7044ff' ],
			disableForReducedMotion: true,
		} );
	} catch {
		// Silencieux si l'environnement ne supporte pas le canvas
	}
};

/**
 * Célébration complète de réussite d'exercice : confettis + retour haptique.
 */
export const fireExerciseCelebration = (): void => {
	launchConfetti();
	void triggerSuccessHaptics();
};
