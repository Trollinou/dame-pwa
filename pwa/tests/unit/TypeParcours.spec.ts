import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeParcours from '@/views/types/TypeParcours.vue';
import {
	getParcoursVariant,
	registerParcoursVariant,
	extractPieceTypeFromFen,
	getPieceRoleLabel,
	removePieceFromSquareInFen,
	type ParcoursBoardApi,
} from '@/utils/parcoursVariants';

// Mock eg-chessboard
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
		mounted() {
			this.$emit( 'board-created', {
				setSoloMode: vi.fn(),
				setPreserveShapesOnPositionChange: vi.fn(),
				setShapes: vi.fn(),
				setPosition: vi.fn(),
				getPieces: () => [],
				isSquareAttacked: () => false,
			} );
		},
		template: `
      <div class="mock-eg-chessboard">
        <span class="mock-fen">{{ diagram ? diagram.fen : '' }}</span>
        <button
          class="mock-move-btn-target"
          @click="$emit('move', { san: 'Ne4', from: 'c3', to: 'e4', lan: 'c3e4' })"
        >
          Play c3-e4
        </button>
        <button
          class="mock-move-btn-red"
          @click="$emit('move', { san: 'Nd5', from: 'c3', to: 'd5', lan: 'c3d5' })"
        >
          Play c3-d5 (Red)
        </button>
        <button
          class="mock-move-btn-c6"
          @click="$emit('move', { san: 'Nc6', from: 'e4', to: 'c6', lan: 'e4c6' })"
        >
          Play e4-c6
        </button>
        <button
          class="mock-move-btn-h8"
          @click="$emit('move', { san: 'Nh8', from: 'f7', to: 'h8', lan: 'f7h8' })"
        >
          Play f7-h8
        </button>
      </div>
    `,
	},
} ) );

describe( 'parcoursVariants - Logic & Extensibility', () => {
	test( 'standard variant detects red squares and arrival', () => {
		const standard = getParcoursVariant( 'standard' );
		expect( standard.id ).toBe( 'standard' );

		const mockBoardApi: ParcoursBoardApi = {
			getPieces: () => [],
			isSquareAttacked: () => false,
		};

		// 1. Move to red square
		const redResult = standard.validateMove( {
			from: 'c3',
			to: 'd5',
			fenDepart: '8/8/8/8/8/2N5/8/8 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'c3',
			caseArrivee: 'e4',
			shapes: [ { orig: 'd5', brush: 'red' } ],
			boardApi: mockBoardApi,
		} );
		expect( redResult.valid ).toBe( false );
		expect( redResult.errorMessage ).toBe( 'Case interdite !' );

		// 2. Move to intermediate safe square
		const normalResult = standard.validateMove( {
			from: 'c3',
			to: 'b5',
			fenDepart: '8/8/8/8/8/2N5/8/8 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'c3',
			caseArrivee: 'e4',
			shapes: [ { orig: 'd5', brush: 'red' } ],
			boardApi: mockBoardApi,
		} );
		expect( normalResult.valid ).toBe( true );
		expect( normalResult.isFinished ).toBe( false );

		// 3. Move to target square
		const targetResult = standard.validateMove( {
			from: 'c3',
			to: 'e4',
			fenDepart: '8/8/8/8/8/2N5/8/8 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'c3',
			caseArrivee: 'e4',
			shapes: [ { orig: 'd5', brush: 'red' } ],
			boardApi: mockBoardApi,
		} );
		expect( targetResult.valid ).toBe( true );
		expect( targetResult.isFinished ).toBe( true );
	} );

	test( 'pacman variant requires all opponent pieces to be captured', () => {
		const pacman = getParcoursVariant( 'pacman' );
		expect( pacman.id ).toBe( 'pacman' );

		// Case 1: opponent pieces remaining
		const mockBoardWithOpponent: ParcoursBoardApi = {
			getPieces: () => [
				{ role: 'n', color: 'w' },
				{ role: 'p', color: 'b' },
			],
			isSquareAttacked: () => false,
		};
		const notAllEatenResult = pacman.validateMove( {
			from: 'e4',
			to: 'c6',
			fenDepart: '8/8/2p5/8/4N3/8/8/8 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'e4',
			caseArrivee: 'c6',
			shapes: [],
			boardApi: mockBoardWithOpponent,
		} );
		expect( notAllEatenResult.valid ).toBe( false );
		expect( notAllEatenResult.errorMessage ).toContain( 'manger' );

		// Case 2: no opponent pieces remaining
		const mockBoardEmptyOpponent: ParcoursBoardApi = {
			getPieces: () => [ { role: 'n', color: 'w' } ],
			isSquareAttacked: () => false,
		};
		const allEatenResult = pacman.validateMove( {
			from: 'e4',
			to: 'c6',
			fenDepart: '8/8/8/8/4N3/8/8/8 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'e4',
			caseArrivee: 'c6',
			shapes: [],
			boardApi: mockBoardEmptyOpponent,
		} );
		expect( allEatenResult.valid ).toBe( true );
		expect( allEatenResult.isFinished ).toBe( true );
	} );

	test( 'stealth variant prevents stepping onto attacked squares', () => {
		const stealth = getParcoursVariant( 'stealth' );
		expect( stealth.id ).toBe( 'stealth' );

		const mockBoardAttacked: ParcoursBoardApi = {
			getPieces: () => [],
			isSquareAttacked: ( sq: string, col: string ) =>
				sq === 'e4' && col === 'black',
		};
		const attackedResult = stealth.validateMove( {
			from: 'c3',
			to: 'e4',
			fenDepart: '8/8/8/3r4/8/2N5/8/8 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'c3',
			caseArrivee: 'e4',
			shapes: [],
			boardApi: mockBoardAttacked,
		} );
		expect( attackedResult.valid ).toBe( false );
		expect( attackedResult.errorMessage ).toBe( 'Vous avez été repéré !' );
	} );

	test( 'traces variant and piece helpers work correctly', () => {
		const traces = getParcoursVariant( 'traces' );
		expect( traces.id ).toBe( 'traces' );
		expect( traces.getDefaultConsigne( '' ) ).toBe(
			'Mais qui a bien pu laisser ces traces ?'
		);

		expect( extractPieceTypeFromFen( '8/8/7Q/8/8/8/8/8 w - - 0 1' ) ).toBe(
			'q'
		);
		expect( extractPieceTypeFromFen( '8/8/8/8/8/4N3/8/8 w - - 0 1' ) ).toBe(
			'n'
		);
		expect(
			extractPieceTypeFromFen( '8/8/8/8/8/8/8/8 w - - 0 1' )
		).toBeNull();

		expect( getPieceRoleLabel( 'q' ) ).toBe( 'Dame' );
		expect( getPieceRoleLabel( 'n' ) ).toBe( 'Cavalier' );
		expect( getPieceRoleLabel( 'r' ) ).toBe( 'Tour' );
		expect( getPieceRoleLabel( 'b' ) ).toBe( 'Fou' );
		expect( getPieceRoleLabel( 'k' ) ).toBe( 'Roi' );
		expect( getPieceRoleLabel( 'p' ) ).toBe( 'Pion' );
	} );

	test( 'removePieceFromSquareInFen clears specific square correctly', () => {
		const fenWithQueen = '8/8/7Q/8/8/8/8/8 w - - 0 1';
		expect( removePieceFromSquareInFen( fenWithQueen, 'h6' ) ).toBe(
			'8/8/8/8/8/8/8/8 w - - 0 1'
		);

		const fenComplex =
			'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
		expect( removePieceFromSquareInFen( fenComplex, 'c6' ) ).toBe(
			'r1bqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
		);

		// If square is already empty or invalid, returns unchanged
		expect( removePieceFromSquareInFen( fenComplex, 'e4' ) ).toBe(
			'r1bqkbnr/pppp1ppp/2n5/4p3/8/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
		);
		expect( removePieceFromSquareInFen( fenComplex, '' ) ).toBe(
			fenComplex
		);
	} );

	test( 'supports custom registered variant', () => {
		registerParcoursVariant( {
			id: 'custom_test',
			name: 'Custom Test Variant',
			getDefaultConsigne: () => 'Consigne custom',
			getPendingHint: () => 'Hint custom',
			validateMove: () => ( { valid: true, isFinished: true } ),
		} );

		const custom = getParcoursVariant( 'custom_test' );
		expect( custom.id ).toBe( 'custom_test' );
		expect( custom.name ).toBe( 'Custom Test Variant' );
	} );
} );

describe( 'TypeParcours.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.useFakeTimers();
	} );

	const sample3SeriesConfig = {
		consigne: 'Complétez les 3 parcours.',
		metaTitre: 'T9 - Parcours Tactiques',
		metaTypeLabel: 'Parcours',
		metaChapitreNiveauLabel: 'Niveau 1',
		series: [
			{
				variante: 'standard',
				description: 'Parcours 1 : Rejoignez la case e4.',
				fen_depart: '8/8/8/8/8/2N5/8/8 w - - 0 1',
				couleur_joueur: 'white' as const,
				case_depart: 'c3',
				case_arrivee: 'e4',
				shapes: [ { orig: 'd5', brush: 'red' } ],
			},
			{
				variante: 'pacman',
				description: 'Parcours 2 : Mangez tout avant c6.',
				fen_depart: '8/8/8/8/4N3/8/8/8 w - - 0 1',
				couleur_joueur: 'white' as const,
				case_depart: 'e4',
				case_arrivee: 'c6',
				shapes: [],
			},
			{
				variante: 'stealth',
				description: 'Parcours 3 : Infiltrez h8.',
				fen_depart: '8/5N2/8/8/8/8/8/8 w - - 0 1',
				couleur_joueur: 'white' as const,
				case_depart: 'f7',
				case_arrivee: 'h8',
				shapes: [],
			},
		],
	};

	test( 'renders 3 parcours series and advances step by step until final success', async () => {
		const wrapper = mount( TypeParcours, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
			},
			props: {
				id: 901,
				config: sample3SeriesConfig,
			},
		} );

		// ==========================================
		// PARCOURS 1 / 3
		// ==========================================
		expect( wrapper.text() ).toContain( 'Parcours 1 / 3' );
		expect( wrapper.text() ).toContain(
			'Parcours 1 : Rejoignez la case e4.'
		);

		const btnRed = wrapper.find( '.mock-move-btn-red' );
		const btnTarget1 = wrapper.find( '.mock-move-btn-target' );

		// Click red square -> Danger feedback
		await btnRed.trigger( 'click' );
		expect( wrapper.text() ).toContain( 'Case interdite !' );

		// Click target e4 -> Solved
		await btnTarget1.trigger( 'click' );
		expect( wrapper.text() ).toContain( 'Parcours réussi !' );

		// Click "Parcours suivant"
		const nextBtn1 = wrapper.find( '.action-zone ion-button' );
		await nextBtn1.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// ==========================================
		// PARCOURS 2 / 3
		// ==========================================
		expect( wrapper.text() ).toContain( 'Parcours 2 / 3' );
		expect( wrapper.text() ).toContain(
			'Parcours 2 : Mangez tout avant c6.'
		);

		const btnC6 = wrapper.find( '.mock-move-btn-c6' );
		await btnC6.trigger( 'click' );
		expect( wrapper.text() ).toContain( 'Parcours Pacman réussi !' );

		const nextBtn2 = wrapper.find( '.action-zone ion-button' );
		await nextBtn2.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// ==========================================
		// PARCOURS 3 / 3
		// ==========================================
		expect( wrapper.text() ).toContain( 'Parcours 3 / 3' );
		expect( wrapper.text() ).toContain( 'Parcours 3 : Infiltrez h8.' );

		const btnH8 = wrapper.find( '.mock-move-btn-h8' );
		await btnH8.trigger( 'click' );
		expect( wrapper.text() ).toContain( 'Infiltration réussie !' );

		const nextBtn3 = wrapper.find( '.action-zone ion-button' );
		await nextBtn3.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// Final success emitted
		expect( wrapper.emitted( 'success' ) ).toBeTruthy();
	} );

	test( 'traces variant displays empty board, handles piece palette selection, reveals piece upon success', async () => {
		const tracesConfig = {
			consigne: 'Trouvez la pièce.',
			metaTitre: 'T9 - Traces',
			metaTypeLabel: 'Parcours',
			metaChapitreNiveauLabel: 'Niveau 1',
			series: [
				{
					variante: 'traces',
					description:
						'Olalala, mais qui a bien pu laisser ces traces ? Gardes !',
					fen_depart: '8/8/7Q/8/8/8/8/8 w - - 0 1',
					couleur_joueur: 'white' as const,
					piece_attendue: 'q',
					shapes: [
						{ orig: 'd2', brush: 'blue' },
						{ orig: 'd4', brush: 'blue' },
						{ orig: 'e5', brush: 'blue' },
						{ orig: 'e6', brush: 'blue' },
						{ orig: 'h6', brush: 'blue' },
					],
				},
			],
		};

		const wrapper = mount( TypeParcours, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
			},
			props: {
				id: 902,
				config: tracesConfig,
			},
		} );

		expect( wrapper.text() ).toContain( 'Parcours 1 / 1' );
		expect( wrapper.text() ).toContain(
			'Olalala, mais qui a bien pu laisser ces traces ? Gardes !'
		);

		// Initial empty board FEN
		const fenDisplay = wrapper.find( '.mock-fen' );
		expect( fenDisplay.text() ).toBe( '8/8/8/8/8/8/8/8 w - - 0 1' );

		// 6 piece buttons present in palette
		const pieceButtons = wrapper.findAll(
			'.traces-palette-section .piece-btn'
		);
		expect( pieceButtons ).toHaveLength( 6 );

		const knightBtn = pieceButtons.find(
			( b ) => b.attributes( 'aria-label' ) === 'Cavalier'
		);
		const queenBtn = pieceButtons.find(
			( b ) => b.attributes( 'aria-label' ) === 'Dame'
		);

		// 1. Wrong piece click (Cavalier)
		await knightBtn?.trigger( 'click' );
		expect( wrapper.text() ).toContain(
			"Ce n'est pas cette pièce qui a laissé ces traces !"
		);
		// Board still empty
		expect( fenDisplay.text() ).toBe( '8/8/8/8/8/8/8/8 w - - 0 1' );

		// 2. Right piece click (Dame)
		await queenBtn?.trigger( 'click' );
		expect( wrapper.text() ).toContain(
			"C'est bien la Dame qui a laissé ces traces."
		);

		// Board reveals full FEN with the Queen
		await wrapper.vm.$nextTick();
		expect( wrapper.find( '.mock-fen' ).text() ).toBe(
			'8/8/7Q/8/8/8/8/8 w - - 0 1'
		);

		// Advance and complete
		const nextBtn = wrapper.find( '.action-zone ion-button' );
		await nextBtn.trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( wrapper.emitted( 'success' ) ).toBeTruthy();
	} );

	test( 'standard and stealth variants hide destination piece on initial display and restore on solved', async () => {
		const standardWithDestPieceConfig = {
			consigne: 'Rejoignez la case e4.',
			series: [
				{
					variante: 'standard',
					description:
						'Parcours avec cible occupée dans FEN initiale.',
					// e4 has Queen (Q) in initial FEN
					fen_depart: '8/8/8/8/4Q3/2N5/8/8 w - - 0 1',
					couleur_joueur: 'white' as const,
					case_depart: 'c3',
					case_arrivee: 'e4',
					shapes: [
						{ orig: 'c3', dest: 'e4', brush: 'blue' }, // arrow
						{ orig: 'e4', brush: 'green' }, // target circle
					],
				},
			],
		};

		const wrapper = mount( TypeParcours, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
			},
			props: {
				id: 903,
				config: standardWithDestPieceConfig,
			},
		} );

		// Initial FEN should have piece on e4 removed -> '8/8/8/8/8/2N5/8/8 w - - 0 1'
		const fenDisplay = wrapper.find( '.mock-fen' );
		expect( fenDisplay.text() ).toBe( '8/8/8/8/8/2N5/8/8 w - - 0 1' );

		// Complete the move to target e4
		const btnTarget = wrapper.find( '.mock-move-btn-target' );
		await btnTarget.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// Solved: restored initial FEN with the Queen on e4
		expect( wrapper.find( '.mock-fen' ).text() ).toBe(
			'8/8/8/8/4Q3/2N5/8/8 w - - 0 1'
		);
	} );
} );
