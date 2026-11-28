import { describe, expect, test, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeMarcheHeros from '@/views/learning/types/TypeMarcheHeros.vue';
import { EXERCISE_HEADER_KEY, type ExerciseHeaderState } from '@/composables/learning/useExerciseHeader';
import type { ExerciseType7Config } from '@/types/roi';

vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'EgChessboard',
		props: [
			'diagram',
			'boardConfig',
			'playerColor',
			'mode',
			'stockfishConfig',
			'pieceSet',
			'boardTheme',
		],
		emits: [ 'move', 'board-created', 'square-click' ],
		template: `
      <div class="mock-eg-chessboard">
        <span class="mock-fen">{{ diagram ? diagram.fen : '' }}</span>
      </div>
    `,
	},
} ) );

vi.mock( '@/utils/chess/chessNotation', async ( importOriginal ) => {
	const actual = await importOriginal< typeof import( '@/utils/chess/chessNotation' ) >();
	return {
		...actual,
		shuffleArray: <T>( arr: T[] ) => [ ...arr ],
		shuffleNonSorted: <T>( arr: T[] ) => [ ...arr ].reverse(),
	};
} );

describe( 'TypeMarcheHeros.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	const makeSerie = ( moves: string ) => ( {
		pgn_data: `[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n${ moves } *`,
		couleur_joueur: 'white' as const,
	} );

	const sampleConfig: ExerciseType7Config = {
		mode: '5x3',
		series: [
			makeSerie( '1. e4 e5 2. Nf3 Nc6' ),
			makeSerie( '1. d4 d5 2. c4 e6' ),
			makeSerie( '1. c4 e5 2. Nc3 Nf6' ),
			makeSerie( '1. Nf3 d5 2. g3 Nf6' ),
			makeSerie( '1. e4 c5 2. Nf3 d6' ),
		],
	};

	test( 'permet de réordonner les tuiles par drag & drop en phase ordonnancement', async () => {
		const headerState = ref<ExerciseHeaderState>( {} );
		const wrapper = mount( TypeMarcheHeros, {
			props: {
				config: sampleConfig,
				id: 70,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
				provide: {
					[ EXERCISE_HEADER_KEY as symbol ]: {
						state: headerState,
						isManagedByShell: ref( true ),
						setHeaderState: ( next: ExerciseHeaderState ) => {
							headerState.value = { ...next };
						},
						resetHeaderState: () => {},
					},
				},
			},
		} );
		await wrapper.vm.$nextTick();

		// Étape 1 : Sélectionner les 3 premières cartes (série 1)
		const bankCards = wrapper.findAll( '.learning-board-card' );
		await bankCards[ 0 ].trigger( 'click' );
		await bankCards[ 1 ].trigger( 'click' );
		await bankCards[ 2 ].trigger( 'click' );
		await wrapper.find( '.next-card-btn' ).trigger( 'click' );

		// Étape 2 : Ordonnancement (ordre initial inversé [2, 1, 0])
		expect( wrapper.text() ).toContain( 'Fais glisser chaque carte' );
		const orderCards = wrapper.findAll( '.learning-board-card--draggable' );
		expect( orderCards ).toHaveLength( 3 );
		const footer = wrapper.findComponent( { name: 'SeriesCardFooter' } );
		expect( footer.props( 'isSolved' ) ).toBe( false );

		// Mock document.elementFromPoint pour simuler le survol de la cible
		const originalElementFromPoint = document.elementFromPoint;
		const dragTile = async ( fromIdx: number, toIdx: number ) => {
			const cards = wrapper.findAll( '.learning-board-card--draggable' );
			const targetEl = cards[ toIdx ].element;
			document.elementFromPoint = vi.fn().mockReturnValue( targetEl );

			cards[ fromIdx ].element.dispatchEvent(
				new MouseEvent( 'pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 } )
			);
			window.dispatchEvent(
				new MouseEvent( 'pointermove', { bubbles: true, clientX: 50, clientY: 50 } )
			);
			await wrapper.vm.$nextTick();
			window.dispatchEvent(
				new MouseEvent( 'pointerup', { bubbles: true, clientX: 50, clientY: 50 } )
			);
			await wrapper.vm.$nextTick();
		};

		// [2, 1, 0] -> glisser index 2 (ordre 0) en position 0 -> [0, 2, 1]
		await dragTile( 2, 0 );
		expect( footer.props( 'isSolved' ) ).toBe( false );

		// [0, 2, 1] -> glisser index 2 (ordre 1) en position 1 -> [0, 1, 2]
		await dragTile( 2, 1 );
		expect( footer.props( 'isSolved' ) ).toBe( true );

		document.elementFromPoint = originalElementFromPoint;
	} );
} );
