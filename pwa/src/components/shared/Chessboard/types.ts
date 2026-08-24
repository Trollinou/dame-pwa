import type {
	BoardCore,
	StockfishConfig,
	Move,
	BoardMode,
	PieceSet,
	BoardTheme,
	DrawShape,
	Key,
} from 'eg-chessboard';

export interface ChessboardConfig {
	viewOnly?: boolean;
	orientation?: 'white' | 'black';
	coordinates?: boolean;
	autoCastling?: boolean;
	highlight?: {
		lastMove?: boolean;
		check?: boolean;
	};
	lastMove?: Key[];
	playerColor?: 'white' | 'black' | 'both';
	[ key: string ]: unknown;
}

export interface ChessboardProps {
	/**
	 * Position FEN initiale ou actuelle du plateau (ex: 'start' ou string FEN).
	 */
	fen?: string;

	/**
	 * Formes graphiques dessinées sur l'échiquier (flèches, cercles).
	 */
	shapes?: DrawShape[];

	/**
	 * Mode lecture seule (aucun coup déplaçable par l'utilisateur).
	 * Par défaut `true` pour les diagrammes et viewers d'apprentissage.
	 */
	viewOnly?: boolean;

	/**
	 * Orientation du plateau du point de vue des Blancs ou des Noirs.
	 * Par défaut `'white'`.
	 */
	orientation?: 'white' | 'black';

	/**
	 * Couleur des pièces jouables par l'utilisateur ('white' | 'black' | 'both').
	 */
	playerColor?: 'white' | 'black' | 'both';

	/**
	 * Mode global de fonctionnement de l'échiquier.
	 */
	mode?: BoardMode;

	/**
	 * Mise en surbrillance automatique du dernier coup joué.
	 */
	highlightLastMove?: boolean;

	/**
	 * Cases spécifiques à surligner pour le dernier coup (ex: ['e2', 'e4']).
	 */
	lastMove?: Key[];

	/**
	 * Affichage des coordonnées algébriques (a-h, 1-8).
	 */
	coordinates?: boolean;

	/**
	 * Activation du roque automatique.
	 */
	autoCastling?: boolean;

	/**
	 * Configuration complète de l'échiquier.
	 */
	boardConfig?: ChessboardConfig;

	/**
	 * Configuration spécifique du moteur Stockfish.
	 */
	stockfishConfig?: StockfishConfig;

	/**
	 * Permet d'activer rapidement Stockfish avec le mode Elo par défaut.
	 */
	stockfishEnabled?: boolean;

	/**
	 * Surcharge optionnelle du jeu de pièces (si omis, prend la valeur du store Pinia).
	 */
	pieceSet?: PieceSet;

	/**
	 * Surcharge optionnelle du thème de l'échiquier (si omis, prend la valeur du store Pinia).
	 */
	boardTheme?: BoardTheme;
}

export type ChessboardEmits = {
	( _e: 'board-created', _api: BoardCore ): void;
	( _e: 'move', _move: Move ): void;
	( _e: 'turn-change', _turn: 'white' | 'black', _ply: number ): void;
	( _e: 'check', _color: string ): void;
	( _e: 'checkmate', _color: string ): void;
	( _e: 'stalemate' ): void;
	( _e: 'draw' ): void;
	( _e: 'stockfish-hint', _move: string ): void;
	( _e: 'square-click', _square: string ): void;
	( _e: 'shapes-change', _shapes: DrawShape[] ): void;
	(
		_e: 'promotion',
		_detail: { from: string; to: string; promotedTo: string }
	): void;
};
