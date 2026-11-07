import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlayGame } from '@/composables/learning/play/usePlayGame';
import type { BoardCore, Key, Move } from '@/components/shared/Chessboard/types';

vi.mock( 'vue-router', () => ( {
	useRouter: () => ( {
		push: vi.fn(),
	} ),
} ) );

vi.mock( '@/stores/chess', () => ( {
	useChessStore: () => ( {
		currentPgn: '',
		orientation: 'white',
		engineElo: 1320,
		helpCount: 0,
		oupsCount: 0,
		saveGame: vi.fn(),
		saveCompletedGame: vi.fn(),
	} ),
} ) );

function createMockBoardApi( initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' ) {
	let currentFen = initialFen;
	const glyphsMap = new Map<Key, string>();
	const history: Move[] = [];
	let turn: 'white' | 'black' = 'black'; // After human moves, turn changes to black

	const api = {
		getCurrentPlyNumber: vi.fn( () => history.length ),
		getTurnColor: vi.fn( () => turn ),
		getFen: vi.fn( () => currentFen ),
		getPgn: vi.fn( () => '1. e4' ),
		getHistory: vi.fn( ( verbose?: boolean ) => verbose ? history : history.map( ( m ) => m.san || '' ) ),
		getIsCheck: vi.fn( () => false ),
		getInCheckColor: vi.fn( () => null ),
		hideMoves: vi.fn(),
		setGlyph: vi.fn( ( sq: Key, glyph: string | null ) => {
			if ( glyph ) {
				glyphsMap.set( sq, glyph );
			} else {
				glyphsMap.delete( sq );
			}
		} ),
		clearGlyphs: vi.fn( () => {
			glyphsMap.clear();
		} ),
		undoLastMove: vi.fn( () => {
			history.pop();
		} ),
		newGame: vi.fn(),
		loadPgn: vi.fn(),
		requestHint: vi.fn(),
		getState: vi.fn( () => ( { playerColor: 'white' } ) ),
		_setFen: ( fen: string ) => {
			currentFen = fen;
		},
		_addMove: ( move: Move ) => {
			history.push( move );
		},
		_setTurn: ( t: 'white' | 'black' ) => {
			turn = t;
		},
		_getGlyphsMap: () => glyphsMap,
	};

	return api as unknown as BoardCore & typeof api;
}

describe( 'usePlayGame - Mode Coach Bienveillant', () => {
	beforeEach( () => {
		localStorage.clear();
		vi.clearAllMocks();
	} );

	it( 'initializes coachMode to true by default', () => {
		const { gameSettings } = usePlayGame();
		expect( gameSettings.coachMode ).toBe( true );
	} );

	it( 'allows toggling coachMode and synchronizes with localStorage', () => {
		const { gameSettings } = usePlayGame();
		gameSettings.coachMode = false;
		expect( localStorage.getItem( 'dame_pwa_coach_mode' ) ).toBe( 'false' );

		gameSettings.coachMode = true;
		expect( localStorage.getItem( 'dame_pwa_coach_mode' ) ).toBe( 'true' );
	} );

	it( 'applies good move glyph on regular moves without suspending Stockfish', () => {
		const { setBoardApi, onPlayerMove, isAwaitingCoachConfirmation } = usePlayGame();
		const mockBoard = createMockBoardApi();

		// Simulate human played 1. e4
		mockBoard._addMove( { from: 'e2', to: 'e4', color: 'w', san: 'e4' } as Move );
		mockBoard._setTurn( 'black' );
		mockBoard._setFen( 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' );

		setBoardApi( mockBoard );
		onPlayerMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( false );
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'e4', '!' );
	} );

	it( 'intercepts hanging piece and suspends Stockfish with coach warning', () => {
		const { setBoardApi, onPlayerMove, isAwaitingCoachConfirmation, gameStatus } = usePlayGame();
		const mockBoard = createMockBoardApi();

		// Simulate human played Qa4?? hanging Queen to Black's Knight on c6
		mockBoard._addMove( { from: 'd1', to: 'a4', color: 'w', san: 'Qa4' } as Move );
		mockBoard._setTurn( 'black' );
		// White Queen on a4 attacked by Black Knight on b6 with 0 defenders
		mockBoard._setFen( 'r1bqkbnr/pppppppp/1n6/8/Q7/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1' );

		setBoardApi( mockBoard );
		onPlayerMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( true );
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'a4', 'undefended' );
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'a4', '??' );
		expect( gameStatus.color ).toBe( 'warning' );
	} );

	it( 'reverts move and clears warning glyphs when coachUndoMove is triggered', () => {
		const { setBoardApi, onPlayerMove, coachUndoMove, isAwaitingCoachConfirmation, oupsCount } = usePlayGame();
		const mockBoard = createMockBoardApi();

		mockBoard._addMove( { from: 'd1', to: 'a4', color: 'w', san: 'Qa4' } as Move );
		mockBoard._setTurn( 'black' );
		mockBoard._setFen( 'r1bqkbnr/pppppppp/1n6/8/Q7/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1' );

		setBoardApi( mockBoard );
		onPlayerMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( true );
		expect( oupsCount.value ).toBe( 0 );

		coachUndoMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( false );
		expect( oupsCount.value ).toBe( 1 );
		expect( mockBoard.clearGlyphs ).toHaveBeenCalled();
		expect( mockBoard.undoLastMove ).toHaveBeenCalled();
	} );

	it( 'unpauses game when coachProceed is triggered', () => {
		const { setBoardApi, onPlayerMove, coachProceed, isAwaitingCoachConfirmation } = usePlayGame();
		const mockBoard = createMockBoardApi();

		mockBoard._addMove( { from: 'd1', to: 'a4', color: 'w', san: 'Qa4' } as Move );
		mockBoard._setTurn( 'black' );
		mockBoard._setFen( 'r1bqkbnr/pppppppp/1n6/8/Q7/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1' );

		setBoardApi( mockBoard );
		onPlayerMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( true );

		coachProceed();

		expect( isAwaitingCoachConfirmation.value ).toBe( false );
	} );

	it( 'does not re-intercept in loop when user proceeds with coachProceed', () => {
		const { setBoardApi, onPlayerMove, coachProceed, isAwaitingCoachConfirmation } = usePlayGame();
		const mockBoard = createMockBoardApi();

		mockBoard._addMove( { from: 'd1', to: 'a4', color: 'w', san: 'Qa4' } as Move );
		mockBoard._setTurn( 'black' );
		mockBoard._setFen( 'r1bqkbnr/pppppppp/1n6/8/Q7/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1' );

		setBoardApi( mockBoard );
		onPlayerMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( true );

		// User clicks "Continuer"
		coachProceed();
		expect( isAwaitingCoachConfirmation.value ).toBe( false );

		// Subsequent triggers for same ply must NOT re-activate confirmation
		onPlayerMove();
		expect( isAwaitingCoachConfirmation.value ).toBe( false );
	} );
} );
