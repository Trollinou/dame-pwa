import { parsePgn } from 'chessops/pgn';
import { parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { Chess } from 'chessops';
import type { Key, DrawShape } from 'eg-chessboard';

export interface OuvreBoiteChoix {
	id: number;
	san: string;
	texte: string; // Ex: "Pion e2 en e4", "Fou f1 en b5"
	explication: string; // Commentaire associé au coup
	isCorrect: boolean; // true = branche principale, false = variante
	orig: string; // Case de départ (ex: "e2")
	dest: string; // Case d'arrivée (ex: "e4")
	brush?: string;
}

export interface CarteOuvreBoite {
	index: number;
	fenDepart: string;
	orientation: 'white' | 'black';
	shapes: DrawShape[];
	choix: OuvreBoiteChoix[];
	solutionSan: string;
	solutionTexte: string;
	bonneExplication: string;
}

const brushMap: Record< string, string > = {
	g: 'green',
	r: 'red',
	y: 'yellow',
	b: 'blue',
	o: 'yellow',
};

const ROLE_NAMES_FR: Record< string, string > = {
	pawn: 'Pion',
	knight: 'Cavalier',
	bishop: 'Fou',
	rook: 'Tour',
	queen: 'Dame',
	king: 'Roi',
};

const FILES = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ];

/**
 * Convertit un indice de case chessops (0..63) en chaîne (ex: 12 -> "e2").
 * @param sq
 */
export function squareIndexToString( sq: number ): string {
	const file = sq % 8;
	const rank = Math.floor( sq / 8 ) + 1;
	return `${ FILES[ file ] }${ rank }`;
}

/**
 * Extrait les formes graphiques ([%csl ...], [%cal ...]) et le texte épuré.
 * @param commentText
 */
export function extractShapesAndText( commentText: string ): {
	cleanedText: string;
	shapes: DrawShape[];
} {
	if ( ! commentText ) {
		return { cleanedText: '', shapes: [] };
	}

	const shapes: DrawShape[] = [];

	// 1. Cercles [%csl ...] ou [%cpl ...]
	const cslRegex = /\[%(?:csl|cpl)\s+([^\]]+)\]/gi;
	let cslMatch: RegExpExecArray | null;
	while ( ( cslMatch = cslRegex.exec( commentText ) ) !== null ) {
		const items = cslMatch[ 1 ].split( ',' );
		for ( const item of items ) {
			const clean = item.trim();
			if ( clean.length >= 3 ) {
				const brush = brushMap[ clean[ 0 ].toLowerCase() ] || 'green';
				const orig = clean.substring( 1, 3 ).toLowerCase() as Key;
				shapes.push( { orig, brush } );
			}
		}
	}

	// 2. Flèches [%cal ...]
	const calRegex = /\[%cal\s+([^\]]+)\]/gi;
	let calMatch: RegExpExecArray | null;
	while ( ( calMatch = calRegex.exec( commentText ) ) !== null ) {
		const items = calMatch[ 1 ].split( ',' );
		for ( const item of items ) {
			const clean = item.trim();
			if ( clean.length >= 5 ) {
				const brush = brushMap[ clean[ 0 ].toLowerCase() ] || 'green';
				const orig = clean.substring( 1, 3 ).toLowerCase() as Key;
				const dest = clean.substring( 3, 5 ).toLowerCase() as Key;
				shapes.push( { orig, dest, brush } );
			}
		}
	}

	// Nettoyage des balises [%...]
	const cleanedText = commentText
		.replace( /\[%[^\]]+\]/g, '' )
		.trim()
		.replace( /\s{2,}/g, ' ' );

	return { cleanedText, shapes };
}

/**
 * Traduit un coup SAN sur une position d'échecs en libellé français clair.
 * Ex: "Pion e2 en e4", "Fou f1 en b5", "Petit roque (O-O)", "Grand roque (O-O-O)"
 * @param pos
 * @param san
 */
export function formatMoveInFrench(
	pos: Chess,
	san: string
): { texte: string; orig: string; dest: string } {
	const trimmedSan = san.trim();

	// Gestion des roques
	if ( trimmedSan === 'O-O' || trimmedSan === '0-0' ) {
		const rank = pos.turn === 'white' ? '1' : '8';
		return {
			texte: 'Petit roque (O-O)',
			orig: `e${ rank }`,
			dest: `g${ rank }`,
		};
	}
	if ( trimmedSan === 'O-O-O' || trimmedSan === '0-0-0' ) {
		const rank = pos.turn === 'white' ? '1' : '8';
		return {
			texte: 'Grand roque (O-O-O)',
			orig: `e${ rank }`,
			dest: `c${ rank }`,
		};
	}

	// Remplacement éventuel des initiales françaises vers standard pour chessops
	const standardSan = trimmedSan
		.replace( /^F/, 'B' )
		.replace( /^C/, 'N' )
		.replace( /^T/, 'R' )
		.replace( /^D/, 'Q' );

	const parsedMove = parseSan( pos, standardSan );
	if ( ! parsedMove || ! ( 'from' in parsedMove ) ) {
		return {
			texte: san,
			orig: '',
			dest: '',
		};
	}

	const fromSquare = parsedMove.from;
	const toSquare = parsedMove.to;
	const orig = squareIndexToString( fromSquare );
	const dest = squareIndexToString( toSquare );

	const piece = pos.board.get( fromSquare );
	const role = piece ? piece.role : 'pawn';
	const roleName = ROLE_NAMES_FR[ role ] || 'Pion';

	let texte = `${ roleName } ${ orig } en ${ dest }`;
	if ( 'promotion' in parsedMove && parsedMove.promotion ) {
		const promoRole =
			ROLE_NAMES_FR[ parsedMove.promotion ] || parsedMove.promotion;
		texte += ` (${ promoRole })`;
	}

	return { texte, orig, dest };
}

/**
 * Mélange un tableau avec l'algorithme de Fisher-Yates (sans effet de bord sur l'original).
 * @param array
 */
export function shuffleArray< T >( array: T[] ): T[] {
	const copy = [ ...array ];
	for ( let i = copy.length - 1; i > 0; i-- ) {
		const j = Math.floor( Math.random() * ( i + 1 ) );
		[ copy[ i ], copy[ j ] ] = [ copy[ j ], copy[ i ] ];
	}
	return copy;
}

/**
 * Parse un Mini-PGN d'Ouvre-Boîte et retourne une CarteOuvreBoite complète avec ses 3 choix mélangés.
 * @param rawPgn
 * @param index
 */
export function parseOuvreBoiteMiniPgn(
	rawPgn: string,
	index: number = 0
): CarteOuvreBoite {
	const trimmed = rawPgn.trim();
	const DEFAULT_FEN =
		'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

	let fenDepart = DEFAULT_FEN;
	const allShapes: DrawShape[] = [];

	// 1. Parsing PGN via chessops
	let games: ReturnType< typeof parsePgn > = [];
	try {
		games = parsePgn( trimmed );
	} catch ( e ) {
		console.warn( 'Erreur lors du parsePgn pour Ouvre-Boîte:', e );
		games = [];
	}

	const game = games && games.length > 0 ? games[ 0 ] : null;

	if ( game ) {
		const fenHeader = game.headers.get( 'FEN' );
		if ( fenHeader && fenHeader !== 'start' ) {
			fenDepart = fenHeader;
		}

		// Extraire les formes des commentaires de début
		if ( game.comments ) {
			for ( const c of game.comments ) {
				const { shapes } = extractShapesAndText( c );
				allShapes.push( ...shapes );
			}
		}
	} else {
		// Fallback regex FEN
		const fenMatch = trimmed.match( /\[FEN\s+"([^"]+)"\]/i );
		if ( fenMatch && fenMatch[ 1 ] ) {
			fenDepart = fenMatch[ 1 ];
		}
	}

	// 2. Initialiser la position d'échecs
	const setupRes = parseFen( fenDepart );
	const pos =
		setupRes && setupRes.isOk
			? Chess.fromSetup( setupRes.value ).unwrap()
			: Chess.default();
	const orientation: 'white' | 'black' =
		pos.turn === 'white' ? 'white' : 'black';

	// Extraire les shapes directes du texte brut si besoin
	const rawShapeMatch = extractShapesAndText( trimmed );
	for ( const s of rawShapeMatch.shapes ) {
		if (
			! allShapes.some(
				( exist ) =>
					exist.orig === s.orig &&
					exist.dest === s.dest &&
					exist.brush === s.brush
			)
		) {
			allShapes.push( s );
		}
	}

	const choixList: OuvreBoiteChoix[] = [];
	let solutionSan = '';
	let solutionTexte = '';
	let bonneExplication = '';

	if ( game && game.moves && game.moves.children.length > 0 ) {
		// Branche principale (Bonne réponse)
		const mainChild = game.moves.children[ 0 ];
		const mainSan = mainChild.data.san;
		const mainComments = ( mainChild.data.comments || [] ).join( ' ' );
		const { cleanedText: mainExplication, shapes: mainShapes } =
			extractShapesAndText( mainComments );
		allShapes.push( ...mainShapes );

		const mainFormatted = formatMoveInFrench( pos, mainSan );
		solutionSan = mainSan;
		solutionTexte = mainFormatted.texte;
		bonneExplication = mainExplication || 'Bonne réponse !';

		choixList.push( {
			id: 1,
			san: mainSan,
			texte: mainFormatted.texte,
			explication: bonneExplication,
			isCorrect: true,
			orig: mainFormatted.orig,
			dest: mainFormatted.dest,
		} );

		// Variantes (Mauvaises réponses)
		for ( let i = 1; i < game.moves.children.length; i++ ) {
			const varChild = game.moves.children[ i ];
			const varSan = varChild.data.san;
			const varComments = ( varChild.data.comments || [] ).join( ' ' );
			const { cleanedText: varExplication, shapes: varShapes } =
				extractShapesAndText( varComments );
			allShapes.push( ...varShapes );

			const varFormatted = formatMoveInFrench( pos, varSan );

			choixList.push( {
				id: i + 1,
				san: varSan,
				texte: varFormatted.texte,
				explication: varExplication || 'Ce coup n’est pas le meilleur.',
				isCorrect: false,
				orig: varFormatted.orig,
				dest: varFormatted.dest,
			} );
		}
	}

	// Si moins de formes trouvées que de choix et aucune flèche %cal présente,
	// générer des flèches colorées pour chaque coup proposé
	if ( allShapes.length === 0 && choixList.length > 0 ) {
		const colors = [ 'green', 'yellow', 'blue', 'red' ];
		choixList.forEach( ( c, idx ) => {
			if ( c.orig && c.dest ) {
				allShapes.push( {
					orig: c.orig as Key,
					dest: c.dest as Key,
					brush: colors[ idx % colors.length ],
				} );
			}
		} );
	}

	// Mélange aléatoire des choix pour ne pas avoir la bonne réponse toujours en 1ère position
	const choixMelanges = shuffleArray( choixList );

	return {
		index,
		fenDepart,
		orientation,
		shapes: allShapes,
		choix: choixMelanges,
		solutionSan,
		solutionTexte,
		bonneExplication,
	};
}
