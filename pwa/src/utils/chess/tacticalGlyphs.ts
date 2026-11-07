import {
	Chess,
	makeSquare,
	attacks,
	type Square,
	type Color,
} from 'chessops';
import { parseFen } from 'chessops/fen';
import type { Key, BoardGlyph, MoveJudgement } from 'eg-chessboard';

export const PIECE_VALUES: Record<string, number> = {
	pawn: 1,
	knight: 3,
	bishop: 3,
	rook: 5,
	queen: 9,
	king: 1000,
};

export interface TacticalAnalysisResult {
	undefendedSquares: Key[];
	pinnedSquares: Key[];
	isKingInCheck: boolean;
	hasMajorThreat: boolean;
}

/**
 * Détecte les pièces d'une couleur clouées devant leur Roi.
 *
 * @param pos   Instance Chess de chessops
 * @param color Couleur des pièces à analyser ('white' | 'black')
 * @return Tableau des cases des pièces clouées
 */
export function detectPinnedPieces(
	pos: Chess,
	color: 'white' | 'black'
): Key[] {
	const kingSquare = pos.board.kingOf( color );
	if ( kingSquare === undefined ) {
		return [];
	}

	const ctx = pos.ctx();
	const friendlyPieces = pos.board[ color ];
	const pinnedSet = ctx.blockers.intersect( friendlyPieces );
	const keys: Key[] = [];

	for ( const sq of pinnedSet ) {
		keys.push( makeSquare( sq ) as Key );
	}
	return keys;
}

/**
 * Détecte les pièces d'une couleur attaquées et non défendues
 * (ou attaquées par une pièce adverse de moindre valeur, ou sous-défendues).
 *
 * @param pos   Instance Chess de chessops
 * @param color Couleur des pièces à analyser ('white' | 'black')
 * @return Tableau des cases des pièces vulnérables
 */
export function detectUndefendedPieces(
	pos: Chess,
	color: 'white' | 'black'
): Key[] {
	const enemyColor: Color = color === 'white' ? 'black' : 'white';
	const undefended: Key[] = [];

	// Map de l'attaquant le plus faible et du nombre d'attaquants adverses sur chaque case
	const enemyAttacksMap = new Map<
		Square,
		{ minAttackerValue: number; attackersCount: number }
	>();

	for ( const [ sq, piece ] of pos.board ) {
		if ( piece.color === enemyColor ) {
			const pieceAttacks = attacks( piece, sq, pos.board.occupied );
			const val = PIECE_VALUES[ piece.role ] || 1;
			for ( const targetSq of pieceAttacks ) {
				const existing = enemyAttacksMap.get( targetSq );
				if ( existing ) {
					existing.attackersCount++;
					if ( val < existing.minAttackerValue ) {
						existing.minAttackerValue = val;
					}
				} else {
					enemyAttacksMap.set( targetSq, {
						minAttackerValue: val,
						attackersCount: 1,
					} );
				}
			}
		}
	}

	// Map des défenseurs amicaux sur chaque case
	const friendlyDefendersMap = new Map<Square, number>();
	for ( const [ sq, piece ] of pos.board ) {
		if ( piece.color === color ) {
			const pieceDefends = attacks( piece, sq, pos.board.occupied );
			for ( const targetSq of pieceDefends ) {
				friendlyDefendersMap.set(
					targetSq,
					( friendlyDefendersMap.get( targetSq ) || 0 ) + 1
				);
			}
		}
	}

	// Évaluer chaque pièce amie (hors Roi)
	for ( const [ sq, piece ] of pos.board ) {
		if ( piece.color === color && piece.role !== 'king' ) {
			const enemyInfo = enemyAttacksMap.get( sq );
			if ( enemyInfo ) {
				const pieceValue = PIECE_VALUES[ piece.role ] || 1;
				const defenders = friendlyDefendersMap.get( sq ) || 0;

				const isHanging = defenders === 0;
				const isAttackedByLesser =
					enemyInfo.minAttackerValue < pieceValue;
				const isOutnumbered = enemyInfo.attackersCount > defenders;

				if ( isHanging || isAttackedByLesser || isOutnumbered ) {
					undefended.push( makeSquare( sq ) as Key );
				}
			}
		}
	}

	return undefended;
}

/**
 * Analyse tactique complète sur une position (FEN).
 *
 * @param fen   Position au format FEN
 * @param color Couleur du joueur à analyser
 */
export function analyzePositionTactics(
	fen: string,
	color: 'white' | 'black'
): TacticalAnalysisResult {
	const setupRes = parseFen( fen );
	if ( ! setupRes.isOk ) {
		return {
			undefendedSquares: [],
			pinnedSquares: [],
			isKingInCheck: false,
			hasMajorThreat: false,
		};
	}

	const posRes = Chess.fromSetup( setupRes.value );
	if ( ! posRes.isOk ) {
		return {
			undefendedSquares: [],
			pinnedSquares: [],
			isKingInCheck: false,
			hasMajorThreat: false,
		};
	}

	const pos = posRes.value;
	const isKingInCheck = pos.isCheck();
	const pinnedSquares = detectPinnedPieces( pos, color );
	const undefendedSquares = detectUndefendedPieces( pos, color );

	// Détermine si une menace majeure existe (Dame, Tour, Fou, Cavalier non défendu ou Roi en échec)
	let hasMajorThreat = isKingInCheck;
	if ( ! hasMajorThreat && undefendedSquares.length > 0 ) {
		for ( const sqKey of undefendedSquares ) {
			const sqIdx = Array.from( pos.board ).find(
				( [ s ] ) => makeSquare( s ) === sqKey
			);
			if ( sqIdx ) {
				const piece = sqIdx[ 1 ];
				if ( piece && ( PIECE_VALUES[ piece.role ] || 0 ) >= 3 ) {
					hasMajorThreat = true;
					break;
				}
			}
		}
	}

	return {
		undefendedSquares,
		pinnedSquares,
		isKingInCheck,
		hasMajorThreat,
	};
}

/**
 * Classifie la perte de chances de gain (diff) en jugement de coup.
 *
 * @param diff        Perte de chances de gain en pourcentage (0..100)
 * @param isMissedWin Indique si un mat a été manqué
 */
export function classifyMoveDiff(
	diff: number,
	isMissedWin = false
): MoveJudgement {
	if ( isMissedWin ) {
		return 'missed_win';
	}
	if ( diff <= 1.5 ) {
		return 'best';
	}
	if ( diff <= 7.0 ) {
		return 'excellent';
	}
	if ( diff <= 15.0 ) {
		return 'good';
	}
	if ( diff <= 25.0 ) {
		return 'inaccuracy';
	}
	if ( diff <= 40.0 ) {
		return 'mistake';
	}
	return 'blunder';
}

/**
 * Convertit un MoveJudgement en glyphe visuel d'échiquier.
 *
 * @param judgement Jugement qualitatif du coup
 */
export function judgementToGlyph( judgement: MoveJudgement ): BoardGlyph {
	switch ( judgement ) {
		case 'brilliant':
			return '!!';
		case 'best':
		case 'excellent':
		case 'good':
			return '!';
		case 'inaccuracy':
			return '?!';
		case 'mistake':
			return '?';
		case 'blunder':
		case 'missed_win':
			return '??';
	}
}
