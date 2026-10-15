import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePlayGame } from '@/composables/learning/play/usePlayGame';
import type { BoardCore } from 'eg-chessboard';

// Mock vue-router
vi.mock( 'vue-router', async ( importOriginal ) => {
	const actual = await importOriginal< typeof import('vue-router') >();
	return {
		...actual,
		useRouter: () => ( {
			push: vi.fn(),
		} ),
	};
} );

// Mock @tanstack/vue-query
vi.mock( '@tanstack/vue-query', async ( importOriginal ) => {
	const actual =
		await importOriginal< typeof import('@tanstack/vue-query') >();
	return {
		...actual,
		useQueryClient: () => ( {
			invalidateQueries: vi.fn(),
			clear: vi.fn(),
		} ),
	};
} );

describe( 'usePlayGame - Hint Switch & Help Counter', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	const createMockBoardApi = (
		overrides: Partial< BoardCore > = {}
	): BoardCore => {
		let currentTurn: 'white' | 'black' = 'white';
		let currentPly = 0;

		return {
			getTurnColor: vi.fn( () => currentTurn ),
			getCurrentPlyNumber: vi.fn( () => currentPly ),
			requestHint: vi.fn(),
			drawMove: vi.fn(),
			hideMoves: vi.fn(),
			getShapes: vi.fn( () => [] ),
			setShapes: vi.fn(),
			newGame: vi.fn(),
			loadPgn: vi.fn(),
			getPgn: vi.fn( () => '' ),
			getIsCheck: vi.fn( () => false ),
			getInCheckColor: vi.fn( () => null ),
			undoLastMove: vi.fn(),
			// Helper to advance turn in tests
			_setTurn: ( turn: 'white' | 'black', ply: number ) => {
				currentTurn = turn;
				currentPly = ply;
			},
			...overrides,
		} as unknown as BoardCore & {
			_setTurn: ( _turn: 'white' | 'black', _ply: number ) => void;
		};
	};

	it( 'acts as an On/Off switch: requests hint and increments helpCount when turned ON on player turn', () => {
		const {
			setBoardApi,
			toggleHint,
			isHintEnabled,
			helpCount,
			handleStockfishHint,
			lastSuggestedMove,
		} = usePlayGame();

		const mockApi = createMockBoardApi();
		setBoardApi( mockApi );

		expect( isHintEnabled.value ).toBe( false );
		expect( helpCount.value ).toBe( 0 );

		// 1. Turn ON the hint switch
		toggleHint();
		expect( isHintEnabled.value ).toBe( true );
		expect( helpCount.value ).toBe( 1 );
		expect( mockApi.requestHint ).toHaveBeenCalledWith( {
			multiPv: 2,
			movetime: 1500,
		} );

		// Simulate hint arrival
		handleStockfishHint( 'e2e4' );
		expect( lastSuggestedMove.value ).toBe( 'e2e4' );
		expect( mockApi.drawMove ).toHaveBeenCalledWith( 'e2', 'e4', 'green' );

		// 2. Toggling OFF and ON again on the SAME turn (same ply) does not increment helpCount again
		toggleHint();
		expect( isHintEnabled.value ).toBe( false );
		expect( mockApi.hideMoves ).toHaveBeenCalled();

		toggleHint();
		expect( isHintEnabled.value ).toBe( true );
		expect( helpCount.value ).toBe( 1 ); // Still 1 !
	} );

	it( 'does not request hints or count helps when it is the computer turn (Black)', () => {
		const {
			setBoardApi,
			requestHintForPlayer,
			helpCount,
			boardConfig,
			toggleHint,
			handleStockfishHint,
		} = usePlayGame();

		const mockApi = createMockBoardApi();
		setBoardApi( mockApi );

		// User is White
		boardConfig.playerColor = 'white';

		// Turn ON hint
		toggleHint();
		expect( helpCount.value ).toBe( 1 );

		// Now simulate turn passing to Black (the bot) at ply 1
		(
			mockApi as unknown as {
				_setTurn: ( _turn: 'white' | 'black', _ply: number ) => void;
			}
		 )._setTurn( 'black', 1 );

		vi.clearAllMocks();

		// Calling requestHintForPlayer while it is the bot turn should DO NOTHING
		requestHintForPlayer();
		expect( mockApi.requestHint ).not.toHaveBeenCalled();
		expect( helpCount.value ).toBe( 1 ); // Not incremented for the bot !

		// Even if a stockfish-hint arrives during the bot turn, it is ignored
		handleStockfishHint( 'e7e5' );
		expect( mockApi.drawMove ).not.toHaveBeenCalled();
	} );

	it( 'automatically requests hint and increments helpCount when human turn arrives with switch ON', () => {
		const {
			setBoardApi,
			requestHintForPlayer,
			isHintEnabled,
			helpCount,
			boardConfig,
			toggleHint,
		} = usePlayGame();

		const mockApi = createMockBoardApi();
		setBoardApi( mockApi );

		boardConfig.playerColor = 'white';

		// Turn ON hint on ply 0 (White)
		toggleHint();
		expect( helpCount.value ).toBe( 1 );

		// Bot plays (ply 1, black). Hint is active but it is bot turn -> no request.
		(
			mockApi as unknown as {
				_setTurn: ( _turn: 'white' | 'black', _ply: number ) => void;
			}
		 )._setTurn( 'black', 1 );
		requestHintForPlayer();
		expect( helpCount.value ).toBe( 1 );

		// Bot finishes move -> now ply 2, White turn (human) !
		(
			mockApi as unknown as {
				_setTurn: ( _turn: 'white' | 'black', _ply: number ) => void;
			}
		 )._setTurn( 'white', 2 );
		vi.clearAllMocks();

		// Since hint switch is ON, requesting hint for the new human ply
		expect( isHintEnabled.value ).toBe( true );
		requestHintForPlayer();

		expect( mockApi.requestHint ).toHaveBeenCalledWith( {
			multiPv: 2,
			movetime: 1500,
		} );
		expect( helpCount.value ).toBe( 2 ); // Counted for human move 2 !
	} );
} );
