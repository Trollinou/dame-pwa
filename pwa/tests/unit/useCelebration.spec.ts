import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
	launchConfetti,
	triggerSuccessHaptics,
	fireExerciseCelebration,
} from '@/composables/useCelebration';
import confetti from 'canvas-confetti';
import { Haptics, NotificationType } from '@capacitor/haptics';

vi.mock( 'canvas-confetti', () => ( {
	default: vi.fn(),
} ) );

vi.mock( '@capacitor/haptics', () => ( {
	Haptics: {
		notification: vi.fn(),
	},
	NotificationType: {
		Success: 'SUCCESS',
	},
} ) );

describe( 'useCelebration.ts', () => {
	beforeEach( () => {
		vi.clearAllMocks();
	} );

	test( 'launchConfetti appelle confetti avec deux gerbes latérales', () => {
		launchConfetti();
		expect( confetti ).toHaveBeenCalledTimes( 2 );
	} );

	test( 'triggerSuccessHaptics appelle Haptics.notification avec Success', async () => {
		await triggerSuccessHaptics();
		expect( Haptics.notification ).toHaveBeenCalledWith( {
			type: NotificationType.Success,
		} );
	} );

	test( 'fireExerciseCelebration déclenche confettis et haptique', () => {
		fireExerciseCelebration();
		expect( confetti ).toHaveBeenCalledTimes( 2 );
		expect( Haptics.notification ).toHaveBeenCalledWith( {
			type: NotificationType.Success,
		} );
	} );
} );
