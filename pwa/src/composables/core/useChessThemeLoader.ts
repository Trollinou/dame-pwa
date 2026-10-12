import type { PieceSet } from 'eg-chessboard';

const loadedPieceSets = new Set< PieceSet >();

const pieceSetImportMap: Record< PieceSet, () => Promise< unknown > > = {
	cburnett: () => import( 'eg-chessboard/pieces/cburnett.css' ),
	merida: () => import( 'eg-chessboard/pieces/merida.css' ),
	alpha: () => import( 'eg-chessboard/pieces/alpha.css' ),
	cardinal: () => import( 'eg-chessboard/pieces/cardinal.css' ),
	dubrovny: () => import( 'eg-chessboard/pieces/dubrovny.css' ),
	fantasy: () => import( 'eg-chessboard/pieces/fantasy.css' ),
	firi: () => import( 'eg-chessboard/pieces/firi.css' ),
	maestro: () => import( 'eg-chessboard/pieces/maestro.css' ),
	tatiana: () => import( 'eg-chessboard/pieces/tatiana.css' ),
	staunty: () => import( 'eg-chessboard/pieces/staunty.css' ),
};

/**
 * Charge à la demande la feuille de style CSS d'un jeu de pièces spécifique.
 * @param pieceSet
 */
export async function loadPieceSetStyle( pieceSet: PieceSet ): Promise< void > {
	if ( loadedPieceSets.has( pieceSet ) ) {
		return;
	}

	const importer = pieceSetImportMap[ pieceSet ];
	if ( importer ) {
		try {
			await importer();
			loadedPieceSets.add( pieceSet );
		} catch ( error ) {
			console.warn(
				`[useChessThemeLoader] Erreur lors du chargement du jeu de pièces ${ pieceSet }:`,
				error
			);
		}
	}
}

/**
 * Précharge l'intégralité des jeux de pièces disponibles.
 * Utilisé principalement dans l'interface de personnalisation du profil.
 */
export async function preloadAllPieceSets(): Promise< void > {
	const allSets = Object.keys( pieceSetImportMap ) as PieceSet[];
	await Promise.all( allSets.map( ( set ) => loadPieceSetStyle( set ) ) );
}
