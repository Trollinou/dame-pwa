import { describe, it, expect } from 'vitest';
import {
	parseAssociPlanSinglePgn,
	parseAssociPlanPaires,
} from '@/utils/associPlanParser';

describe( 'associPlanParser', () => {
	const pgnExemple = `[Event "EA_Activité_CavalierAuCentre: EA_Niv1_A_AA-2_Associ'plan"]
[Date "2026.08.22"]
[Result "*"]
[Variant "Standard"]
[ECO "?"]
[Opening "?"]
[StudyName "EA_Activité_CavalierAuCentre"]
[ChapterName "EA_Niv1_A_AA-2_Associ'plan"]
[ChapterURL "https://lichess.org/study/7pqfBsK5/J2dFCIv8"]
[Annotator "https://lichess.org/@/EchiquierLedonien1"]
[FEN "r2q1rk1/pb3ppp/1pnbpn2/2pp4/3P4/2PBPNB1/PP1N1PPP/R2Q1RK1 w - - 0 1"]
[SetUp "1"]
[UTCDate "2026.08.22"]
[UTCTime "14:27:26"]

{ [%csl Ge5][%cal Gd2f3,Gf3e5] Voici une position avec beaucoup de pièces. Beaucoup de coups sont possibles. }
1. Ne5 { Le Cavalier se centralise tout simplement. } 1... Qc7 2. f4 *`;

	it( "extrait correctement la FEN, l'orientation, les shapes et la description initiale", () => {
		const result = parseAssociPlanSinglePgn( pgnExemple, 0 );

		expect( result.originalIndex ).toBe( 0 );
		expect( result.fen ).toBe(
			'r2q1rk1/pb3ppp/1pnbpn2/2pp4/3P4/2PBPNB1/PP1N1PPP/R2Q1RK1 w - - 0 1'
		);
		expect( result.couleurJoueur ).toBe( 'white' );
		expect( result.description ).toBe(
			'Voici une position avec beaucoup de pièces. Beaucoup de coups sont possibles.'
		);
		expect( result.shapes ).toHaveLength( 3 );
		expect( result.shapes[ 0 ] ).toEqual( { orig: 'e5', brush: 'green' } );
		expect( result.shapes[ 1 ] ).toEqual( {
			orig: 'd2',
			dest: 'f3',
			brush: 'green',
		} );
		expect( result.shapes[ 2 ] ).toEqual( {
			orig: 'f3',
			dest: 'e5',
			brush: 'green',
		} );
	} );

	it( 'traite une liste de paires avec parseAssociPlanPaires', () => {
		const paires = parseAssociPlanPaires( [
			{ pgn: pgnExemple },
			{ pgn: '' },
		] );

		expect( paires ).toHaveLength( 2 );
		expect( paires[ 0 ].couleurJoueur ).toBe( 'white' );
		expect( paires[ 1 ].description ).toBe( 'Plan 2' );
	} );
} );
