import { describe, expect, test } from 'vitest';
import {
	parsePartieHerosPgn,
	shuffleChoices,
	toFrenchNotation,
	type QcmChoice,
} from '@/utils/partieHerosParser';

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

1. Bb5 a6 (1... Nf6 2. O-O) (1... d6 2. d4) 2. Ba4 *`;

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
} );
