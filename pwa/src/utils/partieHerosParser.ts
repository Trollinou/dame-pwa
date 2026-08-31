import { Chess } from 'chessops';
import { parseFen, makeFen } from 'chessops/fen';
import { parseSan, makeSanAndPlay } from 'chessops/san';
import {
	parsePgn,
	type Node,
	type ChildNode,
	type PgnNodeData,
	isChildNode,
} from 'chessops/pgn';
import type { DrawShape, Key } from 'eg-chessboard';
import { getActiveColorFromFen } from './fenUtils';

export interface PgnMoveStep {
	san: string;
	comment: string;
	shapes: DrawShape[];
	fenAfter: string;
}

export interface PgnStage {
	type: 'pgn';
	fenDepart: string;
	orientation: 'white' | 'black';
	moves: PgnMoveStep[];
	startingComment?: string;
	startingShapes?: DrawShape[];
}

export interface QcmChoice {
	san: string;
	label: string;
	isCorrect: boolean;
	explanation: string;
}

export interface QcmStage {
	type: 'qcm';
	fen: string;
	orientation: 'white' | 'black';
	shapes: DrawShape[];
	question: string;
	choices: QcmChoice[];
}

export type PartieHerosStage = PgnStage | QcmStage;

const brushMap: Record< string, string > = {
	g: 'green',
	r: 'red',
	b: 'blue',
	y: 'yellow',
	c: 'green',
	o: 'yellow',
};

/**
 * Convertit un coup SAN de notation internationale (K, Q, R, B, N)
 * en notation française (R, D, T, F, C).
 * @param san
 */
export function toFrenchNotation( san: string ): string {
	if ( ! san ) {
		return '';
	}
	const pieceMap: Record< string, string > = {
		K: 'R', // Roi
		Q: 'D', // Dame
		R: 'T', // Tour
		B: 'F', // Fou
		N: 'C', // Cavalier
	};
	return san.replace( /[KQRBN]/g, ( match ) => pieceMap[ match ] || match );
}

/**
 * Extrait les formes graphiques ([%csl ...], [%cal ...]) et le texte de commentaire nettoyé.
 * @param comments
 */
export function extractShapesAndComment( comments?: string[] ): {
	comment: string;
	shapes: DrawShape[];
} {
	if ( ! comments || comments.length === 0 ) {
		return { comment: '', shapes: [] };
	}

	const fullText = comments.join( '\n' );
	const shapes: DrawShape[] = [];

	// 1. Cercles/cases [%csl ...] ou [%cpl ...]
	const cslRegex = /\[%(?:csl|cpl)\s+([^\]]+)\]/gi;
	let cslMatch: RegExpExecArray | null;
	while ( ( cslMatch = cslRegex.exec( fullText ) ) !== null ) {
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
	while ( ( calMatch = calRegex.exec( fullText ) ) !== null ) {
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

	// 3. Commentaire texte sans les annotations de formes
	const cleanComment = fullText
		.replace( /\[%(?:cal|csl|cpl)\s+[^\]]+\]/gi, '' )
		.trim();

	return { comment: cleanComment, shapes };
}

/**
 * Analyse une étude PGN complète et la découpe en étapes séquentielles
 * (séquences de défilement PGN + embranchements QCM interactifs).
 * @param rawPgn
 * @param defaultConsigne
 */
export function parsePartieHerosPgn(
	rawPgn: string,
	defaultConsigne?: string
): PartieHerosStage[] {
	const defaultFen =
		'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

	if ( ! rawPgn || typeof rawPgn !== 'string' || ! rawPgn.trim() ) {
		return [
			{
				type: 'pgn',
				fenDepart: defaultFen,
				orientation: 'white',
				moves: [],
				startingComment: '',
			},
		];
	}

	const trimmed = rawPgn.trim();

	// 1. FEN initiale
	let initialFen = defaultFen;
	const fenMatch = trimmed.match( /\[FEN\s+"([^"]+)"\]/i );
	if ( fenMatch && fenMatch[ 1 ] ) {
		initialFen = fenMatch[ 1 ].trim();
	}

	let currentPos: Chess;
	const fenParsed = parseFen( initialFen );
	if ( fenParsed && fenParsed.isOk ) {
		const setupRes = Chess.fromSetup( fenParsed.value );
		currentPos = setupRes.isOk ? setupRes.value : Chess.default();
	} else {
		currentPos = Chess.default();
	}

	const orientation = getActiveColorFromFen( initialFen );

	let games;
	try {
		games = parsePgn( trimmed );
	} catch ( e ) {
		console.warn( 'Erreur parsing PGN partie héros:', e );
		return [
			{
				type: 'pgn',
				fenDepart: initialFen,
				orientation,
				moves: [],
				startingComment: '',
			},
		];
	}

	if ( ! games || games.length === 0 ) {
		return [
			{
				type: 'pgn',
				fenDepart: initialFen,
				orientation,
				moves: [],
				startingComment: '',
			},
		];
	}

	const game = games[ 0 ];
	const root = game.moves;

	const stages: PartieHerosStage[] = [];
	let currentPgnMoves: PgnMoveStep[] = [];
	let stageStartFen = makeFen( currentPos.toSetup() );

	// Extraction du commentaire initial (avec fallback regex si besoin)
	let initialStartingComment = '';
	let initialStartingShapes: DrawShape[] = [];
	if ( game.comments && game.comments.length > 0 ) {
		const parsedInit = extractShapesAndComment( game.comments );
		initialStartingComment = parsedInit.comment;
		initialStartingShapes = parsedInit.shapes;
	}
	if ( ! initialStartingComment ) {
		const textWithoutHeaders = trimmed.replace( /\[[^\]]*\]/g, '' ).trim();
		const firstMoveIdx = textWithoutHeaders.search( /\b\d+\s*\./ );
		const preamble =
			firstMoveIdx !== -1
				? textWithoutHeaders.substring( 0, firstMoveIdx )
				: textWithoutHeaders;
		const commentMatch = preamble.match( /\{([^}]*)\}/ );
		if ( commentMatch && commentMatch[ 1 ] ) {
			const parsedInit = extractShapesAndComment( [ commentMatch[ 1 ] ] );
			initialStartingComment = parsedInit.comment;
			initialStartingShapes = parsedInit.shapes;
		}
	}

	let node: Node< PgnNodeData > | undefined = root;

	while ( node ) {
		if ( node.children.length === 0 ) {
			if ( currentPgnMoves.length > 0 ) {
				stages.push( {
					type: 'pgn',
					fenDepart: stageStartFen,
					orientation,
					moves: [ ...currentPgnMoves ],
					startingComment: initialStartingComment,
					startingShapes: initialStartingShapes,
				} );
				currentPgnMoves = [];
				initialStartingComment = '';
				initialStartingShapes = [];
			}
			break;
		}

		if ( node.children.length > 1 ) {
			// Clôture de la séquence PGN précédente
			if ( currentPgnMoves.length > 0 ) {
				stages.push( {
					type: 'pgn',
					fenDepart: stageStartFen,
					orientation,
					moves: [ ...currentPgnMoves ],
					startingComment: initialStartingComment,
					startingShapes: initialStartingShapes,
				} );
				currentPgnMoves = [];
				initialStartingComment = '';
				initialStartingShapes = [];
			}

			const nodeComments = isChildNode( node )
				? node.data?.comments
				: undefined;
			const parentParsed = extractShapesAndComment( nodeComments );
			const mainChild: ChildNode< PgnNodeData > = node.children[ 0 ];
			const mainParsed = extractShapesAndComment(
				mainChild.data?.comments
			);

			const choices: QcmChoice[] = [];

			// 1. Coup principal (succès) en notation française sans numéro de coup
			choices.push( {
				san: mainChild.data.san,
				label: toFrenchNotation( mainChild.data.san ),
				isCorrect: true,
				explanation:
					mainParsed.comment || "Super ! C'est le meilleur coup.",
			} );

			// 2. Variantes (erreurs avec explications dédiées) en notation française sans numéro de coup
			for ( let v = 1; v < node.children.length; v++ ) {
				const varChild = node.children[ v ];
				const varParsed = extractShapesAndComment(
					varChild.data?.comments
				);
				choices.push( {
					san: varChild.data.san,
					label: toFrenchNotation( varChild.data.san ),
					isCorrect: false,
					explanation:
						varParsed.comment || 'Mauvais choix ! Cherchez encore.',
				} );
			}

			// Formes associées au QCM (flèches indicatrices)
			const qcmShapes = parentParsed.shapes;

			stages.push( {
				type: 'qcm',
				fen: makeFen( currentPos.toSetup() ),
				orientation: getActiveColorFromFen(
					makeFen( currentPos.toSetup() )
				),
				shapes: qcmShapes,
				question: defaultConsigne || 'Quel est le meilleur coup ?',
				choices,
			} );

			// Avancer sur la ligne principale avec le bon coup joué dans le QCM
			const parsedMove = parseSan( currentPos, mainChild.data.san );
			if ( parsedMove ) {
				makeSanAndPlay( currentPos, parsedMove );
			}

			// La séquence PGN suivante repartira APRÈS le coup du QCM,
			// avec comme commentaire et formes de départ ceux du coup validé dans le QCM
			stageStartFen = makeFen( currentPos.toSetup() );
			currentPgnMoves = [];
			initialStartingComment = mainParsed.comment;
			initialStartingShapes = mainParsed.shapes;

			node = mainChild;
		} else {
			// Défilement normal du coup de la ligne principale
			const child: ChildNode< PgnNodeData > = node.children[ 0 ];
			const parsed = extractShapesAndComment( child.data?.comments );
			const parsedMove = parseSan( currentPos, child.data.san );
			if ( parsedMove ) {
				makeSanAndPlay( currentPos, parsedMove );
			}

			currentPgnMoves.push( {
				san: child.data.san,
				comment: parsed.comment,
				shapes: parsed.shapes,
				fenAfter: makeFen( currentPos.toSetup() ),
			} );

			node = child;
		}
	}

	if ( currentPgnMoves.length > 0 ) {
		stages.push( {
			type: 'pgn',
			fenDepart: stageStartFen,
			orientation,
			moves: [ ...currentPgnMoves ],
			startingComment: initialStartingComment,
			startingShapes: initialStartingShapes,
		} );
	}

	return stages;
}
