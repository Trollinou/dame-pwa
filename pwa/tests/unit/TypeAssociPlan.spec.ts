import { describe, expect, test, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeAssociPlan from '@/views/learning/types/TypeAssociPlan.vue';
import type { ExerciseType6Config } from '@/types/roi';
import { EXERCISE_HEADER_KEY, type ExerciseHeaderState } from '@/composables/learning/useExerciseHeader';

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

describe( 'TypeAssociPlan.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	const sampleConfig = {
		paires: [
			{
				pgn: '[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n{ Description Plan A }\n1. e4 *',
			},
			{
				pgn: '[FEN "4k3/8/8/8/8/8/3P4/4K3 w - - 0 1"]\n{ Description Plan B }\n1. d4 *',
			},
			{
				pgn: '[FEN "4k3/8/8/8/8/8/2P5/4K3 w - - 0 1"]\n{ Description Plan C }\n1. c4 *',
			},
			{
				pgn: '[FEN "4k3/8/8/8/8/8/1P6/4K3 w - - 0 1"]\n{ Description Plan D }\n1. b4 *',
			},
		],
	};

	const mountComponent = () => {
		const headerState = ref<ExerciseHeaderState>( {} );
		const wrapper = mount( TypeAssociPlan, {
			props: {
				config: sampleConfig as unknown as ExerciseType6Config,
				id: 60,
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
		return { wrapper, headerState };
	};

	test( 'déroule les Plans A, B, C par élimination puis affiche le Plan D en aperçu avant son PGN', async () => {
		const { wrapper, headerState } = mountComponent();

		// Plan A : description A à gauche, 4 diagrammes à droite
		expect( headerState.value.consigne ).toBe( 'Associe le Plan A au bon diagramme.' );
		expect( wrapper.find( '.associ-plan-badge' ).text() ).toBe( 'Plan A' );
		expect( wrapper.find( '.associ-plan-desc-text' ).text() ).toBe( 'Description Plan A' );
		expect( wrapper.findAll( '.associ-plan-board-card' ) ).toHaveLength( 4 );

		// Mauvais clic (sur un diagramme qui n'est pas le Plan A)
		const fenPlanA = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
		const cardsStep1 = wrapper.findAll( '.associ-plan-board-card' );
		const wrongCard = cardsStep1.find( ( c ) => ! c.text().includes( fenPlanA ) );
		expect( wrongCard ).toBeDefined();
		await wrongCard!.trigger( 'click' );
		expect( wrapper.find( '.associ-plan-board-card.is-wrong' ).exists() ).toBe( true );
		expect( wrapper.findComponent( { name: 'PgnViewer' } ).exists() ).toBe( false );

		// Bon clic sur Plan A -> ouverture du PgnViewer pour Plan A
		const rightCardA = cardsStep1.find( ( c ) => c.text().includes( fenPlanA ) );
		expect( rightCardA ).toBeDefined();
		await rightCardA!.trigger( 'click' );
		expect( headerState.value.consigne ).toBe( 'Plan A' );
		const pgnViewerA = wrapper.findComponent( { name: 'PgnViewer' } );
		expect( pgnViewerA.exists() ).toBe( true );
		pgnViewerA.vm.$emit( 'finished' );
		await wrapper.vm.$nextTick();

		// Passer au Plan B (3 diagrammes restants)
		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		expect( headerState.value.consigne ).toBe( 'Associe le Plan B au bon diagramme.' );
		expect( wrapper.find( '.associ-plan-badge' ).text() ).toBe( 'Plan B' );
		expect( wrapper.findAll( '.associ-plan-board-card' ) ).toHaveLength( 3 );

		const fenPlanB = '4k3/8/8/8/8/8/3P4/4K3 w - - 0 1';
		const rightCardB = wrapper.findAll( '.associ-plan-board-card' ).find( ( c ) => c.text().includes( fenPlanB ) );
		await rightCardB!.trigger( 'click' );
		wrapper.findComponent( { name: 'PgnViewer' } ).vm.$emit( 'finished' );
		await wrapper.vm.$nextTick();

		// Passer au Plan C (2 diagrammes restants)
		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		expect( headerState.value.consigne ).toBe( 'Associe le Plan C au bon diagramme.' );
		expect( wrapper.find( '.associ-plan-badge' ).text() ).toBe( 'Plan C' );
		expect( wrapper.findAll( '.associ-plan-board-card' ) ).toHaveLength( 2 );

		const fenPlanC = '4k3/8/8/8/8/8/2P5/4K3 w - - 0 1';
		const rightCardC = wrapper.findAll( '.associ-plan-board-card' ).find( ( c ) => c.text().includes( fenPlanC ) );
		await rightCardC!.trigger( 'click' );
		wrapper.findComponent( { name: 'PgnViewer' } ).vm.$emit( 'finished' );
		await wrapper.vm.$nextTick();

		// Passer au Plan D : phase preview (1 seul diagramme + description) puis PGN
		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		expect( headerState.value.consigne ).toBe( 'Découvre le Plan D.' );
		expect( wrapper.find( '.associ-plan-badge' ).text() ).toBe( 'Plan D' );
		expect( wrapper.findAll( '.associ-plan-board-card' ) ).toHaveLength( 1 );

		// Passer au PGN du Plan D et terminer l'exercice
		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		expect( headerState.value.consigne ).toBe( 'Plan D' );
		const pgnViewerD = wrapper.findComponent( { name: 'PgnViewer' } );
		expect( pgnViewerD.exists() ).toBe( true );
		pgnViewerD.vm.$emit( 'finished' );
		await wrapper.vm.$nextTick();

		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		expect( wrapper.emitted( 'success' ) ).toHaveLength( 1 );
	} );
} );
