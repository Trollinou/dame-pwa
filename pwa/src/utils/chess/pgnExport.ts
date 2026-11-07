/**
 * Utilitaire de formatage et d'enrichissement des métadonnées PGN (Seven Tag Roster + entraînement).
 */

export interface PgnExportOptions {
	pgn?: string;
	event?: string;
	site?: string;
	date?: string; // Format YYYY.MM.DD
	round?: string;
	white?: string;
	black?: string;
	result?: string; // '1-0' | '0-1' | '1/2-1/2' | '*'
	whiteElo?: number | string;
	blackElo?: number | string;
	variant?: string;
	termination?: string;
	annotator?: string;
	takebacks?: number;
	hints?: number;
	initialFen?: string;
}

/**
 * Formate une date en notation standard PGN YYYY.MM.DD.
 * @param d Date à formater (par défaut date courante).
 * @return Date formatée sous forme YYYY.MM.DD.
 */
export function formatPgnDate( d: Date = new Date() ): string {
	const year = d.getFullYear();
	const month = String( d.getMonth() + 1 ).padStart( 2, '0' );
	const day = String( d.getDate() ).padStart( 2, '0' );
	return `${ year }.${ month }.${ day }`;
}

/**
 * Sépare les tags existants du corps des coups d'un PGN.
 * @param rawPgn Chaîne PGN brute avec ou sans en-têtes.
 * @return Objet contenant les tags extraits et le corps des coups.
 */
export function parsePgnComponents( rawPgn: string ): {
	tags: Record< string, string >;
	movetext: string;
} {
	const tags: Record< string, string > = {};
	const lines = ( rawPgn || '' ).replace( /\r\n/g, '\n' ).split( '\n' );
	const moveLines: string[] = [];
	let parsingHeaders = true;

	for ( const line of lines ) {
		const trimmed = line.trim();
		if ( parsingHeaders ) {
			const headerMatch = trimmed.match( /^\[([A-Za-z0-9_]+)\s+"(.*)"\]$/ );
			if ( headerMatch ) {
				tags[ headerMatch[ 1 ] ] = headerMatch[ 2 ];
				continue;
			}
			if ( trimmed === '' ) {
				// Ligne vide après les en-têtes
				continue;
			}
			// Dès qu'on rencontre une ligne non-header non-vide, on passe au corps des coups
			parsingHeaders = false;
		}
		moveLines.push( line );
	}

	const movetext = moveLines.join( ' ' ).replace( /\s+/g, ' ' ).trim();
	return { tags, movetext };
}

/**
 * Génère un PGN complet normalisé avec Seven Tag Roster et métadonnées d'entraînement.
 * @param options Options d'export et d'enrichissement du PGN.
 * @return PGN complet sous forme de chaîne avec métadonnées et corps des coups.
 */
export function formatExportPgn( options: PgnExportOptions ): string {
	const { tags: existingTags, movetext: rawMovetext } = parsePgnComponents(
		options.pgn || ''
	);

	// Déterminer le résultat (priorité : options.result > existingTags.Result > détection en fin de texte > '*')
	let finalResult = options.result || existingTags.Result;
	if ( ! finalResult ) {
		const endResultMatch = rawMovetext.match( /(1-0|0-1|1\/2-1\/2|\*)$/ );
		finalResult = endResultMatch ? endResultMatch[ 1 ] : '*';
	}

	// Nettoyer le corps des coups en retirant l'ancien résultat s'il était présent
	let cleanMoves = rawMovetext.replace( /(1-0|0-1|1\/2-1\/2|\*)$/, '' ).trim();
	if ( cleanMoves && finalResult ) {
		cleanMoves = `${ cleanMoves } ${ finalResult }`;
	} else if ( ! cleanMoves ) {
		cleanMoves = finalResult;
	}

	const event = options.event || existingTags.Event || "Partie d'échecs";
	const site = options.site || existingTags.Site || 'DAME PWA';
	const date = options.date || existingTags.Date || formatPgnDate();
	const round = options.round || existingTags.Round || '1';
	const white = options.white || existingTags.White || 'Joueur';
	const black = options.black || existingTags.Black || 'Adversaire';

	// Construction ordonnée des en-têtes
	const headerEntries: Array< [ string, string ] > = [
		[ 'Event', event ],
		[ 'Site', site ],
		[ 'Date', date ],
		[ 'Round', round ],
		[ 'White', white ],
		[ 'Black', black ],
		[ 'Result', finalResult ],
	];

	// Elo
	const whiteElo = options.whiteElo ?? existingTags.WhiteElo;
	if ( whiteElo !== undefined && whiteElo !== '' ) {
		headerEntries.push( [ 'WhiteElo', String( whiteElo ) ] );
	}
	const blackElo = options.blackElo ?? existingTags.BlackElo;
	if ( blackElo !== undefined && blackElo !== '' ) {
		headerEntries.push( [ 'BlackElo', String( blackElo ) ] );
	}

	// Variant
	const variant = options.variant || existingTags.Variant || 'Standard';
	headerEntries.push( [ 'Variant', variant ] );

	// Position personnalisée
	const initialFen = options.initialFen || existingTags.FEN;
	if ( initialFen && initialFen !== 'start' ) {
		headerEntries.push( [ 'SetUp', '1' ] );
		headerEntries.push( [ 'FEN', initialFen ] );
	}

	// Métadonnées d'arbitrage et d'entraînement
	const termination = options.termination || existingTags.Termination;
	if ( termination ) {
		headerEntries.push( [ 'Termination', termination ] );
	}
	const annotator = options.annotator || existingTags.Annotator;
	if ( annotator ) {
		headerEntries.push( [ 'Annotator', annotator ] );
	}

	const takebacks = options.takebacks ?? existingTags.Takebacks;
	if ( takebacks !== undefined ) {
		headerEntries.push( [ 'Takebacks', String( takebacks ) ] );
	}
	const hints = options.hints ?? existingTags.Hints;
	if ( hints !== undefined ) {
		headerEntries.push( [ 'Hints', String( hints ) ] );
	}

	const headerLines = headerEntries.map(
		( [ key, val ] ) => `[${ key } "${ val.replace( /"/g, '\\"' ) }"]`
	);

	return `${ headerLines.join( '\n' ) }\n\n${ cleanMoves }`.trim();
}
