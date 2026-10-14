import { describe, it, expect } from 'vitest';
import {
	getStockfishUrls,
	getNodesForElo,
	computeEvalBarPercentage,
	formatEvaluationScore,
	validateFen,
} from '@/utils/chess/stockfish';

describe( 'Stockfish 19 Utilities', () => {
	it( 'resolves Stockfish 19 worker and wasm URLs', () => {
		const urls = getStockfishUrls();
		expect( urls.workerUrl ).toContain( 'stockfish.js' );
		expect( urls.wasmUrl ).toContain( 'stockfish.wasm' );
	} );

	it( 'calculates deterministic nodes for ELO accurately', () => {
		// Formule : 500 * 10^((elo - 800) / 500)
		// elo 800: 500 * 10^0 = 500
		expect( getNodesForElo( 800 ) ).toBe( 500 );
		// elo 1300: 500 * 10^1 = 5000
		expect( getNodesForElo( 1300 ) ).toBe( 5000 );
		// elo 1400: ~7924
		expect( getNodesForElo( 1400 ) ).toBe( 7924 );
	} );

	it( 'computes evaluation bar percentage correctly', () => {
		// Égalité (0 cp) -> 50%
		expect( computeEvalBarPercentage( 'w', 'cp', 0 ) ).toBe( 50 );

		// Avantage blanc -> > 50%
		const whiteAdvantage = computeEvalBarPercentage( 'w', 'cp', 200 );
		expect( whiteAdvantage ).toBeGreaterThan( 50 );
		expect( whiteAdvantage ).toBeLessThan( 100 );

		// Avantage noir -> < 50%
		const blackAdvantage = computeEvalBarPercentage( 'w', 'cp', -200 );
		expect( blackAdvantage ).toBeLessThan( 50 );
		expect( blackAdvantage ).toBeGreaterThan( 0 );

		// Mat en 1 pour les Blancs -> 100%
		expect( computeEvalBarPercentage( 'w', 'mate', 1 ) ).toBe( 100 );
		// Mat en 1 pour les Noirs -> 0%
		expect( computeEvalBarPercentage( 'w', 'mate', -1 ) ).toBe( 0 );
	} );

	it( 'formats evaluation score nicely', () => {
		expect(
			formatEvaluationScore( {
				ply: 1,
				fen: '',
				depth: 12,
				scoreType: 'cp',
				scoreValue: 150,
				whiteScoreValue: 150,
				winChancePercentage: 70,
				pv: [ 'e2e4' ],
				multipvIndex: 1,
			} )
		).toBe( '+1.5' );

		expect(
			formatEvaluationScore( {
				ply: 1,
				fen: '',
				depth: 12,
				scoreType: 'cp',
				scoreValue: -80,
				whiteScoreValue: -80,
				winChancePercentage: 35,
				pv: [ 'd7d5' ],
				multipvIndex: 1,
			} )
		).toBe( '-0.8' );

		expect(
			formatEvaluationScore( {
				ply: 1,
				fen: '',
				depth: 12,
				scoreType: 'mate',
				scoreValue: 2,
				whiteScoreValue: 10000,
				winChancePercentage: 100,
				pv: [ 'd1h5' ],
				multipvIndex: 1,
			} )
		).toBe( '+M2' );

		expect(
			formatEvaluationScore( {
				ply: 1,
				fen: '',
				depth: 12,
				scoreType: 'mate',
				scoreValue: -3,
				whiteScoreValue: -10000,
				winChancePercentage: 0,
				pv: [ 'f7f8' ],
				multipvIndex: 1,
			} )
		).toBe( '-M3' );

		expect( formatEvaluationScore( null ) ).toBe( '0.0' );
	} );

	it( 'validates FEN positions', () => {
		const valid = validateFen(
			'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
		);
		expect( valid.valid ).toBe( true );

		const invalid = validateFen( 'invalid fen string' );
		expect( invalid.valid ).toBe( false );
	} );
} );
