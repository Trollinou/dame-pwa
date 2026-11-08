import { describe, it, expect } from 'vitest';
import {
	formatPgnDate,
	parsePgnComponents,
	formatExportPgn,
} from '@/utils/chess/pgnExport';

describe( 'pgnExport utils', () => {
	it( 'formatPgnDate formats date in YYYY.MM.DD', () => {
		const fixedDate = new Date( 2026, 10, 7 ); // Nov 7, 2026
		expect( formatPgnDate( fixedDate ) ).toBe( '2026.11.07' );
	} );

	it( 'parsePgnComponents parses tags and movetext correctly', () => {
		const raw = `[Event "Partie test"]
[Site "DAME"]
[White "Alice"]

1. e4 e5 2. Nf3 1-0`;

		const { tags, movetext } = parsePgnComponents( raw );
		expect( tags.Event ).toBe( 'Partie test' );
		expect( tags.Site ).toBe( 'DAME' );
		expect( tags.White ).toBe( 'Alice' );
		expect( movetext ).toBe( '1. e4 e5 2. Nf3 1-0' );
	} );

	it( 'formatExportPgn creates complete Seven Tag Roster + training tags', () => {
		const pgn = formatExportPgn( {
			pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#',
			event: "Partie contre l'ordinateur",
			site: 'DAME PWA',
			date: '2026.11.07',
			round: '1',
			white: 'Jean Dupont',
			black: 'Stockfish (Niveau 1320)',
			result: '1-0',
			whiteElo: 1500,
			blackElo: 1320,
			variant: 'Standard',
			termination: 'Échec et mat',
			annotator: 'DAME Coach',
			takebacks: 2,
			hints: 1,
		} );

		expect( pgn ).toContain( '[Event "Partie contre l\'ordinateur"]' );
		expect( pgn ).toContain( '[Site "DAME PWA"]' );
		expect( pgn ).toContain( '[Date "2026.11.07"]' );
		expect( pgn ).toContain( '[Round "1"]' );
		expect( pgn ).toContain( '[White "Jean Dupont"]' );
		expect( pgn ).toContain( '[Black "Stockfish (Niveau 1320)"]' );
		expect( pgn ).toContain( '[Result "1-0"]' );
		expect( pgn ).toContain( '[WhiteElo "1500"]' );
		expect( pgn ).toContain( '[BlackElo "1320"]' );
		expect( pgn ).toContain( '[Variant "Standard"]' );
		expect( pgn ).toContain( '[Termination "Échec et mat"]' );
		expect( pgn ).toContain( '[Annotator "DAME Coach"]' );
		expect( pgn ).toContain( '[Takebacks "2"]' );
		expect( pgn ).toContain( '[Hints "1"]' );
		expect( pgn ).toContain( '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0' );
	} );

	it( 'formatExportPgn handles raw movetext without pre-existing headers', () => {
		const pgn = formatExportPgn( {
			pgn: '1. d4 d5 2. c4',
			white: 'Adhérent',
			black: 'Stockfish',
			result: '*',
		} );

		expect( pgn ).toContain( '[Event "Partie d\'échecs"]' );
		expect( pgn ).toContain( '[White "Adhérent"]' );
		expect( pgn ).toContain( '[Black "Stockfish"]' );
		expect( pgn ).toContain( '[Result "*"]' );
		expect( pgn.endsWith( '1. d4 d5 2. c4 *' ) ).toBe( true );
	} );

	it( 'formatExportPgn preserves sub-variations from undone moves (eg-chessboard 1.8.2)', () => {
		const pgn = formatExportPgn( {
			pgn: '1. e4 e5 2. Nf3 ( 2. Qh5 ) 2... Nc6 *',
			white: 'Adhérent',
			black: 'Stockfish',
			result: '1-0',
			takebacks: 1,
		} );

		expect( pgn ).toContain( '[Takebacks "1"]' );
		expect( pgn ).toContain( '[Result "1-0"]' );
		expect( pgn ).toContain( '1. e4 e5 2. Nf3 ( 2. Qh5 ) 2... Nc6 1-0' );
	} );
} );
