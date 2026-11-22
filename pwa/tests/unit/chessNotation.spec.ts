import { describe, expect, test } from 'vitest';
import { Chess } from 'chessops';
import { parseFen } from 'chessops/fen';
import {
	getPieceLabel,
	getPieceDisplayName,
	cleanNotation,
	toFrenchNotation,
	toInternationalNotation,
	squareIndexToString,
	formatMoveInFrench,
	formatMoveWithFrenchSan,
	extractShapesAndComment,
	shuffleArray,
	shuffleNonSorted,
} from '@/utils/chess/chessNotation';

describe( 'chessNotation.ts', () => {
	test( 'getPieceLabel retourne le bon nom français', () => {
		expect( getPieceLabel( 'pawn' ) ).toBe( 'Pion' );
		expect( getPieceLabel( 'knight' ) ).toBe( 'Cavalier' );
		expect( getPieceLabel( 'bishop' ) ).toBe( 'Fou' );
		expect( getPieceLabel( 'rook' ) ).toBe( 'Tour' );
		expect( getPieceLabel( 'queen' ) ).toBe( 'Dame' );
		expect( getPieceLabel( 'king' ) ).toBe( 'Roi' );
		expect( getPieceLabel( 'n' ) ).toBe( 'Cavalier' );
		expect( getPieceLabel( 'q' ) ).toBe( 'Dame' );
	} );

	test( 'getPieceDisplayName gère les accords de genre et de couleur', () => {
		expect( getPieceDisplayName( 'r', 'white' ) ).toBe( 'Tour blanche' );
		expect( getPieceDisplayName( 'rook', 'black' ) ).toBe( 'Tour noire' );
		expect( getPieceDisplayName( 'q', 'white' ) ).toBe( 'Dame blanche' );
		expect( getPieceDisplayName( 'queen', 'black' ) ).toBe( 'Dame noire' );
		expect( getPieceDisplayName( 'n', 'white' ) ).toBe( 'Cavalier blanc' );
		expect( getPieceDisplayName( 'knight', 'black' ) ).toBe(
			'Cavalier noir'
		);
		expect( getPieceDisplayName( 'p', 'white' ) ).toBe( 'Pion blanc' );
		expect( getPieceDisplayName( 'b', 'b' ) ).toBe( 'Fou noir' );
		expect( getPieceDisplayName( 'k', 'w' ) ).toBe( 'Roi blanc' );
	} );

	test( 'cleanNotation formate correctement les saisies utilisateur', () => {
		expect( cleanNotation( '  ta1  ' ) ).toBe( 'Ta1' );
		expect( cleanNotation( 'e4' ) ).toBe( 'e4' );
		expect( cleanNotation( 'cf3' ) ).toBe( 'Cf3' );
		expect( cleanNotation( '' ) ).toBe( '' );
	} );

	test( 'toFrenchNotation et toInternationalNotation convertissent fidèlement', () => {
		expect( toFrenchNotation( 'Nf3' ) ).toBe( 'Cf3' );
		expect( toFrenchNotation( 'Bxb5+' ) ).toBe( 'Fxb5+' );
		expect( toFrenchNotation( 'Qd1' ) ).toBe( 'Dd1' );
		expect( toFrenchNotation( 'Rad1' ) ).toBe( 'Tad1' );
		expect( toFrenchNotation( 'Kg1' ) ).toBe( 'Rg1' );

		expect( toInternationalNotation( 'Cf3' ) ).toBe( 'Nf3' );
		expect( toInternationalNotation( 'Fxb5+' ) ).toBe( 'Bxb5+' );
		expect( toInternationalNotation( 'Dd1' ) ).toBe( 'Qd1' );
		expect( toInternationalNotation( 'Tad1' ) ).toBe( 'Rad1' );
		expect( toInternationalNotation( 'Rg1' ) ).toBe( 'Kg1' );
	} );

	test( 'squareIndexToString convertit un indice 0..63 en coordonnées', () => {
		expect( squareIndexToString( 0 ) ).toBe( 'a1' );
		expect( squareIndexToString( 4 ) ).toBe( 'e1' );
		expect( squareIndexToString( 12 ) ).toBe( 'e2' );
		expect( squareIndexToString( 63 ) ).toBe( 'h8' );
	} );

	test( 'formatMoveInFrench et formatMoveWithFrenchSan verbalisent le coup', () => {
		const pos = Chess.default();
		const formatted = formatMoveInFrench( pos, 'e4' );
		expect( formatted.texte ).toBe( 'Pion e2 en e4' );
		expect( formatted.orig ).toBe( 'e2' );
		expect( formatted.dest ).toBe( 'e4' );

		const withSan = formatMoveWithFrenchSan( pos, 'e4' );
		expect( withSan ).toBe( 'Pion e2 en e4 (e4)' );

		const nf3 = formatMoveWithFrenchSan( pos, 'Nf3' );
		expect( nf3 ).toBe( 'Cavalier g1 en f3 (Cf3)' );
	} );

	test( 'formatMoveWithFrenchSan traduit les coups de Tour avec désambiguïsation et masque le symbole de mat (#)', () => {
		// Position avant 16. Rfe1+ dans Fischer - Fine 1963
		const fen16 =
			'r1b1k1r1/pp1p1pBp/8/b2P4/2B4q/1Q6/P4PP1/R4RK1 w - - 1 16';
		const setup16 = parseFen( fen16 ).unwrap();
		const pos16 = Chess.fromSetup( setup16 ).unwrap();
		expect( formatMoveWithFrenchSan( pos16, 'Rfe1+' ) ).toBe(
			'Tour f1 en e1 (Tfe1+)'
		);

		// Position avant 18. Bf6# dans Fischer - Fine 1963
		const fen18 =
			'r1bk2r1/pp1p1pBp/8/b2P4/2B5/6q1/P4PP1/R3R1K1 w - - 0 18';
		const setup18 = parseFen( fen18 ).unwrap();
		const pos18 = Chess.fromSetup( setup18 ).unwrap();
		expect( formatMoveWithFrenchSan( pos18, 'Bf6#' ) ).toBe(
			'Fou g7 en f6 (Ff6)'
		);
	} );

	test( 'extractShapesAndComment extrait correctement les annotations [%csl] et [%cal]', () => {
		const comments = [
			'Texte explicatif [%csl Ge4,Rb7] [%cal Ye4e5,Gg1f3] Fin de consigne',
		];
		const res = extractShapesAndComment( comments );

		expect( res.comment ).toBe( 'Texte explicatif Fin de consigne' );
		expect( res.shapes ).toHaveLength( 4 );
		expect( res.shapes ).toContainEqual( { orig: 'e4', brush: 'green' } );
		expect( res.shapes ).toContainEqual( { orig: 'b7', brush: 'red' } );
		expect( res.shapes ).toContainEqual( {
			orig: 'e4',
			dest: 'e5',
			brush: 'yellow',
		} );
		expect( res.shapes ).toContainEqual( {
			orig: 'g1',
			dest: 'f3',
			brush: 'green',
		} );
	} );

	test( 'shuffleArray effectue un mélange Fisher-Yates immuable', () => {
		const arr = [ 1, 2, 3, 4, 5 ];
		const fakeRng = () => 0;
		const shuffled = shuffleArray( arr, fakeRng );

		expect( shuffled ).toEqual( [ 2, 3, 4, 5, 1 ] );
		expect( arr ).toEqual( [ 1, 2, 3, 4, 5 ] );
	} );

	test( 'shuffleNonSorted garantit que le tableau mélangé n’est jamais déjà trié', () => {
		const arr = [ 0, 1, 2, 3, 4 ];
		// rng = 0.9999 produit l’identité [0, 1, 2, 3, 4] avec Fisher-Yates
		const identityRng = () => 0.9999;
		const isSorted = ( items: number[] ) =>
			items.every( ( v, idx ) => v === idx );

		const shuffled = shuffleNonSorted( arr, isSorted, identityRng );
		expect( isSorted( shuffled ) ).toBe( false );
		expect( [ ...shuffled ].sort() ).toEqual( arr );
	} );
} );
