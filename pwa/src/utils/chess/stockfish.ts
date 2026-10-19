import {
	getNodesForElo,
	computeEvalBarPercentage,
	validateFen,
	normalizePgn,
	type StockfishEvaluation,
	type EngineStatus,
} from 'eg-chessboard';

/**
 * Résout les URLs des binaires Stockfish 19 WebAssembly selon l'environnement (Dev / Prod WordPress).
 */
export function getStockfishUrls(): { workerUrl: string; wasmUrl: string } {
	if ( typeof window === 'undefined' ) {
		return {
			workerUrl: '/stockfish/stockfish.js',
			wasmUrl: '/stockfish/stockfish.wasm',
		};
	}
	if ( import.meta.env.DEV ) {
		return {
			workerUrl: '/stockfish/stockfish.js',
			wasmUrl: '/stockfish/stockfish.wasm',
		};
	}
	const base = import.meta.env.BASE_URL || './';
	return {
		workerUrl: new URL(
			`${ base }stockfish/stockfish.js`,
			window.location.href
		).href,
		wasmUrl: new URL(
			`${ base }stockfish/stockfish.wasm`,
			window.location.href
		).href,
	};
}

/**
 * Formate le score d'évaluation pour l'affichage visuel (+1.2, -0.8, #2, etc.)
 *
 * @param evaluation Évaluation Stockfish ou null
 */
export function formatEvaluationScore(
	evaluation: StockfishEvaluation | null
): string {
	if ( ! evaluation ) {
		return '0.0';
	}
	if ( evaluation.scoreType === 'mate' ) {
		const prefix = evaluation.scoreValue > 0 ? '+M' : '-M';
		return `${ prefix }${ Math.abs( evaluation.scoreValue ) }`;
	}
	const cpValue = evaluation.whiteScoreValue / 100;
	if ( cpValue > 0 ) {
		return `+${ cpValue.toFixed( 1 ) }`;
	}
	return cpValue.toFixed( 1 );
}

/**
 * Interface pour les coups détaillés retournés par l'historique du composant d'échiquier.
 */
export interface HistoryMoveVerbose {
	san?: string;
	from?: string;
	to?: string;
	color?: string;
	promotion?: string;
	piece?: string;
}

/**
 * Normalise les coups de roque pour le protocole UCI de Stockfish.
 *
 * Dans eg-chessboard (via chessops), les roques utilisent la case de destination de la tour (e1a1, e8a8, e1h1, e8h8).
 * Le protocole UCI de Stockfish (échecs standards) impose la case de destination du Roi (e1c1, e8c8, e1g1, e8g8).
 * Sans cette normalisation, Stockfish rejette le coup comme illégal ("Illegal move e8a8") et le moteur plante.
 *
 * @param api Instance BoardCore ou objet possédant getHistory(verbose)
 */
export function normalizeCastlingMoves( api: unknown ): void {
	if (
		! api ||
		typeof ( api as { getHistory?: unknown } ).getHistory !== 'function'
	) {
		return;
	}
	try {
		const history = (
			api as { getHistory: ( _verbose?: boolean ) => unknown[] }
		 ).getHistory( true );
		if ( Array.isArray( history ) ) {
			for ( const item of history ) {
				if ( ! item || typeof item !== 'object' ) {
					continue;
				}
				const move = item as HistoryMoveVerbose;
				if ( ! move.san ) {
					continue;
				}
				const san = move.san.trim();
				const isWhite =
					move.color === 'w' ||
					move.color === 'white' ||
					move.from === 'e1';
				if ( san.startsWith( 'O-O-O' ) || san.startsWith( '0-0-0' ) ) {
					move.to = isWhite ? 'c1' : 'c8';
				} else if (
					san.startsWith( 'O-O' ) ||
					san.startsWith( '0-0' )
				) {
					move.to = isWhite ? 'g1' : 'g8';
				}
			}
		}
	} catch ( err ) {
		console.warn( 'Erreur lors de la normalisation des roques UCI:', err );
	}
}

export {
	getNodesForElo,
	computeEvalBarPercentage,
	validateFen,
	normalizePgn,
	type StockfishEvaluation,
	type EngineStatus,
};
