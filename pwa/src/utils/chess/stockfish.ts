import {
	getNodesForElo,
	computeEvalBarPercentage,
	validateFen,
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

export {
	getNodesForElo,
	computeEvalBarPercentage,
	validateFen,
	type StockfishEvaluation,
	type EngineStatus,
};
