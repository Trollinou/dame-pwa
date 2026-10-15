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

	it( 'provides worker URLs even when modes are disabled for on-the-fly hints', () => {
		setActivePinia( createPinia() );

		const wrapper = mount( Chessboard, {
			props: {
				stockfishConfig: {
					whiteMode: 'disabled',
					blackMode: 'disabled',
					showWdl: true,
				},
			},
		} );

		const inner = wrapper.findComponent( { name: 'TheChessboard' } );
		const sfConfig = inner.props( 'stockfishConfig' );
		expect( sfConfig.workerUrl ).toContain( 'stockfish.js' );
		expect( sfConfig.wasmUrl ).toContain( 'stockfish.wasm' );
		expect( sfConfig.whiteMode ).toBe( 'disabled' );
		expect( sfConfig.blackMode ).toBe( 'disabled' );
		expect( sfConfig.showWdl ).toBe( true );
	} );

	it( 'emits board-created and provides BoardCore API for Stockfish 19 methods', async () => {
		setActivePinia( createPinia() );

		const mockApi = {
			setPosition: vi.fn(),
			requestHint: vi.fn(),
			startLiveAnalysis: vi.fn(),
			stopLiveAnalysis: vi.fn(),
			reviewGame: vi
				.fn()
				.mockResolvedValue( { accuracy: { white: 85, black: 78 } } ),
			cancelReview: vi.fn(),
			newGame: vi.fn(),
			viewHistory: vi.fn(),
			viewStart: vi.fn(),
			viewNext: vi.fn(),
			viewPrevious: vi.fn(),
			destroy: vi.fn(),
		};

		const wrapper = mount( Chessboard, {
			props: {
				stockfishEnabled: true,
			},
		} );

		const inner = wrapper.findComponent( { name: 'TheChessboard' } );
		await inner.vm.$emit( 'board-created', mockApi );

		expect( wrapper.emitted( 'board-created' ) ).toBeTruthy();
		expect( wrapper.emitted( 'board-created' )?.[ 0 ][ 0 ] ).toBe(
			mockApi
		);

		// Test requestHint options
		mockApi.requestHint( { multiPv: 2, movetime: 1500 } );
		expect( mockApi.requestHint ).toHaveBeenCalledWith( {
			multiPv: 2,
			movetime: 1500,
		} );

		// Test reviewGame with AbortSignal and cancelReview
		const controller = new AbortController();
		mockApi.reviewGame( { depth: 12, signal: controller.signal } );
		expect( mockApi.reviewGame ).toHaveBeenCalledWith( {
			depth: 12,
			signal: controller.signal,
		} );

		mockApi.cancelReview();
		expect( mockApi.cancelReview ).toHaveBeenCalled();

		// Test newGame
		mockApi.newGame();
		expect( mockApi.newGame ).toHaveBeenCalled();
	} );
} );
