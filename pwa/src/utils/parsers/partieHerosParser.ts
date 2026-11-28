import { Chess, parseSquare } from 'chessops';
import { parseFen, makeFen } from 'chessops/fen';
import {
	parsePgn,
	type Node,
	type ChildNode,
	type PgnNodeData,
	isChildNode,
} from 'chessops/pgn';
import type { DrawShape, Key } from 'eg-chessboard';
import { getActiveColorFromFen } from '@/utils/chess/fenUtils';

export interface PgnMoveStep {
	san: string;
	comment: string;
	shapes: DrawShape[];
	fenAfter: string;
	lastMove?: Key[];
}

export interface PgnStage {
	type: 'pgn';
	fenDepart: string;
	orientation: 'white' | 'black';
	moves: PgnMoveStep[];
	startingComment?: string;
	startingShapes?: DrawShape[];
	startingLastMove?: Key[];
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
	lastMove?: Key[];
}

export type PartieHerosStage = PgnStage | QcmStage;

import {
	toFrenchNotation,
	formatMoveWithFrenchSan,
	extractShapesAndComment,
	shuffleArray,
	playSanAndGetLastMove,
} from '@/utils/chess/chessNotation';

export {
	toFrenchNotation,
	formatMoveWithFrenchSan,
	extractShapesAndComment,
	shuffleArray,
};

/**
 * Mélange aléatoirement les choix d'un QCM (alias vers shuffleArray).
 */
export const shuffleChoices = shuffleArray;

/**
 * Vérifie si les annotations graphiques d'une position caractérisent un véritable choix QCM :
 * au moins 3 flèches de couleurs distinctes, chacune partant d'une case occupée par une pièce.
 * @param shapes
 * @param pos
 */
function hasValidQcmArrows( shapes: DrawShape[], pos: Chess ): boolean {
	const arrows = shapes.filter(
		( s ) => Boolean( s.orig && s.dest && s.orig !== s.dest )
	);
	if ( arrows.length < 3 ) {
		return false;
	}

	const allHaveOriginPiece = arrows.every( ( arrow ) => {
		const sq = parseSquare( arrow.orig );
		return sq !== undefined && pos.board.get( sq ) !== undefined;
	} );
	if ( ! allHaveOriginPiece ) {
		return false;
	}

	const distinctColors = new Set(
		arrows.map( ( arrow ) => arrow.brush || 'green' )
	);
	return distinctColors.size >= 3;
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
	let stageStartingLastMove: Key[] | undefined;
	let lastPlayedMove: Key[] | undefined;

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
					...( stageStartingLastMove
						? { startingLastMove: stageStartingLastMove }
						: {} ),
				} );
				currentPgnMoves = [];
				initialStartingComment = '';
				initialStartingShapes = [];
				stageStartingLastMove = undefined;
			}
			break;
		}

		const nodeComments = isChildNode( node )
			? node.data?.comments
			: undefined;
		const parentParsed = isChildNode( node )
			? extractShapesAndComment( nodeComments )
			: { comment: initialStartingComment, shapes: initialStartingShapes };
		const isQcmBranch =
			node.children.length > 1 &&
			hasValidQcmArrows( parentParsed.shapes, currentPos );

		if ( isQcmBranch ) {
			// Clôture de la séquence PGN précédente
			if ( currentPgnMoves.length > 0 ) {
				stages.push( {
					type: 'pgn',
					fenDepart: stageStartFen,
					orientation,
					moves: [ ...currentPgnMoves ],
					startingComment: initialStartingComment,
					startingShapes: initialStartingShapes,
					...( stageStartingLastMove
						? { startingLastMove: stageStartingLastMove }
						: {} ),
				} );
				currentPgnMoves = [];
				initialStartingComment = '';
				initialStartingShapes = [];
				stageStartingLastMove = undefined;
			}

			const mainChild: ChildNode< PgnNodeData > = node.children[ 0 ];
			const mainParsed = extractShapesAndComment(
				mainChild.data?.comments
			);

			const choices: QcmChoice[] = [];

			// 1. Coup principal (succès) avec description en français et notation SAN entre parenthèses
			choices.push( {
				san: mainChild.data.san,
				label: formatMoveWithFrenchSan(
					currentPos,
					mainChild.data.san
				),
				isCorrect: true,
				explanation:
					mainParsed.comment || "Super ! C'est le meilleur coup.",
			} );

			// 2. Variantes (erreurs avec explications dédiées)
			for ( let v = 1; v < node.children.length; v++ ) {
				const varChild = node.children[ v ];
				const varParsed = extractShapesAndComment(
					varChild.data?.comments
				);
				choices.push( {
					san: varChild.data.san,
					label: formatMoveWithFrenchSan(
						currentPos,
						varChild.data.san
					),
					isCorrect: false,
					explanation:
						varParsed.comment || 'Mauvais choix ! Cherche encore.',
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
				question: defaultConsigne || 'Joue comme un champion !',
				choices: shuffleChoices( choices ),
				...( lastPlayedMove ? { lastMove: lastPlayedMove } : {} ),
			} );

			// Avancer sur la ligne principale avec le bon coup joué dans le QCM
			lastPlayedMove = playSanAndGetLastMove(
				currentPos,
				mainChild.data.san
			);

			// La séquence PGN suivante repartira APRÈS le coup du QCM,
			// avec comme commentaire et formes de départ ceux du coup validé dans le QCM
			stageStartFen = makeFen( currentPos.toSetup() );
			currentPgnMoves = [];
			initialStartingComment = mainParsed.comment;
			initialStartingShapes = mainParsed.shapes;
			stageStartingLastMove = lastPlayedMove;

			node = mainChild;
		} else {
			// Défilement normal du coup de la ligne principale
			const child: ChildNode< PgnNodeData > = node.children[ 0 ];
			const parsed = extractShapesAndComment( child.data?.comments );
			const moveLastMove = playSanAndGetLastMove(
				currentPos,
				child.data.san
			);
			lastPlayedMove = moveLastMove;

			currentPgnMoves.push( {
				san: child.data.san,
				comment: parsed.comment,
				shapes: parsed.shapes,
				fenAfter: makeFen( currentPos.toSetup() ),
				...( moveLastMove ? { lastMove: moveLastMove } : {} ),
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
			...( stageStartingLastMove
				? { startingLastMove: stageStartingLastMove }
				: {} ),
		} );
	}

	return stages;
}
