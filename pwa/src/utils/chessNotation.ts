import { Chess } from 'chessops';
import { parseSan } from 'chessops/san';
import type { Key, DrawShape } from 'eg-chessboard';

/**
 * Noms des rôles de pièces en français (clé en anglais ou initiale FEN).
 */
export const ROLE_NAMES_FR: Record<string, string> = {
	pawn: 'Pion',
	knight: 'Cavalier',
	bishop: 'Fou',
	rook: 'Tour',
	queen: 'Dame',
	king: 'Roi',
	p: 'Pion',
	n: 'Cavalier',
	b: 'Fou',
	r: 'Tour',
	q: 'Dame',
	k: 'Roi',
};

/**
 * Initiales françaises des pièces (notation SAN).
 */
export const ROLE_LETTERS_FR: Record<string, string> = {
	pawn: '',
	knight: 'C',
	bishop: 'F',
	rook: 'T',
	queen: 'D',
	king: 'R',
	p: '',
	n: 'C',
	b: 'F',
	r: 'T',
	q: 'D',
	k: 'R',
};

/**
 * Rôles de pièces ayant le genre féminin en français (Tour, Dame).
 */
export const ROLE_FEMININE: Record<string, boolean> = {
	queen: true,
	rook: true,
	q: true,
	r: true,
};

/**
 * Correspondance entre caractère FEN minuscule et nom de rôle standard.
 */
export const CHAR_TO_ROLE: Record<string, 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'> = {
	p: 'pawn',
	n: 'knight',
	b: 'bishop',
	r: 'rook',
	q: 'queen',
	k: 'king',
};

/**
 * Correspondance entre nom de rôle standard et caractère FEN minuscule.
 */
export const ROLE_TO_CHAR: Record<string, string> = {
	pawn: 'p',
	knight: 'n',
	bishop: 'b',
	rook: 'r',
	queen: 'q',
	king: 'k',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * Palette de correspondance des codes de couleur Lichess/ChessBase vers les noms de brosses standard.
 */
export const PGN_BRUSH_MAP: Record<string, string> = {
	g: 'green',
	r: 'red',
	b: 'blue',
	y: 'yellow',
	c: 'green',
	o: 'yellow',
};

/**
 * Retourne le nom simple en français d'une pièce à partir de son rôle ou caractère.
 * Ex: 'n' -> 'Cavalier', 'rook' -> 'Tour'
 */
export function getPieceLabel(roleOrChar: string): string {
	if (!roleOrChar) return 'Pièce';
	const key = roleOrChar.toLowerCase();
	return ROLE_NAMES_FR[key] || 'Pièce';
}

/**
 * Retourne le nom complet d'une pièce en français avec accord en genre et en couleur.
 * Ex: ('r', 'white') -> 'Tour blanche', ('n', 'black') -> 'Cavalier noir'
 */
export function getPieceDisplayName(
	roleOrChar: string,
	color: 'white' | 'black' | 'w' | 'b'
): string {
	if (!roleOrChar) return '';
	const key = roleOrChar.toLowerCase();
	const name = getPieceLabel(key);
	const isFem = !!ROLE_FEMININE[key];
	const isWhite = color === 'white' || color === 'w';
	const colorAdjective = isWhite
		? (isFem ? 'blanche' : 'blanc')
		: (isFem ? 'noire' : 'noir');
	return `${name} ${colorAdjective}`;
}

/**
 * Nettoie et normalise une chaîne de notation entrée par l'utilisateur.
 * Ex: " ta1 " -> "Ta1", " e4 " -> "e4"
 */
export function cleanNotation(raw: string): string {
	if (!raw) return '';
	const trimmed = raw.trim().replace(/\s+/g, '');
	if (trimmed.length >= 3) {
		return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
	}
	return trimmed.toLowerCase();
}

/**
 * Convertit un indice de case chessops (0..63) en chaîne (ex: 12 -> "e2").
 */
export function squareIndexToString(sq: number): string {
	const file = sq % 8;
	const rank = Math.floor(sq / 8) + 1;
	return `${FILES[file]}${rank}`;
}

/**
 * Convertit un coup SAN de notation internationale (K, Q, R, B, N)
 * en notation française (R, D, T, F, C).
 */
export function toFrenchNotation(san: string): string {
	if (!san) {
		return '';
	}
	const pieceMap: Record<string, string> = {
		K: 'R', // Roi
		Q: 'D', // Dame
		R: 'T', // Tour
		B: 'F', // Fou
		N: 'C', // Cavalier
	};
	return san.replace(/[KQRBN]/g, (match) => pieceMap[match] || match);
}

/**
 * Convertit un coup SAN de notation française (R, D, T, F, C)
 * en notation internationale (K, Q, R, B, N).
 */
export function toInternationalNotation(san: string): string {
	if (!san) {
		return '';
	}
	const pieceMap: Record<string, string> = {
		R: 'K', // Roi
		D: 'Q', // Dame
		T: 'R', // Tour
		F: 'B', // Fou
		C: 'N', // Cavalier
	};
	return san.replace(/[RDTFC]/g, (match) => pieceMap[match] || match);
}

/**
 * Traduit un coup SAN sur une position d'échecs en libellé français clair.
 * Ex: "Pion e2 en e4", "Fou f1 en b5", "Petit roque (O-O)", "Grand roque (O-O-O)"
 */
export function formatMoveInFrench(
	pos: Chess,
	san: string
): { texte: string; orig: string; dest: string } {
	const trimmedSan = san.trim();

	// Gestion des roques
	if (trimmedSan === 'O-O' || trimmedSan === '0-0') {
		const rank = pos.turn === 'white' ? '1' : '8';
		return {
			texte: 'Petit roque (O-O)',
			orig: `e${rank}`,
			dest: `g${rank}`,
		};
	}
	if (trimmedSan === 'O-O-O' || trimmedSan === '0-0-0') {
		const rank = pos.turn === 'white' ? '1' : '8';
		return {
			texte: 'Grand roque (O-O-O)',
			orig: `e${rank}`,
			dest: `c${rank}`,
		};
	}

	const standardSan = toInternationalNotation(trimmedSan);

	const parsedMove = parseSan(pos, standardSan);
	if (!parsedMove || !('from' in parsedMove)) {
		return {
			texte: san,
			orig: '',
			dest: '',
		};
	}

	const fromSquare = parsedMove.from;
	const toSquare = parsedMove.to;
	const orig = squareIndexToString(fromSquare);
	const dest = squareIndexToString(toSquare);

	const piece = pos.board.get(fromSquare);
	const role = piece ? piece.role : 'pawn';
	const roleName = ROLE_NAMES_FR[role] || 'Pion';

	let texte = `${roleName} ${orig} en ${dest}`;
	if ('promotion' in parsedMove && parsedMove.promotion) {
		const promoRole =
			ROLE_NAMES_FR[parsedMove.promotion] || parsedMove.promotion;
		texte += ` (${promoRole})`;
	}

	return { texte, orig, dest };
}

/**
 * Formate un coup complet avec description française suivie de la notation SAN française entre parenthèses.
 * Ex: "Fou f1 en c4 (Fc4)", "Pion e2 en e4 (e4)", "Petit roque (O-O)", "Grand roque (O-O-O)"
 */
export function formatMoveWithFrenchSan(pos: Chess, san: string): string {
	const formatted = formatMoveInFrench(pos, san);
	const frSan = toFrenchNotation(san);
	if (formatted.texte.endsWith(`(${frSan})`)) {
		return formatted.texte;
	}
	return `${formatted.texte} (${frSan})`;
}

/**
 * Extrait les formes graphiques ([%csl ...], [%cal ...], [%cpl ...]) et le texte épuré d'un ou plusieurs commentaires PGN.
 */
export function extractShapesAndComment(comments?: string[] | string): {
	comment: string;
	shapes: DrawShape[];
} {
	if (!comments) {
		return { comment: '', shapes: [] };
	}

	const fullText = Array.isArray(comments) ? comments.join('\n') : comments;
	if (!fullText.trim()) {
		return { comment: '', shapes: [] };
	}

	const shapes: DrawShape[] = [];

	// 1. Cercles/cases [%csl ...] ou [%cpl ...]
	const cslRegex = /\[%(?:csl|cpl)\s+([^\]]+)\]/gi;
	let cslMatch: RegExpExecArray | null;
	while ((cslMatch = cslRegex.exec(fullText)) !== null) {
		const items = cslMatch[1].split(',');
		for (const item of items) {
			const clean = item.trim();
			if (clean.length >= 3) {
				const brush = PGN_BRUSH_MAP[clean[0].toLowerCase()] || 'green';
				const orig = clean.substring(1, 3).toLowerCase() as Key;
				if (!shapes.some((s) => s.orig === orig && !s.dest)) {
					shapes.push({ orig, brush });
				}
			}
		}
	}

	// 2. Flèches [%cal ...]
	const calRegex = /\[%cal\s+([^\]]+)\]/gi;
	let calMatch: RegExpExecArray | null;
	while ((calMatch = calRegex.exec(fullText)) !== null) {
		const items = calMatch[1].split(',');
		for (const item of items) {
			const clean = item.trim();
			if (clean.length >= 5) {
				const brush = PGN_BRUSH_MAP[clean[0].toLowerCase()] || 'green';
				const orig = clean.substring(1, 3).toLowerCase() as Key;
				const dest = clean.substring(3, 5).toLowerCase() as Key;
				if (!shapes.some((s) => s.orig === orig && s.dest === dest)) {
					shapes.push({ orig, dest, brush });
				}
			}
		}
	}

	// 3. Commentaire texte sans les balises [%...]
	const cleanComment = fullText
		.replace(/\[%[^\]]+\]/g, '')
		.trim()
		.replace(/\s{2,}/g, ' ');

	return { comment: cleanComment, shapes };
}

/**
 * Alias de compatibilité pour extractShapesAndComment retournant cleanedText.
 */
export function extractShapesAndText(commentText?: string[] | string): {
	cleanedText: string;
	shapes: DrawShape[];
} {
	const res = extractShapesAndComment(commentText);
	return { cleanedText: res.comment, shapes: res.shapes };
}

/**
 * Mélange aléatoirement les éléments d'un tableau (algorithme de Fisher-Yates, sans effet de bord).
 */
export function shuffleArray<T>(array: T[], rng: () => number = Math.random): T[] {
	const copy = [...array];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

