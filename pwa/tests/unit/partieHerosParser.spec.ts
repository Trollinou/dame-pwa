import { describe, expect, test } from 'vitest';
import {
	parsePartieHerosPgn,
	shuffleChoices,
	toFrenchNotation,
	type QcmChoice,
} from '@/utils/parsers/partieHerosParser';

describe( 'partieHerosParser.ts', () => {
	test( 'toFrenchNotation convertit la notation anglaise en notation française', () => {
		expect( toFrenchNotation( 'Nf3' ) ).toBe( 'Cf3' );
		expect( toFrenchNotation( 'Bxb5+' ) ).toBe( 'Fxb5+' );
		expect( toFrenchNotation( 'Qd1' ) ).toBe( 'Dd1' );
		expect( toFrenchNotation( 'Rfe1' ) ).toBe( 'Tfe1' );
		expect( toFrenchNotation( 'Kh1' ) ).toBe( 'Rh1' );
		expect( toFrenchNotation( 'e4' ) ).toBe( 'e4' );
	} );

	test( 'shuffleChoices permute les éléments selon l’algorithme Fisher-Yates avec un RNG prédictible', () => {
		const choices: QcmChoice[] = [
			{
				san: 'a6',
				label: 'a6',
				isCorrect: true,
				explanation: 'Bon coup',
			},
			{
				san: 'Nf6',
				label: 'Cf6',
				isCorrect: false,
				explanation: 'Mauvais coup',
			},
			{
				san: 'd6',
				label: 'd6',
				isCorrect: false,
				explanation: 'Mauvais coup',
			},
		];

		// RNG inversant l'ordre
		const fakeRng = () => 0;
		const result = shuffleChoices( choices, fakeRng );

		expect( result ).toHaveLength( 3 );
		expect( result.map( ( c ) => c.san ) ).toEqual( [ 'Nf6', 'd6', 'a6' ] );
		// L'original n'a pas été muté
		expect( choices[ 0 ].san ).toBe( 'a6' );
	} );

	test( 'parsePartieHerosPgn inclut la bonne réponse et les variantes avec les choix mélangés', () => {
		const pgn = `[Event "Demo"]
[FEN "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"]
[SetUp "1"]

1. Bb5 { [%cal Ga7a6,Rg8f6,Yd7d6] } a6 (1... Nf6 2. O-O) (1... d6 2. d4) 2. Ba4 *`;

		const stages = parsePartieHerosPgn( pgn );
		expect( stages ).toHaveLength( 3 );

		// Étape 1 : PGN
		expect( stages[ 0 ].type ).toBe( 'pgn' );

		// Étape 2 : QCM
		expect( stages[ 1 ].type ).toBe( 'qcm' );
		if ( stages[ 1 ].type === 'qcm' ) {
			const qcm = stages[ 1 ];
			expect( qcm.choices ).toHaveLength( 3 );

			const correctChoice = qcm.choices.find( ( c ) => c.isCorrect );
			expect( correctChoice ).toBeDefined();
			expect( correctChoice?.san ).toBe( 'a6' );

			const wrongChoices = qcm.choices.filter( ( c ) => ! c.isCorrect );
			expect( wrongChoices ).toHaveLength( 2 );
			expect( wrongChoices.map( ( c ) => c.san ).sort() ).toEqual(
				[ 'Nf6', 'd6' ].sort()
			);
		}

		// Étape 3 : PGN final
		expect( stages[ 2 ].type ).toBe( 'pgn' );
	} );

	test( 'ignore les variantes sans 3 flèches de couleurs distinctes avec pièce à l’origine', () => {
		const pgn = `[Event "Variante explicative sans flèches"]
[FEN "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"]
[SetUp "1"]

1. Bb5 a6 (1... Nf6 2. O-O) 2. Ba4 { [%cal Ga4b3,Ya4c2,Gb3c2] } b5 (2... Nf6) 3. Bb3 *`;

		const stages = parsePartieHerosPgn( pgn );
		expect( stages ).toHaveLength( 1 );
		expect( stages[ 0 ].type ).toBe( 'pgn' );
		if ( stages[ 0 ].type === 'pgn' ) {
			expect( stages[ 0 ].moves.map( ( m ) => m.san ) ).toEqual( [
				'Bb5',
				'a6',
				'Ba4',
				'b5',
				'Bb3',
			] );
		}
	} );

	test( 'Morphy-De Rivière 1863 : ne déclenche pas de QCM au coup 16 ni au coup 20', () => {
		const pgn = `[Event "Analyse des parties : Initiation: Morphy"]
[Orientation "white"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Bc5 6. O-O d6 7. d4 exd4 8. cxd4 Bb6 9. Nc3 Qf6 { [%csl Ge4,Gd4,Bc3,Bc4,Bf3,Rc8,Rg8,Rh8,Ra8,Re8,Rf6][%cal Gc3d5,Rf1e1,Yc1g5] } 10. Nd5 (10. Bg5) (10. Re1) 10... Qg6 11. Nf4! Qf6 { [%cal Gf4d5,Re4e5,Yf4h5] } 12. e5! (12. Nd5) (12. Nh5) 12... dxe5 13. dxe5 Qf5 14. e6 f6 15. Nh4 Qc5 16. Be3! Qg5 (16... Qxc4 17. Qh5+ g6 18. Nhxg6 hxg6 19. Qxg6+ Ke7) 17. Nf3 Qa5 18. Bxb6 Qxb6 { [%cal Ga1b1,Rf4d5,Yf1e1] } 19. Nd5 (19. Re1) (19. Rb1) 19... Qa5 20. Nd2! { [%csl Re8,Rg8,Rh8,Rc8,Ra8,Be6,Gc4,Gd5][%cal Gd2b3,Yd1h5,Gh5e8] } 20... Nd4 21. Nb3 Nxb3 22. axb3 Qc5 { [%cal Gc4b5,Yd1h5,Rd1g4] } 23. Qh5+ (23. Bb5+ Qxb5 24. Nxc7+) (23. Qg4) 23... Kd8 24. Rad1 *`;

		const stages = parsePartieHerosPgn( pgn );
		const qcmStages = stages.filter( ( s ) => s.type === 'qcm' );
		expect( qcmStages ).toHaveLength( 4 );

		const qcmCorrectMoves = qcmStages.map(
			( q ) => q.choices.find( ( c ) => c.isCorrect )?.san
		);
		expect( qcmCorrectMoves ).toEqual( [ 'Nd5', 'e5', 'Nd5', 'Qh5+' ] );
	} );
} );
