import { describe, expect, test } from 'vitest';
import { parsePosiPlanPgn } from '@/utils/posiPlanParser';

describe( 'posiPlanParser.ts', () => {
	const examplePgn = `[Event "EA_Activité_CavalierAuCentre: EA_Niv1_A_PA_Posi’plan (Il n’y a pas le feu...)"]
[Date "2023.10.13"]
[Result "*"]
[Variant "Standard"]
[ECO "?"]
[Opening "?"]
[StudyName "EA_Activité_CavalierAuCentre"]
[ChapterName "EA_Niv1_A_PA_Posi’plan (Il n’y a pas le feu...)"]
[ChapterURL "https://lichess.org/study/7pqfBsK5/uVDJE6eg"]
[Annotator "https://lichess.org/@/EchiquierLedonien1"]
[FEN "r5k1/2qr1ppp/3p1b2/1p2p3/pPp1P3/P4P2/2P2QPP/2NRR1K1 w - - 0 12"]
[SetUp "1"]
[UTCDate "2023.10.13"]
[UTCTime "14:57:37"]

{ [%cal Gc2c3,Rd1d5,Yc1e2] }
12. Ne2 { Le Bon coup ! Les Noirs jouent } (12. Rd5 { Ce n’est pas le coup choisi dans la partie. Cependant, c’est une très bonne idée puisque la Tour s’active, attaque le pion b5, bloque le pion d6, prépare l’arrivée de l’autre Tour en d1. La case d5 est un avant-poste car celle-ci se trouve sur une colonne semi-ouverte et ne peut être protégée par les pions adverses. La partie pourrait continuer par } 12... Bd8 (12... Bg5 13. Rxb5 Qc6 { les pièces mineures ne sont pas très actives dans les deux camps. }) 13. Red1 Qc6 { [%csl Gb6,Gd1,Gd5,Rc1,Rd6][%cal Gd8b6,Rb6g1] }) (12. c3 { peut sembler intéressant car il fige la structure de pions. Néanmoins, les Noirs peuvent supprimer l’avant-poste en d5 en jouant eux-même le très joli } 12... d5 { après quoi les Blancs optent pour } 13. Rxd5 Rxd5 14. exd5 { qui gagne un pion. L’adversaire peut cependant le regagner avec } 14... Rd8 15. Rd1 Qb7 { Finalement, l’avant-poste en d5 a disparu, le Cavalier blanc est toujours inutile et les pièces noires sont actives. } { [%csl Rc1,Rd5][%cal Gb7d5,Gd8d5] } 16. Qd2 h6 17. Ne2 Bg5) 12... Rad8 { [%cal Ge2c3,Rd1d2,Ye2g3] } 13. Nc3 (13. Ng3 { Placer ton Cavalier sur la case forte f5 est une idée intéressante mais les Noirs optent pour le coup 2...d5 ! (Voir variante 1.c3) }) (13. Rd2 { Si tu veux doubler tes Tours c’est une bonne idée. Cependant, les Noirs jouent 2...d5 et réitèrent l’idée précédente. (Voir variante 1.c3) }) 13... Qc6 { [%cal Gc3d5,Rd1d5,Yg2g3] } 14. Nd5 { Le Cavalier s’est activé en se positionnant sur un avant-poste redoutable ! En utilisant la méthode de l’identification des cases fortes et des 3 coups de Cavalier, cet exercice est en réalité facile. Si les Blancs ne jouent pas pour ce plan, les Noirs s’activent par d5 ! (voir variante 1.c3). Dans la partie, le Cavalier étant replacé, il suffit de doubler les Tours sur la colonne d afin de donner aux pièces blanches leurs potentiels maximum. } { [%csl Rd6][%cal Gd5f6,Gd5e7,Gd5c7,Gd5b6,Yd1d5,Be4d5] } (14. Rd5 { Le Cavalier étant déjà très actif en c3, la Tour peut se rendre en d5 et profiter à l’aide du Cavalier, de la forte pression sur le pion b5. }) (14. g3 { Comme le Cavalier est certain d’accéder à la case d5, ce petit coup de consolidation est aussi jouable. }) *`;

	test( 'extrait la FEN, les formes initiales et les 3 choix initiaux', () => {
		const data = parsePosiPlanPgn( examplePgn );

		expect( data.initialFen ).toBe(
			'r5k1/2qr1ppp/3p1b2/1p2p3/pPp1P3/P4P2/2P2QPP/2NRR1K1 w - - 0 12'
		);
		expect( data.orientation ).toBe( 'white' );
		expect( data.initialShapes ).toHaveLength( 3 );

		// 3 Choix initiaux
		expect( data.initialChoices ).toHaveLength( 3 );

		const mainChoice = data.initialChoices.find( ( c ) => c.isMain );
		expect( mainChoice ).toBeDefined();
		expect( mainChoice?.san ).toBe( 'Ne2' );
		expect( mainChoice?.explanation ).toContain( 'Le Bon coup !' );

		const variantChoices = data.initialChoices.filter(
			( c ) => ! c.isMain
		);
		expect( variantChoices ).toHaveLength( 2 );

		const rd5Variant = variantChoices.find( ( c ) => c.san === 'Rd5' );
		expect( rd5Variant ).toBeDefined();
		expect( rd5Variant?.variantMoves.length ).toBeGreaterThan( 0 );
		expect( rd5Variant?.variantMoves[ 0 ].san ).toBe( 'Rd5' );

		const c3Variant = variantChoices.find( ( c ) => c.san === 'c3' );
		expect( c3Variant ).toBeDefined();
		expect( c3Variant?.variantMoves.length ).toBeGreaterThan( 0 );
		expect( c3Variant?.variantMoves[ 0 ].san ).toBe( 'c3' );
	} );

	test( 'découpe la branche principale en étapes séquentielles (PGN et QCM)', () => {
		const data = parsePosiPlanPgn( examplePgn );

		expect( data.mainBranchStages.length ).toBeGreaterThanOrEqual( 3 );

		// Étape 1 : Réponse noire (12... Rad8)
		const stage1 = data.mainBranchStages[ 0 ];
		expect( stage1.type ).toBe( 'pgn' );
		if ( stage1.type === 'pgn' ) {
			expect( stage1.moves[ 0 ].san ).toBe( 'Rad8' );
		}

		// Étape 2 : QCM coup 13 (Nc3 vs Ng3, Rd2)
		const stage2 = data.mainBranchStages[ 1 ];
		expect( stage2.type ).toBe( 'qcm' );
		if ( stage2.type === 'qcm' ) {
			expect( stage2.choices ).toHaveLength( 3 );
			const correct = stage2.choices.find( ( c ) => c.isCorrect );
			expect( correct?.san ).toBe( 'Nc3' );
			const wrong = stage2.choices.filter( ( c ) => ! c.isCorrect );
			expect( wrong.map( ( c ) => c.san ).sort() ).toEqual(
				[ 'Ng3', 'Rd2' ].sort()
			);
		}

		// Étape 3 : Réponse noire (13... Qc6)
		const stage3 = data.mainBranchStages[ 2 ];
		expect( stage3.type ).toBe( 'pgn' );
		if ( stage3.type === 'pgn' ) {
			expect( stage3.moves[ 0 ].san ).toBe( 'Qc6' );
		}

		// Étape 4 : QCM coup 14 (Nd5 vs Rd5, g3)
		const stage4 = data.mainBranchStages[ 3 ];
		expect( stage4.type ).toBe( 'qcm' );
		if ( stage4.type === 'qcm' ) {
			expect( stage4.choices ).toHaveLength( 3 );
			const correct = stage4.choices.find( ( c ) => c.isCorrect );
			expect( correct?.san ).toBe( 'Nd5' );
			expect( correct?.explanation ).toContain(
				'Le Cavalier s’est activé'
			);
		}
	} );

	test( 'gère un PGN vide sans planter', () => {
		const data = parsePosiPlanPgn( '' );
		expect( data.initialChoices ).toHaveLength( 0 );
		expect( data.mainBranchStages ).toHaveLength( 0 );
	} );
} );
