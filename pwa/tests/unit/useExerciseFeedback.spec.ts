import { describe, expect, test } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import {
	provideExerciseFeedback,
	useExerciseFeedback,
	type ExerciseFeedbackContext,
} from '@/composables/learning/useExerciseFeedback';

describe( 'useExerciseFeedback.ts', () => {
	test( 'retourne null en dehors du shell ContenuPage', () => {
		let injected: ExerciseFeedbackContext | null = null;
		const Child = defineComponent( {
			setup() {
				injected = useExerciseFeedback();
				return () => null;
			},
		} );

		mount( Child );
		expect( injected ).toBeNull();
	} );

	test( 'permet de définir et effacer le feedback détaillé de l’entraîneur', () => {
		let parentCtx!: ExerciseFeedbackContext;
		let childCtx: ExerciseFeedbackContext | null = null;

		const Child = defineComponent( {
			setup() {
				childCtx = useExerciseFeedback();
				return () => null;
			},
		} );

		const Parent = defineComponent( {
			components: { Child },
			template: '<Child />',
			setup() {
				parentCtx = provideExerciseFeedback();
				return {};
			},
		} );

		mount( Parent );

		expect( parentCtx.coachFeedback.value ).toBeNull();
		expect( childCtx ).not.toBeNull();

		childCtx!.setCoachFeedback( {
			type: 'success',
			title: 'Explication',
			text: 'Le cavalier contrôle les cases centrales.',
			icon: '💡',
		} );

		expect( parentCtx.coachFeedback.value ).toEqual( {
			type: 'success',
			title: 'Explication',
			text: 'Le cavalier contrôle les cases centrales.',
			icon: '💡',
		} );

		childCtx!.clearCoachFeedback();
		expect( parentCtx.coachFeedback.value ).toBeNull();
	} );
} );
