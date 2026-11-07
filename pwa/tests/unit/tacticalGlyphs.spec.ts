import { describe, it, expect } from 'vitest';
import { Chess } from 'chessops';
import { parseFen } from 'chessops/fen';
import {
	detectPinnedPieces,
	detectUndefendedPieces,
	analyzePositionTactics,
	classifyMoveDiff,
	judgementToGlyph,
} from '@/utils/chess/tacticalGlyphs';

describe( 'tacticalGlyphs utility', () => {
	describe( 'detectPinnedPieces', () => {
		it( 'detects a piece pinned to the king', () => {
			// FEN: White Knight on c3 is pinned to King on e1 by Black Bishop on b4 (d2 is empty)
			const fen = 'rnbqk1nr/pppp1ppp/8/4p3/1b6/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 1';
			const setup = parseFen( fen ).value;
			const pos = Chess.fromSetup( setup ).value;

			const pinned = detectPinnedPieces( pos, 'white' );
			expect( pinned ).toContain( 'c3' );
			expect( pinned.length ).toBe( 1 );
		} );

		it( 'returns empty array when no pieces are pinned', () => {
			const pos = Chess.default();
			const pinned = detectPinnedPieces( pos, 'white' );
			expect( pinned ).toEqual( [] );
		} );
	} );

	describe( 'detectUndefendedPieces', () => {
		it( 'detects an attacked piece with no defenders (hanging piece)', () => {
			// Black Bishop on a5 attacked by White Queen on a4 with no black defenders
			const fen = 'rnbqk1nr/pppp1ppp/8/b7/Q7/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1';
			const setup = parseFen( fen ).value;
			const pos = Chess.fromSetup( setup ).value;

			const undefended = detectUndefendedPieces( pos, 'black' );
			expect( undefended ).toContain( 'a5' );
		} );

		it( 'does not flag a defended piece attacked by equal value piece', () => {
			// Black Knight on c6 defended by Pawn on b7, attacked by White Knight on d4
			const fen = 'r1bqkbnr/pppppppp/2n5/8/3N4/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1';
			const setup = parseFen( fen ).value;
			const pos = Chess.fromSetup( setup ).value;

			const undefended = detectUndefendedPieces( pos, 'black' );
			expect( undefended ).not.toContain( 'c6' );
		} );

		it( 'flags a piece attacked by a lower-value piece even if defended', () => {
			// White Rook on e4 defended by Pawn on d3, attacked by Black Pawn on d5
			const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4R3/3P4/PPP1PPPP/RNBQKBN1 b Qkq - 0 1';
			const setup = parseFen( fen ).value;
			const pos = Chess.fromSetup( setup ).value;

			const undefended = detectUndefendedPieces( pos, 'white' );
			expect( undefended ).toContain( 'e4' );
		} );
	} );

	describe( 'analyzePositionTactics', () => {
		it( 'analyzes threats and returns structured result', () => {
			const fen = 'rnbqk1nr/pppp1ppp/8/b7/Q7/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1';
			const result = analyzePositionTactics( fen, 'black' );

			expect( result.undefendedSquares ).toContain( 'a5' );
			expect( result.hasMajorThreat ).toBe( true );
		} );

		it( 'handles invalid FEN gracefully without throwing', () => {
			const result = analyzePositionTactics( 'invalid-fen', 'white' );
			expect( result.undefendedSquares ).toEqual( [] );
			expect( result.pinnedSquares ).toEqual( [] );
			expect( result.isKingInCheck ).toBe( false );
			expect( result.hasMajorThreat ).toBe( false );
		} );
	} );

	describe( 'classifyMoveDiff', () => {
		it( 'classifies move quality correctly based on win chance diff', () => {
			expect( classifyMoveDiff( 0.5 ) ).toBe( 'best' );
			expect( classifyMoveDiff( 5.0 ) ).toBe( 'excellent' );
			expect( classifyMoveDiff( 12.0 ) ).toBe( 'good' );
			expect( classifyMoveDiff( 20.0 ) ).toBe( 'inaccuracy' );
			expect( classifyMoveDiff( 35.0 ) ).toBe( 'mistake' );
			expect( classifyMoveDiff( 45.0 ) ).toBe( 'blunder' );
			expect( classifyMoveDiff( 1.0, true ) ).toBe( 'missed_win' );
		} );
	} );

	describe( 'judgementToGlyph', () => {
		it( 'maps judgement to corresponding chessground glyph', () => {
			expect( judgementToGlyph( 'brilliant' ) ).toBe( '!!' );
			expect( judgementToGlyph( 'best' ) ).toBe( '!' );
			expect( judgementToGlyph( 'excellent' ) ).toBe( '!' );
			expect( judgementToGlyph( 'good' ) ).toBe( '!' );
			expect( judgementToGlyph( 'inaccuracy' ) ).toBe( '?!' );
			expect( judgementToGlyph( 'mistake' ) ).toBe( '?' );
			expect( judgementToGlyph( 'blunder' ) ).toBe( '??' );
			expect( judgementToGlyph( 'missed_win' ) ).toBe( '??' );
		} );
	} );
} );
