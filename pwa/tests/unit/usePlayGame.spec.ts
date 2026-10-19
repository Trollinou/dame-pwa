import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePlayGame } from '@/composables/learning/play/usePlayGame';
import { useChessStore } from '@/stores/chess';
import type { BoardCore } from 'eg-chessboard';

const mockPush = vi.fn();

// Mock vue-router
vi.mock( 'vue-router', async ( importOriginal ) => {
	const actual = await importOriginal< typeof import('vue-router') >();
	return {
		...actual,
		useRouter: () => ( {
			push: mockPush,
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

const createMockBoardApi = (
	overrides: Partial< BoardCore > = {}
): BoardCore & {
	_setTurn: ( _turn: 'white' | 'black', _ply: number ) => void;
} => {
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
		getGameOverReason: vi.fn( () => 'Partie terminée' ),
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

describe( 'usePlayGame - Hint Switch & Help Counter', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

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

describe( 'usePlayGame - Game Over & Resignation (30-ply rule)', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'saves completed game immediately on checkmate even if ply < 30', () => {
		const chessStore = useChessStore();
		const spySave = vi
			.spyOn( chessStore, 'saveCompletedGame' )
			.mockResolvedValue();

		const { setBoardApi, handleGameOver, boardConfig } = usePlayGame();
		const mockApi = createMockBoardApi( {
			getPgn: vi.fn( () => '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#' ),
		} );
		mockApi._setTurn( 'black', 7 ); // ply 7 < 30
		setBoardApi( mockApi );

		handleGameOver( 'checkmate', 45 );

		expect( boardConfig.viewOnly ).toBe( true );
		expect( spySave ).toHaveBeenCalledWith(
			45,
			'1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#'
		);
	} );

	it( 'saves completed game immediately on draw/stalemate even if ply < 30', () => {
		const chessStore = useChessStore();
		const spySave = vi
			.spyOn( chessStore, 'saveCompletedGame' )
			.mockResolvedValue();

		const { setBoardApi, handleGameOver } = usePlayGame();
		const mockApi = createMockBoardApi( {
			getPgn: vi.fn( () => '1. e4 e5 2. Nf3' ),
		} );
		mockApi._setTurn( 'white', 3 );
		setBoardApi( mockApi );

		handleGameOver( 'draw' );

		expect( spySave ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'ignores resignation save if ply < 30', () => {
		const chessStore = useChessStore();
		const spySave = vi
			.spyOn( chessStore, 'saveCompletedGame' )
			.mockResolvedValue();

		const { setBoardApi, handleGameOver, boardConfig } = usePlayGame();
		const mockApi = createMockBoardApi( {
			getPgn: vi.fn( () => '1. e4 e5 2. Nf3 Nc6' ),
		} );
		mockApi._setTurn( 'black', 4 ); // 4 ply < 30
		setBoardApi( mockApi );

		handleGameOver( 'resigned' );

		expect( boardConfig.viewOnly ).toBe( true );
		expect( spySave ).not.toHaveBeenCalled();
	} );

	it( 'saves resignation game if ply >= 30 (at least 15 moves)', () => {
		const chessStore = useChessStore();
		const spySave = vi
			.spyOn( chessStore, 'saveCompletedGame' )
			.mockResolvedValue();

		const { setBoardApi, handleGameOver, boardConfig } = usePlayGame();
		const longPgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...';
		const mockApi = createMockBoardApi( {
			getPgn: vi.fn( () => longPgn ),
		} );
		mockApi._setTurn( 'white', 30 ); // Exactly 30 ply
		setBoardApi( mockApi );

		handleGameOver( 'resigned' );

		expect( boardConfig.viewOnly ).toBe( true );
		expect( spySave ).toHaveBeenCalledWith( expect.any( Number ), longPgn );
	} );

	it( 'resignGame delegates to handleGameOver and locks the board', () => {
		const chessStore = useChessStore();
		const spySave = vi
			.spyOn( chessStore, 'saveCompletedGame' )
			.mockResolvedValue();

		const { setBoardApi, resignGame, boardConfig, gameStatus } =
			usePlayGame();
		const mockApi = createMockBoardApi( {
			getPgn: vi.fn( () => '1. e4 e5 ...' ),
		} );
		mockApi._setTurn( 'white', 32 );
		setBoardApi( mockApi );

		resignGame();

		expect( boardConfig.viewOnly ).toBe( true );
		expect( gameStatus.message ).toContain( 'abandon' );
		expect( spySave ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'goToAnalysis triggers resignation save when 1player game reaches >= 30 ply', () => {
		const chessStore = useChessStore();
		const spySave = vi
			.spyOn( chessStore, 'saveCompletedGame' )
			.mockResolvedValue();

		const { setBoardApi, goToAnalysis } = usePlayGame();
		const mockApi = createMockBoardApi( {
			getPgn: vi.fn( () => '1. e4 e5 ...' ),
		} );
		mockApi._setTurn( 'black', 35 ); // >= 30 ply
		setBoardApi( mockApi );

		goToAnalysis();

		expect( spySave ).toHaveBeenCalledTimes( 1 );
		expect( mockPush ).toHaveBeenCalledWith( '/analysis' );
	} );

	it( 'goToAnalysis does NOT trigger resignation save when ply < 30', () => {
		const chessStore = useChessStore();
		const spySave = vi
			.spyOn( chessStore, 'saveCompletedGame' )
			.mockResolvedValue();

		const { setBoardApi, goToAnalysis } = usePlayGame();
		const mockApi = createMockBoardApi( {
			getPgn: vi.fn( () => '1. e4 e5' ),
		} );
		mockApi._setTurn( 'black', 2 ); // 2 ply < 30
		setBoardApi( mockApi );

		goToAnalysis();

		expect( spySave ).not.toHaveBeenCalled();
		expect( mockPush ).toHaveBeenCalledWith( '/analysis' );
	} );
} );
