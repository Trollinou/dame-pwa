import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlayGame } from '@/composables/learning/play/usePlayGame';
import type { BoardCore, CoachAlertDetail, Key, Move } from '@/components/shared/Chessboard/types';

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
	let turn: 'white' | 'black' = 'black';

	const api = {
		getCurrentPlyNumber: vi.fn( () => history.length ),
		getTurnColor: vi.fn( () => turn ),
		getFen: vi.fn( () => currentFen ),
		getPgn: vi.fn( () => '1. e4' ),
		getHistory: vi.fn( ( verbose?: boolean ) => verbose ? history : history.map( ( m ) => m.san || '' ) ),
		getIsCheck: vi.fn( () => false ),
		getInCheckColor: vi.fn( () => null ),
		getIsGameOver: vi.fn( () => false ),
		getIsCheckmate: vi.fn( () => false ),
		getIsStalemate: vi.fn( () => false ),
		getIsDraw: vi.fn( () => false ),
		getGameOverReason: vi.fn( () => 'Échec et mat' ),
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
		coachUndo: vi.fn( () => {
			glyphsMap.clear();
			history.pop();
			return true;
		} ),
		coachProceed: vi.fn(),
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

function createMockCoachAlert( reason: 'hanging_piece' | 'bad_trade' = 'hanging_piece' ): CoachAlertDetail {
	return {
		move: { from: 'd1', to: 'a4', color: 'w', san: 'Qa4' } as Move,
		ply: 1,
		judgement: 'blunder',
		glyph: '??',
		reason,
		undefendedSquares: [ 'a4' ],
		pinnedSquares: [],
	};
}

describe( 'usePlayGame - Mode Coach Bienveillant (eg-chessboard 1.8.2)', () => {
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

	it( 'keeps game flowing on regular moves without coach alert', () => {
		const { setBoardApi, onPlayerMove, isAwaitingCoachConfirmation } = usePlayGame();
		const mockBoard = createMockBoardApi();

		mockBoard._addMove( { from: 'e2', to: 'e4', color: 'w', san: 'e4' } as Move );
		mockBoard._setTurn( 'black' );

		setBoardApi( mockBoard );
		onPlayerMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( false );
	} );

	it( 'handles coach-alert with hanging_piece reason and displays warning banner', () => {
		const { setBoardApi, handleCoachAlert, isAwaitingCoachConfirmation, gameStatus } = usePlayGame();
		const mockBoard = createMockBoardApi();

		setBoardApi( mockBoard );
		handleCoachAlert( createMockCoachAlert( 'hanging_piece' ) );

		expect( isAwaitingCoachConfirmation.value ).toBe( true );
		expect( gameStatus.color ).toBe( 'warning' );
		expect( gameStatus.message ).toContain( 'pièce sans défense' );
	} );

	it( 'handles coach-alert with bad_trade reason and displays bad trade message', () => {
		const { setBoardApi, handleCoachAlert, isAwaitingCoachConfirmation, gameStatus } = usePlayGame();
		const mockBoard = createMockBoardApi();

		setBoardApi( mockBoard );
		handleCoachAlert( createMockCoachAlert( 'bad_trade' ) );

		expect( isAwaitingCoachConfirmation.value ).toBe( true );
		expect( gameStatus.color ).toBe( 'warning' );
		expect( gameStatus.message ).toContain( 'échange semble défavorable' );
	} );

	it( 'delegates coachUndoMove to boardApi.coachUndo() and increments oupsCount', () => {
		const { setBoardApi, handleCoachAlert, coachUndoMove, isAwaitingCoachConfirmation, oupsCount } = usePlayGame();
		const mockBoard = createMockBoardApi();

		setBoardApi( mockBoard );
		handleCoachAlert( createMockCoachAlert( 'hanging_piece' ) );

		expect( isAwaitingCoachConfirmation.value ).toBe( true );
		expect( oupsCount.value ).toBe( 0 );

		coachUndoMove();

		expect( isAwaitingCoachConfirmation.value ).toBe( false );
		expect( oupsCount.value ).toBe( 1 );
		expect( mockBoard.coachUndo ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'delegates coachProceed to boardApi.coachProceed() and clears confirmation banner', () => {
		const { setBoardApi, handleCoachAlert, coachProceed, isAwaitingCoachConfirmation, gameStatus } = usePlayGame();
		const mockBoard = createMockBoardApi();

		setBoardApi( mockBoard );
		handleCoachAlert( createMockCoachAlert( 'hanging_piece' ) );
		expect( isAwaitingCoachConfirmation.value ).toBe( true );

		coachProceed();

		expect( isAwaitingCoachConfirmation.value ).toBe( false );
		expect( gameStatus.message ).toBe( '' );
		expect( mockBoard.coachProceed ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'resets isAwaitingCoachConfirmation when handleGameOver is triggered', () => {
		const { setBoardApi, handleCoachAlert, handleGameOver, isAwaitingCoachConfirmation } = usePlayGame();
		const mockBoard = createMockBoardApi();

		setBoardApi( mockBoard );
		handleCoachAlert( createMockCoachAlert( 'hanging_piece' ) );
		expect( isAwaitingCoachConfirmation.value ).toBe( true );

		handleGameOver( 'checkmate' );
		expect( isAwaitingCoachConfirmation.value ).toBe( false );
	} );
} );
