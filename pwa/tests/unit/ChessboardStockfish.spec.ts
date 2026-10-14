import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Chessboard from '@/components/shared/Chessboard/Chessboard.vue';

// Mock eg-chessboard/vue
vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'TheChessboard',
		props: [
			'diagram',
			'boardConfig',
			'playerColor',
			'mode',
			'stockfishConfig',
			'pieceSet',
			'boardTheme',
			'fitContainer',
		],
		emits: [
			'evaluation',
			'engine-status',
			'game-review-progress',
			'stockfish-hint',
		],
		template: '<div class="the-chessboard-mock" />',
	},
} ) );

describe( 'Chessboard - Stockfish 19 Events & Config', () => {
	it( 'forwards evaluation, engine-status, and game-review-progress events', async () => {
		setActivePinia( createPinia() );

		const wrapper = mount( Chessboard, {
			props: {
				stockfishEnabled: true,
			},
		} );

		const innerChessboard = wrapper.findComponent( {
			name: 'TheChessboard',
		} );
		expect( innerChessboard.exists() ).toBe( true );

		// Simulate evaluation event from eg-chessboard
		const mockEval = {
			ply: 1,
			fen: '',
			depth: 10,
			scoreType: 'cp' as const,
			scoreValue: 40,
			whiteScoreValue: 40,
			winChancePercentage: 55,
			pv: [ 'e2e4' ],
			multipvIndex: 1,
		};
		await innerChessboard.vm.$emit( 'evaluation', mockEval );
		expect( wrapper.emitted( 'evaluation' ) ).toBeTruthy();
		expect( wrapper.emitted( 'evaluation' )?.[ 0 ][ 0 ] ).toEqual(
			mockEval
		);

		// Simulate engine-status event
		await innerChessboard.vm.$emit( 'engine-status', 'searching' );
		expect( wrapper.emitted( 'engine-status' ) ).toBeTruthy();
		expect( wrapper.emitted( 'engine-status' )?.[ 0 ][ 0 ] ).toBe(
			'searching'
		);

		// Simulate game-review-progress event
		await innerChessboard.vm.$emit( 'game-review-progress', 75 );
		expect( wrapper.emitted( 'game-review-progress' ) ).toBeTruthy();
		expect( wrapper.emitted( 'game-review-progress' )?.[ 0 ][ 0 ] ).toBe(
			75
		);

		// Simulate stockfish-hint event
		await innerChessboard.vm.$emit( 'stockfish-hint', 'e2e4' );
		expect( wrapper.emitted( 'stockfish-hint' ) ).toBeTruthy();
		expect( wrapper.emitted( 'stockfish-hint' )?.[ 0 ][ 0 ] ).toBe(
			'e2e4'
		);
	} );

	it( 'injects default workerUrl and wasmUrl when stockfish is enabled', () => {
		setActivePinia( createPinia() );

		const wrapper = mount( Chessboard, {
			props: {
				stockfishEnabled: true,
			},
		} );

		const inner = wrapper.findComponent( { name: 'TheChessboard' } );
		const sfConfig = inner.props( 'stockfishConfig' );
		expect( sfConfig.workerUrl ).toContain( 'stockfish.js' );
		expect( sfConfig.wasmUrl ).toContain( 'stockfish.wasm' );
		expect( sfConfig.whiteMode ).toBe( 'elo' );
		expect( sfConfig.blackMode ).toBe( 'elo' );
	} );
} );
