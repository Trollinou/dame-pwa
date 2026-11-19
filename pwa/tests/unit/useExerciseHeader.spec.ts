import { describe, expect, test } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import {
	provideExerciseHeader,
	useExerciseHeader,
	type ExerciseHeaderContext,
} from '@/composables/learning/useExerciseHeader';

describe( 'useExerciseHeader.ts', () => {
	test( 'retourne null en dehors du shell ContenuPage', () => {
		let injected: ExerciseHeaderContext | null = null;
		const Child = defineComponent( {
			setup() {
				injected = useExerciseHeader();
				return () => null;
			},
		} );

		mount( Child );
		expect( injected ).toBeNull();
	} );

	test( 'permet de piloter et réinitialiser l’état du ContentHeader depuis un enfant', () => {
		let parentCtx!: ExerciseHeaderContext;
		let childCtx: ExerciseHeaderContext | null = null;

		const Child = defineComponent( {
			setup() {
				childCtx = useExerciseHeader();
				return () => null;
			},
		} );

		const Parent = defineComponent( {
			components: { Child },
			template: '<Child />',
			setup() {
				parentCtx = provideExerciseHeader();
				return {};
			},
		} );

		mount( Parent );

		expect( parentCtx.isManagedByShell.value ).toBe( false );
		expect( childCtx ).not.toBeNull();

		childCtx!.setHeaderState( {
			consigne: 'Trouvez le meilleur coup',
			stepBadgeText: '2 / 5',
			hideSubPanel: false,
		} );

		expect( parentCtx.isManagedByShell.value ).toBe( true );
		expect( parentCtx.state.value ).toEqual( {
			consigne: 'Trouvez le meilleur coup',
			stepBadgeText: '2 / 5',
			hideSubPanel: false,
		} );

		parentCtx.resetHeaderState();

		expect( parentCtx.isManagedByShell.value ).toBe( false );
		expect( parentCtx.state.value ).toEqual( {} );
	} );
} );
