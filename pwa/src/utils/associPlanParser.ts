import { parsePgn } from 'chessops/pgn';
import type { DrawShape, Key } from 'eg-chessboard';
import { getActiveColorFromFen } from './fenUtils';

export interface AssociPlanPaire {
  originalIndex: number;
  fen: string;
  couleurJoueur: 'white' | 'black';
  shapes: DrawShape[];
  description: string;
  pgn: string;
}

const brushMap: Record<string, string> = {
  g: 'green',
  r: 'red',
  b: 'blue',
  y: 'yellow',
  c: 'green',
  o: 'yellow',
};

/**
 * Extrait les formes graphiques ([%csl ...], [%cal ...]) et le texte épuré.
 */
function extractShapesAndText(commentText: string): {
  cleanedText: string;
  shapes: DrawShape[];
} {
  if (!commentText) {
    return { cleanedText: '', shapes: [] };
  }

  const shapes: DrawShape[] = [];

  // 1. Cercles [%csl ...] ou [%cpl ...]
  const cslRegex = /\[%(?:csl|cpl)\s+([^\]]+)\]/gi;
  let cslMatch: RegExpExecArray | null;
  while ((cslMatch = cslRegex.exec(commentText)) !== null) {
    const items = cslMatch[1].split(',');
    for (const item of items) {
      const clean = item.trim();
      if (clean.length >= 3) {
        const brush = brushMap[clean[0].toLowerCase()] || 'green';
        const orig = clean.substring(1, 3).toLowerCase() as Key;
        shapes.push({ orig, brush });
      }
    }
  }

  // 2. Flèches [%cal ...]
  const calRegex = /\[%cal\s+([^\]]+)\]/gi;
  let calMatch: RegExpExecArray | null;
  while ((calMatch = calRegex.exec(commentText)) !== null) {
    const items = calMatch[1].split(',');
    for (const item of items) {
      const clean = item.trim();
      if (clean.length >= 5) {
        const brush = brushMap[clean[0].toLowerCase()] || 'green';
        const orig = clean.substring(1, 3).toLowerCase() as Key;
        const dest = clean.substring(3, 5).toLowerCase() as Key;
        shapes.push({ orig, dest, brush });
      }
    }
  }

  // Nettoyage de toutes les balises [%...]
  const cleanedText = commentText
    .replace(/\[%[^\]]+\]/g, '')
    .trim()
    .replace(/\s{2,}/g, ' ');

  return { cleanedText, shapes };
}

/**
 * Parse un PGN unique pour en extraire :
 * - La FEN de départ (header FEN ou position standard)
 * - L'orientation (camp au trait déduit de la FEN)
 * - Les éventuels shapes attachés au commentaire initial
 * - La description (commentaire initial de départ)
 */
export function parseAssociPlanSinglePgn(pgnString: string, originalIndex: number): AssociPlanPaire {
  const trimmed = (pgnString || '').trim();
  const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  let fen = defaultFen;
  let description = '';
  let shapes: DrawShape[] = [];

  if (trimmed) {
    try {
      const games = parsePgn(trimmed);
      if (games && games.length > 0) {
        const game = games[0];
        if (game.headers && typeof game.headers.get === 'function') {
          const fenHeader = game.headers.get('FEN');
          if (fenHeader) {
            fen = fenHeader.trim();
          }
        }

        // Récupérer le commentaire initial de la partie (avant le coup 1)
        if (Array.isArray(game.comments) && game.comments.length > 0) {
          const rawComment = game.comments.join(' ');
          const extracted = extractShapesAndText(rawComment);
          description = extracted.cleanedText;
          shapes = extracted.shapes;
        }
      }
    } catch {
      // Fallback regex si chessops parsePgn échoue sur une variante particulière
      const fenMatch = trimmed.match(/\[FEN\s+"([^"]+)"\]/i);
      if (fenMatch) {
        fen = fenMatch[1].trim();
      }

      const firstMoveIndex = trimmed.search(/\b\d+\s*\./);
      const initialSection = firstMoveIndex !== -1 ? trimmed.slice(0, firstMoveIndex) : trimmed;
      const commentMatches = initialSection.match(/\{([^}]*)\}/g);
      if (commentMatches) {
        const rawComment = commentMatches.map((c) => c.slice(1, -1)).join(' ');
        const extracted = extractShapesAndText(rawComment);
        description = extracted.cleanedText;
        shapes = extracted.shapes;
      }
    }
  }

  const couleurJoueur = getActiveColorFromFen(fen);

  return {
    originalIndex,
    fen,
    couleurJoueur,
    shapes,
    description: description || `Plan ${originalIndex + 1}`,
    pgn: trimmed,
  };
}

/**
 * Parse la liste des 4 PGNs configurés dans Associ'Plan.
 */
export function parseAssociPlanPaires(paires: Array<{ pgn?: string; pgn_data?: string }>): AssociPlanPaire[] {
  if (!Array.isArray(paires)) {
    return [];
  }

  return paires.slice(0, 4).map((p, idx) => {
    const rawPgn = p?.pgn || p?.pgn_data || '';
    return parseAssociPlanSinglePgn(rawPgn, idx);
  });
}
