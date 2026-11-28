import { describe, expect, test, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeParcours from '@/views/learning/types/TypeParcours.vue';
import { EXERCISE_HEADER_KEY, type ExerciseHeaderState } from '@/composables/learning/useExerciseHeader';
import {
	getParcoursVariant,
	registerParcoursVariant,
	extractPieceTypeFromFen,
	extractDeveloppementTargetSquare,
	getPieceRoleLabel,
	removePieceFromSquareInFen,
	type ParcoursBoardApi,
} from '@/utils/parsers/parcoursVariants';
import {
	LoopTracker,
	extractOpponentPieceSquare,
	squareToCoords,
} from '@/utils/parsers/LoopTracker';
import type { Key } from 'eg-chessboard';

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
        <span class="mock-shapes">{{ diagram && diagram.shapes ? JSON.stringify(diagram.shapes) : '[]' }}</span>
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

	test( 'stealth variant prevents stepping onto attacked squares but allows red circles', () => {
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
		expect( attackedResult.errorMessage ).toBe( 'Tu as été repéré !' );

		// Les cercles rouges ne sont pas des cases piégées en variante stealth
		const redCircleAllowed = stealth.validateMove( {
			from: 'c3',
			to: 'd5',
			fenDepart: '8/8/8/8/8/2N5/8/8 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'c3',
			caseArrivee: 'e4',
			shapes: [ { orig: 'd5', brush: 'red' } ],
			boardApi: mockBoardAttacked,
		} );
		expect( redCircleAllowed.valid ).toBe( true );
		expect( redCircleAllowed.isFinished ).toBe( false );
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

	test( 'LoopTracker - calculates 360 deg winding and quadrants for complete tour', () => {
		const target = 'd5';
		const start = 'c3';
		const tracker = new LoopTracker( target, start );

		// Move 1: c3 -> a4
		let res = tracker.onMove( 'a4' );
		expect( res.isFinished ).toBe( false );

		// Move 2: a4 -> b6
		res = tracker.onMove( 'b6' );
		expect( res.isFinished ).toBe( false );

		// Move 3: b6 -> c8
		res = tracker.onMove( 'c8' );
		expect( res.isFinished ).toBe( false );

		// Move 4: c8 -> e7
		res = tracker.onMove( 'e7' );
		expect( res.isFinished ).toBe( false );

		// Move 5: e7 -> g6
		res = tracker.onMove( 'g6' );
		expect( res.isFinished ).toBe( false );

		// Move 6: g6 -> f4
		res = tracker.onMove( 'f4' );
		expect( res.isFinished ).toBe( false );

		// Move 7: f4 -> e2
		res = tracker.onMove( 'e2' );
		expect( res.isFinished ).toBe( false );

		// Move 8: e2 -> c3 (Returned to start, 360 degrees completed!)
		res = tracker.onMove( 'c3' );
		expect( res.isFinished ).toBe( true );
		expect( Math.abs( res.totalAngleDeg ) ).toBeCloseTo( 360, -1 );
		expect( res.progressPercent ).toBe( 100 );
	} );

	test( 'LoopTracker - rejects fraudulent back-and-forth moves', () => {
		const target = 'd5';
		const start = 'c3';
		const tracker = new LoopTracker( target, start );

		// Back and forth: c3 -> a4 -> c3 -> a4 -> c3
		tracker.onMove( 'a4' );
		const res1 = tracker.onMove( 'c3' );
		expect( res1.isFinished ).toBe( false );
		expect( res1.totalAngleDeg ).toBeCloseTo( 0, 1 );

		tracker.onMove( 'a4' );
		const res2 = tracker.onMove( 'c3' );
		expect( res2.isFinished ).toBe( false );
	} );

	test( 'extractOpponentPieceSquare locates black queen on d5 from white perspective', () => {
		const fen = '8/8/8/3q4/8/2N5/8/8 w - - 0 1';
		expect( extractOpponentPieceSquare( fen, 'white' ) ).toBe( 'd5' );
		expect( squareToCoords( 'd5' ) ).toEqual( { x: 4, y: 5 } );
		expect( squareToCoords( 'c3' ) ).toEqual( { x: 3, y: 3 } );
	} );

	test( 'stealth variant in loop mode validates full 8-move loop tour around queen', () => {
		const stealth = getParcoursVariant( 'stealth' );
		const fen = '8/8/8/3q4/8/2N5/8/8 w - - 0 1';
		const tracker = new LoopTracker( 'd5', 'c3' );
		const mockBoardSafe: ParcoursBoardApi = {
			getPieces: () => [],
			isSquareAttacked: () => false,
		};

		const moves = [ 'a4', 'b6', 'c8', 'e7', 'g6', 'f4', 'e2', 'c3' ];
		let currentPos = 'c3';

		for ( let i = 0; i < moves.length; i++ ) {
			const nextPos = moves[ i ];
			const result = stealth.validateMove( {
				from: currentPos as Key,
				to: nextPos as Key,
				fenDepart: fen,
				couleurJoueur: 'white',
				caseDepart: 'c3',
				caseArrivee: 'c3',
				shapes: [],
				boardApi: mockBoardSafe,
				isLoop: true,
				loopTracker: tracker,
			} );

			expect( result.valid ).toBe( true );
			if ( i === moves.length - 1 ) {
				expect( result.isFinished ).toBe( true );
				expect( result.successMessage ).toContain(
					'Tour complet réussi'
				);
			} else {
				expect( result.isFinished ).toBe( false );
			}
			currentPos = nextPos;
		}
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
		const headerState = ref<ExerciseHeaderState>( {} );
		const wrapper = mount( TypeParcours, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
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
			props: {
				id: 901,
				config: sample3SeriesConfig,
			},
		} );

		// ==========================================
		// PARCOURS 1 / 3
		// ==========================================
		expect( headerState.value.stepBadgeText ).toBe( 'Parcours 1 / 3' );
		expect( headerState.value.consigne ).toBe(
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
		expect( headerState.value.stepBadgeText ).toBe( 'Parcours 2 / 3' );
		expect( headerState.value.consigne ).toBe(
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
		expect( headerState.value.stepBadgeText ).toBe( 'Parcours 3 / 3' );
		expect( headerState.value.consigne ).toBe( 'Parcours 3 : Infiltrez h8.' );

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

		const headerState = ref<ExerciseHeaderState>( {} );
		const wrapper = mount( TypeParcours, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
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
			props: {
				id: 902,
				config: tracesConfig,
			},
		} );

		expect( headerState.value.stepBadgeText ).toBe( 'Parcours 1 / 1' );
		expect( headerState.value.consigne ).toBe(
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

	test( 'developpement variant extracts target from both formats and enforces stealth rules', () => {
		const dev = getParcoursVariant( 'developpement' );
		expect( dev.id ).toBe( 'developpement' );

		// 1. Format alternatif : cercle bleu seul (Bc6) + flèches
		const altShapes = [
			{ orig: 'c6' as Key, brush: 'blue' },
			{ orig: 'e1' as Key, dest: 'd3' as Key, brush: 'blue' },
			{ orig: 'd3' as Key, dest: 'b4' as Key, brush: 'blue' },
			{ orig: 'b4' as Key, dest: 'c6' as Key, brush: 'blue' },
		];
		expect( extractDeveloppementTargetSquare( altShapes ) ).toBe( 'c6' );

		// 2. Format standard : cercle bleu départ (Be1) + cercle vert arrivée (Gc6)
		const stdShapes = [
			{ orig: 'e1' as Key, brush: 'blue' },
			{ orig: 'c6' as Key, brush: 'green' },
		];
		expect( extractDeveloppementTargetSquare( stdShapes, 'e1' ) ).toBe(
			'c6'
		);

		const mockBoardAttacked: ParcoursBoardApi = {
			getPieces: () => [],
			isSquareAttacked: ( sq: string, col: string ) =>
				sq === 'c5' && col === 'black',
		};

		// Case attaquée rejetée
		const attackedRes = dev.validateMove( {
			from: 'd3',
			to: 'c5',
			fenDepart:
				'8/p3pp1p/1p1p2p1/3P4/4P3/1P5P/P4PP1/4N3 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'e1',
			caseArrivee: '',
			shapes: altShapes,
			boardApi: mockBoardAttacked,
		} );
		expect( attackedRes.valid ).toBe( false );
		expect( attackedRes.errorMessage ).toBe( 'Tu as été repéré !' );

		// Case rouge autorisée en développement (non considérée comme case piégée)
		const redRes = dev.validateMove( {
			from: 'e1',
			to: 'd5',
			fenDepart:
				'8/p3pp1p/1p1p2p1/3P4/4P3/1P5P/P4PP1/4N3 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'e1',
			caseArrivee: '',
			shapes: [ ...altShapes, { orig: 'd5', brush: 'red' } ],
			boardApi: mockBoardAttacked,
		} );
		expect( redRes.valid ).toBe( true );
		expect( redRes.isFinished ).toBe( false );

		// Coup intermédiaire sûr accepté
		const safeStepRes = dev.validateMove( {
			from: 'e1',
			to: 'd3',
			fenDepart:
				'8/p3pp1p/1p1p2p1/3P4/4P3/1P5P/P4PP1/4N3 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'e1',
			caseArrivee: '',
			shapes: altShapes,
			boardApi: mockBoardAttacked,
		} );
		expect( safeStepRes.valid ).toBe( true );
		expect( safeStepRes.isFinished ).toBe( false );

		// Arrivée sur c6 validée
		const finishRes = dev.validateMove( {
			from: 'b4',
			to: 'c6',
			fenDepart:
				'8/p3pp1p/1p1p2p1/3P4/4P3/1P5P/P4PP1/4N3 w - - 0 1',
			couleurJoueur: 'white',
			caseDepart: 'e1',
			caseArrivee: '',
			shapes: altShapes,
			boardApi: mockBoardAttacked,
		} );
		expect( finishRes.valid ).toBe( true );
		expect( finishRes.isFinished ).toBe( true );
	} );

	test( 'TypeParcours renders developpement variant hiding target/arrows initially and revealing on solve', async () => {
		const devConfig = {
			consigne: 'Trouvez la case de développement.',
			series: [
				{
					variante: 'developpement',
					description:
						"Ton Cavalier n'est pas bien placé... Quelle est la case à atteindre ? Comment ?",
					fen_depart:
						'8/p3pp1p/1p1p2p1/3P4/4P3/1P5P/P4PP1/4N3 w - - 0 1',
					couleur_joueur: 'white' as const,
					shapes: [
						{ orig: 'c6', brush: 'blue' },
						{ orig: 'd5', brush: 'red' },
						{ orig: 'e1', dest: 'd3', brush: 'blue' },
						{ orig: 'd3', dest: 'b4', brush: 'blue' },
						{ orig: 'b4', dest: 'c6', brush: 'blue' },
					],
				},
			],
		};

		const headerState = ref<ExerciseHeaderState>( {} );
		const wrapper = mount( TypeParcours, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
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
			props: {
				id: 904,
				config: devConfig,
			},
		} );

		expect( headerState.value.consigne ).toBe(
			"Ton Cavalier n'est pas bien placé... Quelle est la case à atteindre ? Comment ?"
		);

		// Avant résolution : ni cercle bleu c6, ni cercle rouge d5, ni flèches bleues ne doivent être affichés
		const initialShapes = JSON.parse(
			wrapper.find( '.mock-shapes' ).text()
		);
		expect( initialShapes ).toEqual( [] );

		// Déplacement sur la case cible c6
		await wrapper.find( '.mock-move-btn-c6' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( wrapper.text() ).toContain(
			'Bravo ! Tu as trouvé la bonne case de développement.'
		);

		// Après résolution : le cercle bleu c6, le cercle rouge d5 et toutes les flèches sont révélés
		const solvedShapes = JSON.parse(
			wrapper.find( '.mock-shapes' ).text()
		);
		expect( solvedShapes ).toHaveLength( 5 );
	} );

	test( 'TypeParcours renders stealth variant hiding red circles and arrows initially and revealing on solve', async () => {
		const stealthConfig = {
			consigne: 'Infiltrez h8.',
			series: [
				{
					variante: 'stealth',
					description: 'Infiltrez h8 sans vous faire repérer.',
					fen_depart: '8/5N2/8/8/8/8/8/8 w - - 0 1',
					couleur_joueur: 'white' as const,
					case_depart: 'f7',
					case_arrivee: 'h8',
					shapes: [
						{ orig: 'd5', brush: 'red' },
						{ orig: 'f7', dest: 'h8', brush: 'blue' },
					],
				},
			],
		};

		const wrapper = mount( TypeParcours, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
			},
			props: {
				id: 905,
				config: stealthConfig,
			},
		} );

		// Avant résolution : ni cercle rouge ni flèche, uniquement départ (bleu) et arrivée (vert)
		const initialShapes = JSON.parse(
			wrapper.find( '.mock-shapes' ).text()
		);
		expect( initialShapes ).toEqual( [
			{ orig: 'f7', brush: 'blue' },
			{ orig: 'h8', brush: 'green' },
		] );

		// Déplacement sur la case cible h8
		await wrapper.find( '.mock-move-btn-h8' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( wrapper.text() ).toContain( 'Infiltration réussie !' );

		// Après résolution : le cercle rouge et la flèche sont révélés avec les repères
		const solvedShapes = JSON.parse(
			wrapper.find( '.mock-shapes' ).text()
		);
		expect( solvedShapes ).toHaveLength( 4 );
		expect( solvedShapes ).toEqual(
			expect.arrayContaining( [
				{ orig: 'd5', brush: 'red' },
				{ orig: 'f7', dest: 'h8', brush: 'blue' },
			] )
		);
	} );
} );
