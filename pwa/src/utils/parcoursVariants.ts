import type { DrawShape, Key } from 'eg-chessboard';
import { LoopTracker } from './LoopTracker';

export interface ParcoursBoardApi {
	getPieces: () => Array< {
		color: string;
		role?: string;
		[ key: string ]: unknown;
	} >;
	isSquareAttacked: ( _square: Key, _color: 'white' | 'black' ) => boolean;
	setPosition?: ( _fen: string ) => void;
	setShapes?: ( _shapes: DrawShape[] ) => void;
	[ key: string ]: unknown;
}

export interface ParcoursMoveContext {
	from: Key;
	to: Key;
	fenDepart: string;
	couleurJoueur: 'white' | 'black';
	caseDepart: string;
	caseArrivee: string;
	shapes: DrawShape[];
	boardApi: ParcoursBoardApi;
	isLoop?: boolean;
	loopTracker?: LoopTracker | null;
}

export interface ParcoursMoveResult {
	valid: boolean;
	isFinished: boolean;
	errorMessage?: string;
	successMessage?: string;
}

export interface ParcoursVariant {
	id: string;
	name: string;
	getDefaultConsigne: (
		_caseArrivee: string,
		_couleurJoueur?: string,
		_isLoop?: boolean
	) => string;
	getPendingHint: ( _caseArrivee: string, _isLoop?: boolean ) => string;
	validateMove: ( _ctx: ParcoursMoveContext ) => ParcoursMoveResult;
}

function isRedSquare( square: string, shapes: DrawShape[] ): boolean {
	const sq = square.toLowerCase();
	return shapes.some(
		( s ) =>
			( s.brush === 'red' || s.brush === 'r' ) &&
			s.orig?.toLowerCase() === sq &&
			( ! s.dest || s.dest.toLowerCase() === sq )
	);
}

const standardVariant: ParcoursVariant = {
	id: 'standard',
	name: 'Parcours classique',
	getDefaultConsigne: ( caseArrivee ) =>
		caseArrivee
			? `Atteignez la case ${ caseArrivee.toUpperCase() } en évitant les cases rouges.`
			: "Rejoignez la case d'arrivée.",
	getPendingHint: ( caseArrivee ) =>
		caseArrivee
			? `Déplacez votre pièce jusqu'à la case ${ caseArrivee.toUpperCase() } en évitant les cases rouges.`
			: "Rejoignez la case d'arrivée verte.",
	validateMove: ( ctx ) => {
		if ( isRedSquare( ctx.to, ctx.shapes ) ) {
			return {
				valid: false,
				isFinished: false,
				errorMessage: 'Case interdite !',
			};
		}

		if (
			ctx.caseArrivee &&
			ctx.to.toLowerCase() === ctx.caseArrivee.toLowerCase()
		) {
			return {
				valid: true,
				isFinished: true,
				successMessage: 'Parcours réussi !',
			};
		}

		return {
			valid: true,
			isFinished: false,
		};
	},
};

const pacmanVariant: ParcoursVariant = {
	id: 'pacman',
	name: 'Pacman (Gourmand)',
	getDefaultConsigne: ( caseArrivee ) =>
		caseArrivee
			? `Capturez toutes les pièces adverses avant d'atteindre la case ${ caseArrivee.toUpperCase() }.`
			: "Capturez toutes les pièces adverses avant d'atteindre l'arrivée.",
	getPendingHint: ( caseArrivee ) =>
		caseArrivee
			? `Mangez toutes les pièces adverses avant d'atteindre la case verte ${ caseArrivee.toUpperCase() }.`
			: "Capturez toutes les pièces avant d'aller sur la case verte.",
	validateMove: ( ctx ) => {
		if ( isRedSquare( ctx.to, ctx.shapes ) ) {
			return {
				valid: false,
				isFinished: false,
				errorMessage: 'Case interdite !',
			};
		}

		if (
			ctx.caseArrivee &&
			ctx.to.toLowerCase() === ctx.caseArrivee.toLowerCase()
		) {
			const oppColorShort = ctx.couleurJoueur === 'white' ? 'b' : 'w';
			const allPieces = ctx.boardApi.getPieces();
			let hasOpponentPieces = false;
			allPieces.forEach( ( p ) => {
				if ( p.color === oppColorShort ) {
					hasOpponentPieces = true;
				}
			} );

			if ( hasOpponentPieces ) {
				return {
					valid: false,
					isFinished: false,
					errorMessage: 'Il reste des pièces à manger !',
				};
			}

			return {
				valid: true,
				isFinished: true,
				successMessage:
					'Parcours Pacman réussi ! Toutes les pièces ont été mangées.',
			};
		}

		return {
			valid: true,
			isFinished: false,
		};
	},
};

const stealthVariant: ParcoursVariant = {
	id: 'stealth',
	name: 'Pas vu, pas pris (Stealth)',
	getDefaultConsigne: ( caseArrivee, _couleurJoueur, isLoop ) =>
		isLoop || ! caseArrivee
			? 'Faites le tour complet de la pièce adverse sans vous faire repérer et revenez à votre case de départ.'
			: `Infiltrez la zone cible (${ caseArrivee.toUpperCase() }) sans passer par les cases surveillées par l'adversaire.`,
	getPendingHint: ( caseArrivee, isLoop ) =>
		isLoop || ! caseArrivee
			? 'Contournez la pièce adverse en restant hors de sa portée pour revenir à votre case de départ.'
			: `Évitez les cases surveillées par les pièces adverses pour atteindre ${ caseArrivee.toUpperCase() }.`,
	validateMove: ( ctx ) => {
		if ( isRedSquare( ctx.to, ctx.shapes ) ) {
			return {
				valid: false,
				isFinished: false,
				errorMessage: 'Case interdite !',
			};
		}

		const oppColor = ctx.couleurJoueur === 'white' ? 'black' : 'white';
		if ( ctx.boardApi.isSquareAttacked( ctx.to, oppColor ) ) {
			return {
				valid: false,
				isFinished: false,
				errorMessage: 'Vous avez été repéré !',
			};
		}

		if ( ctx.isLoop && ctx.loopTracker ) {
			const loopResult = ctx.loopTracker.onMove( ctx.to );
			if ( loopResult.isFinished ) {
				return {
					valid: true,
					isFinished: true,
					successMessage:
						'Tour complet réussi sans vous faire repérer ! Bravo.',
				};
			}
			return {
				valid: true,
				isFinished: false,
			};
		}

		if (
			ctx.caseArrivee &&
			ctx.to.toLowerCase() === ctx.caseArrivee.toLowerCase()
		) {
			return {
				valid: true,
				isFinished: true,
				successMessage: 'Infiltration réussie ! Bravo.',
			};
		}

		return {
			valid: true,
			isFinished: false,
		};
	},
};

const tracesVariant: ParcoursVariant = {
	id: 'traces',
	name: 'Traces (Qui a laissé ces traces ?)',
	getDefaultConsigne: () => 'Mais qui a bien pu laisser ces traces ?',
	getPendingHint: () =>
		"Observez les traces sur l'échiquier et sélectionnez la pièce correspondante ci-dessous.",
	validateMove: () => ( {
		valid: true,
		isFinished: true,
		successMessage: 'Bravo ! Vous avez identifié la bonne pièce.',
	} ),
};

export function removePieceFromSquareInFen(
	fen: string,
	square?: string
): string {
	if ( ! fen || ! square || square.length < 2 ) {
		return fen;
	}
	const sq = square.toLowerCase().trim();
	const file = sq[ 0 ];
	const rank = parseInt( sq[ 1 ], 10 );
	if ( file < 'a' || file > 'h' || isNaN( rank ) || rank < 1 || rank > 8 ) {
		return fen;
	}

	const colIndex = file.charCodeAt( 0 ) - 'a'.charCodeAt( 0 );
	const rowIndex = 8 - rank;

	const parts = fen.trim().split( ' ' );
	const rows = parts[ 0 ].split( '/' );
	if ( rows.length !== 8 ) {
		return fen;
	}

	const targetRow = rows[ rowIndex ];
	const expanded: string[] = [];
	for ( let i = 0; i < targetRow.length; i++ ) {
		const ch = targetRow[ i ];
		if ( ch >= '1' && ch <= '8' ) {
			const emptyCount = parseInt( ch, 10 );
			for ( let e = 0; e < emptyCount; e++ ) {
				expanded.push( '.' );
			}
		} else {
			expanded.push( ch );
		}
	}

	if ( expanded.length !== 8 ) {
		return fen;
	}

	expanded[ colIndex ] = '.';

	let newRow = '';
	let emptyCounter = 0;
	for ( let i = 0; i < 8; i++ ) {
		if ( expanded[ i ] === '.' ) {
			emptyCounter++;
		} else {
			if ( emptyCounter > 0 ) {
				newRow += emptyCounter.toString();
				emptyCounter = 0;
			}
			newRow += expanded[ i ];
		}
	}
	if ( emptyCounter > 0 ) {
		newRow += emptyCounter.toString();
	}

	rows[ rowIndex ] = newRow;
	parts[ 0 ] = rows.join( '/' );
	return parts.join( ' ' );
}

export type PieceRole = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

export function extractPieceTypeFromFen( fen: string ): PieceRole | null {
	if ( ! fen || typeof fen !== 'string' ) {
		return null;
	}
	const placement = fen.trim().split( ' ' )[ 0 ];
	for ( let i = 0; i < placement.length; i++ ) {
		const char = placement[ i ];
		if (
			[
				'k',
				'q',
				'r',
				'b',
				'n',
				'p',
				'K',
				'Q',
				'R',
				'B',
				'N',
				'P',
			].includes( char )
		) {
			return char.toLowerCase() as PieceRole;
		}
	}
	return null;
}

export function getPieceRoleLabel( role: string ): string {
	const labels: Record< string, string > = {
		k: 'Roi',
		q: 'Dame',
		r: 'Tour',
		b: 'Fou',
		n: 'Cavalier',
		p: 'Pion',
	};
	return labels[ role.toLowerCase() ] || 'Pièce';
}

const variantRegistry = new Map< string, ParcoursVariant >();
variantRegistry.set( 'standard', standardVariant );
variantRegistry.set( 'pacman', pacmanVariant );
variantRegistry.set( 'stealth', stealthVariant );
variantRegistry.set( 'traces', tracesVariant );

export function registerParcoursVariant( variant: ParcoursVariant ): void {
	variantRegistry.set( variant.id, variant );
}

export function getParcoursVariant( variantId?: string ): ParcoursVariant {
	const key = ( variantId || 'standard' ).toLowerCase().trim();
	return variantRegistry.get( key ) || standardVariant;
}
