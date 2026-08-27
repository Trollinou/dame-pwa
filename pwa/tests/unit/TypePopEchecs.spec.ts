import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypePopEchecs from '@/views/types/TypePopEchecs.vue';
import {
	findBlueCircledSquare,
	findPieceOnSquare,
	removePieceFromFen,
	getActiveColorFromFen,
} from '@/utils/fenUtils';

// Mock eg-chessboard
vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'EgChessboard',
		props: [
			'diagram',
			'playerColor',
			'preserveShapesOnPositionChange',
			'stockfishConfig',
		],
		emits: [ 'square-click', 'board-created' ],
		template: `
      <div class="mock-eg-chessboard">
        <span class="mock-fen">{{ diagram ? diagram.fen : '' }}</span>
        <button
          class="mock-square-btn"
          v-for="sq in ['e4', 'f3', 'c6', 'd5', 'a1', 'h8']"
          :key="sq"
          @click="$emit('square-click', sq)"
        >
          Click {{ sq }}
        </button>
      </div>
    `,
	},
} ) );

describe( 'fenUtils - PopEchecs helpers', () => {
	test( 'findBlueCircledSquare finds square with blue circle', () => {
		const shapes = [
			{ orig: 'e4', dest: 'e4', brush: 'blue' },
			{ orig: 'd2', dest: 'd4', brush: 'green' },
		];
		expect( findBlueCircledSquare( shapes ) ).toBe( 'e4' );
	} );

	test( 'findPieceOnSquare extracts piece type and color correctly', () => {
		const fen =
			'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2';
		const pieceF3 = findPieceOnSquare( fen, 'f3' );
		expect( pieceF3 ).toEqual( { type: 'n', color: 'w' } );

		const pieceE5 = findPieceOnSquare( fen, 'e5' );
		expect( pieceE5 ).toEqual( { type: 'p', color: 'b' } );

		const pieceEmpty = findPieceOnSquare( fen, 'e6' );
		expect( pieceEmpty ).toBeNull();
	} );

	test( 'removePieceFromFen removes the piece on the given square and collapses empty squares', () => {
		const fen =
			'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2';
		const fenWithoutF3 = removePieceFromFen( fen, 'f3' );
		expect( fenWithoutF3 ).toContain( '8/PPPP1PPP/RNBQKB1R' );
	} );

	test( 'getActiveColorFromFen detects black orientation when black has turn', () => {
		const fenBlack =
			'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
		expect( getActiveColorFromFen( fenBlack ) ).toBe( 'black' );
	} );
} );

describe( 'TypePopEchecs.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.useFakeTimers();
	} );

	test( 'renders 4 diagrams series with dynamic consigne and advances on correct placement', async () => {
		const wrapper = mount( TypePopEchecs, {
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
			},
			props: {
				id: 201,
				config: {
					consigne: 'Consigne globale',
					diagrammes: [
						{
							consigne: 'Placez le Cavalier blanc sur f3.',
							fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 2',
							shapes: [
								{ orig: 'f3', dest: 'f3', brush: 'blue' },
							],
						},
						{
							consigne: 'Placez le Pion noir sur e4.',
							fen: 'rnbqkbnr/pppp1ppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR b KQkq - 0 2',
							shapes: [
								{ orig: 'e4', dest: 'e4', brush: 'blue' },
							],
						},
						{
							consigne: 'Placez le Cavalier noir sur c6.',
							fen: 'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 1 2',
							shapes: [
								{ orig: 'c6', dest: 'c6', brush: 'blue' },
							],
						},
						{
							consigne: 'Placez le Pion blanc sur d5.',
							fen: 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3',
							shapes: [
								{ orig: 'd5', dest: 'd5', brush: 'blue' },
							],
						},
					],
				},
			},
		} );

		// Carte 1
		expect( wrapper.text() ).toContain( 'Carte 1 / 4' );
		expect( wrapper.text() ).toContain(
			'Placez le Cavalier blanc sur f3.'
		);

		const buttons = wrapper.findAll( '.mock-square-btn' );
		const btnF3 = buttons.find( ( b ) => b.text().includes( 'f3' ) );
		const btnE4 = buttons.find( ( b ) => b.text().includes( 'e4' ) );

		// Wrong click first
		await btnE4?.trigger( 'click' );
		expect( wrapper.text() ).toContain( "Ce n'est pas la bonne case" );

		// Right click on f3
		await btnF3?.trigger( 'click' );
		expect( wrapper.text() ).toContain( 'Parfait !' );

		// Click "Carte suivante"
		const nextBtn1 = wrapper.find( '.action-zone ion-button' );
		await nextBtn1.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// Carte 2
		expect( wrapper.text() ).toContain( 'Carte 2 / 4' );
		expect( wrapper.text() ).toContain( 'Placez le Pion noir sur e4.' );

		await btnE4?.trigger( 'click' );
		expect( wrapper.text() ).toContain( 'Parfait !' );

		const nextBtn2 = wrapper.find( '.action-zone ion-button' );
		await nextBtn2.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// Carte 3
		expect( wrapper.text() ).toContain( 'Carte 3 / 4' );
		const btnC6 = buttons.find( ( b ) => b.text().includes( 'c6' ) );
		await btnC6?.trigger( 'click' );

		const nextBtn3 = wrapper.find( '.action-zone ion-button' );
		await nextBtn3.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// Carte 4
		expect( wrapper.text() ).toContain( 'Carte 4 / 4' );
		const btnD5 = buttons.find( ( b ) => b.text().includes( 'd5' ) );
		await btnD5?.trigger( 'click' );

		const nextBtn4 = wrapper.find( '.action-zone ion-button' );
		await nextBtn4.trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( wrapper.emitted( 'success' ) ).toBeTruthy();
	} );
} );
