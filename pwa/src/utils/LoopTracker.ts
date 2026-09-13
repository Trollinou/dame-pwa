/**
 * Utilitaires pour le suivi de parcours en boucle fermée (Tour complet / Winding Number / 4 Quadrants).
 */

export interface Coords {
	x: number;
	y: number;
}

export interface LoopMoveResult {
	isFinished: boolean;
	totalAngleDeg: number;
	rotations: number;
	progressPercent: number;
}

export function squareToCoords( sq?: string ): Coords | null {
	if ( ! sq || typeof sq !== 'string' || sq.length < 2 ) {
		return null;
	}
	const file = sq[ 0 ].toLowerCase();
	const rank = parseInt( sq[ 1 ], 10 );
	if ( file < 'a' || file > 'h' || isNaN( rank ) || rank < 1 || rank > 8 ) {
		return null;
	}
	return {
		x: file.charCodeAt( 0 ) - 'a'.charCodeAt( 0 ) + 1,
		y: rank,
	};
}

export function extractOpponentPieceSquare(
	fen: string,
	playerColor: 'white' | 'black'
): string | null {
	if ( ! fen || typeof fen !== 'string' ) {
		return null;
	}
	const placement = fen.trim().split( ' ' )[ 0 ];
	const rows = placement.split( '/' );
	if ( rows.length !== 8 ) {
		return null;
	}

	const isOpponentChar = ( ch: string ) => {
		if ( playerColor === 'white' ) {
			return [ 'k', 'q', 'r', 'b', 'n', 'p' ].includes( ch );
		}
		return [ 'K', 'Q', 'R', 'B', 'N', 'P' ].includes( ch );
	};

	for ( let rowIndex = 0; rowIndex < 8; rowIndex++ ) {
		const row = rows[ rowIndex ];
		const rank = 8 - rowIndex;
		let colIndex = 0;

		for ( let i = 0; i < row.length; i++ ) {
			const ch = row[ i ];
			if ( ch >= '1' && ch <= '8' ) {
				colIndex += parseInt( ch, 10 );
			} else {
				if ( isOpponentChar( ch ) ) {
					const file = String.fromCharCode(
						'a'.charCodeAt( 0 ) + colIndex
					);
					return `${ file }${ rank }`;
				}
				colIndex++;
			}
		}
	}
	return null;
}

export class LoopTracker {
	public targetSquare: string;
	public startSquare: string;
	public targetCoords: Coords;
	public currentSquare: string;
	public movesCount: number;
	public totalAngle: number;
	public lastAngle: number;
	public quadrantsVisited: Set< number >;

	constructor( targetSquare: string, startSquare: string ) {
		this.targetSquare = targetSquare.toLowerCase();
		this.startSquare = startSquare.toLowerCase();
		this.targetCoords = squareToCoords( this.targetSquare ) || {
			x: 4,
			y: 5,
		};
		this.currentSquare = this.startSquare;
		this.movesCount = 0;
		this.totalAngle = 0;
		this.lastAngle = this.getAngleFromTarget( this.startSquare );
		this.quadrantsVisited = new Set< number >();

		const initialQuadrant = this.getQuadrant( this.startSquare );
		if ( initialQuadrant > 0 ) {
			this.quadrantsVisited.add( initialQuadrant );
		}
	}

	public getAngleFromTarget( sq: string ): number {
		const coords = squareToCoords( sq );
		if ( ! coords ) {
			return 0;
		}
		const dx = coords.x - this.targetCoords.x;
		const dy = coords.y - this.targetCoords.y;
		return Math.atan2( dy, dx );
	}

	public getQuadrant( sq: string ): number {
		const coords = squareToCoords( sq );
		if ( ! coords ) {
			return 0;
		}
		const dx = coords.x - this.targetCoords.x;
		const dy = coords.y - this.targetCoords.y;

		if ( dx >= 0 && dy > 0 ) return 1;
		if ( dx < 0 && dy >= 0 ) return 2;
		if ( dx <= 0 && dy < 0 ) return 3;
		if ( dx > 0 && dy <= 0 ) return 4;
		return 0;
	}

	public onMove( toSquare: string ): LoopMoveResult {
		const sq = toSquare.toLowerCase();
		const newAngle = this.getAngleFromTarget( sq );
		let delta = newAngle - this.lastAngle;

		while ( delta > Math.PI ) delta -= 2 * Math.PI;
		while ( delta < -Math.PI ) delta += 2 * Math.PI;

		this.totalAngle += delta;
		this.lastAngle = newAngle;
		this.currentSquare = sq;
		this.movesCount++;

		const quadrant = this.getQuadrant( sq );
		if ( quadrant > 0 ) {
			this.quadrantsVisited.add( quadrant );
		}

		const rotations = Math.abs( this.totalAngle ) / ( 2 * Math.PI );
		const hasFullTurn = rotations >= 0.95;
		const hasAllQuadrants = this.quadrantsVisited.size >= 4;
		const isAtStart = sq === this.startSquare;
		const isFinished =
			hasFullTurn &&
			hasAllQuadrants &&
			isAtStart &&
			this.movesCount >= 4;

		const progressPercent = Math.min(
			100,
			Math.round(
				( Math.min( rotations, 1 ) * 0.7 +
					( this.quadrantsVisited.size / 4 ) * 0.3 ) *
					100
			)
		);

		return {
			isFinished,
			totalAngleDeg: Math.round( ( this.totalAngle * 180 ) / Math.PI ),
			rotations,
			progressPercent: isFinished ? 100 : progressPercent,
		};
	}

	public reset(): void {
		this.currentSquare = this.startSquare;
		this.movesCount = 0;
		this.totalAngle = 0;
		this.lastAngle = this.getAngleFromTarget( this.startSquare );
		this.quadrantsVisited.clear();

		const initialQuadrant = this.getQuadrant( this.startSquare );
		if ( initialQuadrant > 0 ) {
			this.quadrantsVisited.add( initialQuadrant );
		}
	}
}
