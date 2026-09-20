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
import type { DrawShape } from 'eg-chessboard';
import { getActiveColorFromFen } from './fenUtils';
import {
	toFrenchNotation,
	formatMoveWithFrenchSan,
	extractShapesAndComment,
	shuffleArray,
} from './chessNotation';

export interface PosiPlanMoveStep {
	san: string;
	comment: string;
	shapes: DrawShape[];
	fenAfter: string;
}

export interface PosiPlanVariantChoice {
	san: string;
	label: string;
	isMain: boolean;
	explanation: string;
	variantMoves: PosiPlanMoveStep[];
	startingShapes?: DrawShape[];
}

export interface PosiPlanQcmChoice {
	san: string;
	label: string;
	isCorrect: boolean;
	explanation: string;
}

export interface PosiPlanPgnStage {
	type: 'pgn';
	fenDepart: string;
	orientation: 'white' | 'black';
	moves: PosiPlanMoveStep[];
	startingComment?: string;
	startingShapes?: DrawShape[];
}

export interface PosiPlanQcmStage {
	type: 'qcm';
	fen: string;
	orientation: 'white' | 'black';
	shapes: DrawShape[];
	question: string;
	choices: PosiPlanQcmChoice[];
}

export type PosiPlanStage = PosiPlanPgnStage | PosiPlanQcmStage;

export interface PosiPlanData {
	initialFen: string;
	orientation: 'white' | 'black';
	initialShapes: DrawShape[];
	initialComment: string;
	initialChoices: PosiPlanVariantChoice[];
	mainBranchStages: PosiPlanStage[];
}

export {
	toFrenchNotation,
	formatMoveWithFrenchSan,
	extractShapesAndComment,
	shuffleArray,
};

/**
 * Extrait la ligne principale d'une sous-variante sous forme de liste de coups PosiPlanMoveStep.
 * @param startPos
 * @param variantNode
 */
function traceVariantMoves(
	startPos: Chess,
	variantNode: ChildNode< PgnNodeData >
): PosiPlanMoveStep[] {
	const moves: PosiPlanMoveStep[] = [];
	const pos = startPos.clone();

	let current: ChildNode< PgnNodeData > | undefined = variantNode;

	while ( current ) {
		const parsed = extractShapesAndComment( current.data?.comments );
		const parsedMove = parseSan( pos, current.data.san );
		if ( parsedMove ) {
			makeSanAndPlay( pos, parsedMove );
		}

		moves.push( {
			san: current.data.san,
			comment: parsed.comment,
			shapes: parsed.shapes,
			fenAfter: makeFen( pos.toSetup() ),
		} );

		current =
			current.children.length > 0 ? current.children[ 0 ] : undefined;
	}

	return moves;
}

/**
 * Analyse une étude PGN complète Posi'Plan.
 * - Extrait le choix initial à 3 branches (1 branche principale + 2 variantes explorables).
 * - Découpe la branche principale en étapes séquentielles (PGN / QCM).
 * @param rawPgn
 * @param defaultConsigne
 */
export function parsePosiPlanPgn(
	rawPgn: string,
	defaultConsigne?: string
): PosiPlanData {
	const defaultFen =
		'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

	const fallbackResult: PosiPlanData = {
		initialFen: defaultFen,
		orientation: 'white',
		initialShapes: [],
		initialComment: '',
		initialChoices: [],
		mainBranchStages: [],
	};

	if ( ! rawPgn || typeof rawPgn !== 'string' || ! rawPgn.trim() ) {
		return fallbackResult;
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
		console.warn( 'Erreur parsing PGN PosiPlan:', e );
		return {
			...fallbackResult,
			initialFen,
			orientation,
		};
	}

	if ( ! games || games.length === 0 ) {
		return {
			...fallbackResult,
			initialFen,
			orientation,
		};
	}

	const game = games[ 0 ];
	const root = game.moves;

	// Extraction du commentaire et des formes de la position de départ
	let initialStartingComment = '';
	let initialStartingShapes: DrawShape[] = [];
	if ( game.comments && game.comments.length > 0 ) {
		const parsedInit = extractShapesAndComment( game.comments );
		initialStartingComment = parsedInit.comment;
		initialStartingShapes = parsedInit.shapes;
	}
	if ( ! initialStartingComment && initialStartingShapes.length === 0 ) {
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

	if ( root.children.length === 0 ) {
		return {
			initialFen,
			orientation,
			initialShapes: initialStartingShapes,
			initialComment: initialStartingComment,
			initialChoices: [],
			mainBranchStages: [],
		};
	}

	// 2. Choix initial (Branche principale + Variantes alternatives à explorer)
	const initialChoices: PosiPlanVariantChoice[] = [];
	const mainChild = root.children[ 0 ];
	const mainParsed = extractShapesAndComment( mainChild.data?.comments );

	initialChoices.push( {
		san: mainChild.data.san,
		label: formatMoveWithFrenchSan( currentPos, mainChild.data.san ),
		isMain: true,
		explanation: mainParsed.comment || "C'est le bon plan !",
		variantMoves: [],
		startingShapes: mainParsed.shapes,
	} );

	for ( let i = 1; i < root.children.length; i++ ) {
		const vChild = root.children[ i ];
		const vParsed = extractShapesAndComment( vChild.data?.comments );
		const variantMoves = traceVariantMoves( currentPos, vChild );

		initialChoices.push( {
			san: vChild.data.san,
			label: formatMoveWithFrenchSan( currentPos, vChild.data.san ),
			isMain: false,
			explanation: vParsed.comment || 'Variante alternative.',
			variantMoves,
			startingShapes: vParsed.shapes,
		} );
	}

	// 3. Découpage de la branche principale en étapes séquentielles
	const mainBranchStages: PosiPlanStage[] = [];
	const mainPos = currentPos.clone();

	// Jouer le premier coup de la branche principale
	const parsedFirstMove = parseSan( mainPos, mainChild.data.san );
	if ( parsedFirstMove ) {
		makeSanAndPlay( mainPos, parsedFirstMove );
	}

	let currentPgnMoves: PosiPlanMoveStep[] = [];
	let stageStartFen = makeFen( mainPos.toSetup() );
	let stageStartingComment = mainParsed.comment;
	let stageStartingShapes = mainParsed.shapes;

	let node: Node< PgnNodeData > | undefined = mainChild;

	while ( node ) {
		if ( node.children.length === 0 ) {
			if ( currentPgnMoves.length > 0 ) {
				mainBranchStages.push( {
					type: 'pgn',
					fenDepart: stageStartFen,
					orientation,
					moves: [ ...currentPgnMoves ],
					startingComment: stageStartingComment,
					startingShapes: stageStartingShapes,
				} );
				currentPgnMoves = [];
				stageStartingComment = '';
				stageStartingShapes = [];
			}
			break;
		}

		if ( node.children.length > 1 ) {
			// Clôture des coups PGN précédents
			if ( currentPgnMoves.length > 0 ) {
				mainBranchStages.push( {
					type: 'pgn',
					fenDepart: stageStartFen,
					orientation,
					moves: [ ...currentPgnMoves ],
					startingComment: stageStartingComment,
					startingShapes: stageStartingShapes,
				} );
				currentPgnMoves = [];
				stageStartingComment = '';
				stageStartingShapes = [];
			}

			const nodeComments = isChildNode( node )
				? node.data?.comments
				: undefined;
			const parentParsed = extractShapesAndComment( nodeComments );
			const nextMainChild: ChildNode< PgnNodeData > = node.children[ 0 ];
			const nextMainParsed = extractShapesAndComment(
				nextMainChild.data?.comments
			);

			const qcmChoices: PosiPlanQcmChoice[] = [];

			// Bon coup sur la ligne principale
			qcmChoices.push( {
				san: nextMainChild.data.san,
				label: formatMoveWithFrenchSan(
					mainPos,
					nextMainChild.data.san
				),
				isCorrect: true,
				explanation:
					nextMainParsed.comment || "Super ! C'est le meilleur coup.",
			} );

			// Mauvais choix (variantes d'explication)
			for ( let v = 1; v < node.children.length; v++ ) {
				const varChild = node.children[ v ];
				const varParsed = extractShapesAndComment(
					varChild.data?.comments
				);
				qcmChoices.push( {
					san: varChild.data.san,
					label: formatMoveWithFrenchSan(
						mainPos,
						varChild.data.san
					),
					isCorrect: false,
					explanation:
						varParsed.comment || 'Mauvais choix ! Cherchez encore.',
				} );
			}

			mainBranchStages.push( {
				type: 'qcm',
				fen: makeFen( mainPos.toSetup() ),
				orientation: getActiveColorFromFen(
					makeFen( mainPos.toSetup() )
				),
				shapes: parentParsed.shapes,
				question:
					defaultConsigne || 'Quel est le meilleur coup suivant ?',
				choices: shuffleArray( qcmChoices ),
			} );

			// Jouer le coup validé
			const parsedMove = parseSan( mainPos, nextMainChild.data.san );
			if ( parsedMove ) {
				makeSanAndPlay( mainPos, parsedMove );
			}

			stageStartFen = makeFen( mainPos.toSetup() );
			currentPgnMoves = [];
			stageStartingComment = nextMainParsed.comment;
			stageStartingShapes = nextMainParsed.shapes;

			node = nextMainChild;
		} else {
			// Défilement normal de coup (ex: réponse de l'adversaire)
			const child: ChildNode< PgnNodeData > = node.children[ 0 ];
			const parsed = extractShapesAndComment( child.data?.comments );
			const parsedMove = parseSan( mainPos, child.data.san );
			if ( parsedMove ) {
				makeSanAndPlay( mainPos, parsedMove );
			}

			currentPgnMoves.push( {
				san: child.data.san,
				comment: parsed.comment,
				shapes: parsed.shapes,
				fenAfter: makeFen( mainPos.toSetup() ),
			} );

			node = child;
		}
	}

	if ( currentPgnMoves.length > 0 ) {
		mainBranchStages.push( {
			type: 'pgn',
			fenDepart: stageStartFen,
			orientation,
			moves: [ ...currentPgnMoves ],
			startingComment: stageStartingComment,
			startingShapes: stageStartingShapes,
		} );
	}

	return {
		initialFen,
		orientation,
		initialShapes: initialStartingShapes,
		initialComment: initialStartingComment,
		initialChoices,
		mainBranchStages,
	};
}
