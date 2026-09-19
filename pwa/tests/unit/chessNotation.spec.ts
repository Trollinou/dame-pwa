import { describe, expect, test } from 'vitest';
import { Chess } from 'chessops';
import { parseFen } from 'chessops/fen';
import {
	ROLE_NAMES_FR,
	ROLE_LETTERS_FR,
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
} from '@/utils/chessNotation';

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
		expect( getPieceDisplayName( 'knight', 'black' ) ).toBe( 'Cavalier noir' );
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
} );
