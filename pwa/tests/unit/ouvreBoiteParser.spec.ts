import { describe, it, expect } from 'vitest';
import { parseOuvreBoiteMiniPgn, formatMoveInFrench } from '@/utils/ouvreBoiteParser';
import { Chess } from 'chessops';

describe('ouvreBoiteParser', () => {
	const pgnExample1 = `[Event "EA_Activité_LesReglesD'or: EA_Niv1_A_OA-1_Ouvre'boite"]
[Date "2026.08.14"]
[Result "*"]
[Variant "Standard"]
[ECO "B00"]
[Opening "King's Pawn Game"]
[StudyName "EA_Activité_LesReglesD'or"]
[ChapterName "EA_Niv1_A_OA-1_Ouvre'boite"]
[ChapterURL "https://lichess.org/study/a5GGg5Hf/B6HXMLTg"]
[Annotator "https://lichess.org/@/EchiquierLedonien1"]
[UTCDate "2026.08.14"]
[UTCTime "19:42:15"]

{ a4 e4 g4 } { [%cal Ga2a4,Re2e4,Yg2g4] }
1. e4 { Oui. Aux échecs, il faut contrôler le centre en plaçant un ou deux pions dans le petit centre. } (1. a4 { Les coups de pions à l’aile sont très mauvais en début de partie ! }) (1. g4 { Les coups de pions à l’aile sont très mauvais en début de partie ! }) *`;

	const pgnExample2 = `[Event "EA_Activité_LesReglesD'or: EA_Niv1_A_OA-4_Ouvre'boite"]
[Date "2026.08.14"]
[Result "*"]
[Variant "Standard"]
[ECO "C00"]
[Opening "French Defense: Normal Variation"]
[StudyName "EA_Activité_LesReglesD'or"]
[ChapterName "EA_Niv1_A_OA-4_Ouvre'boite"]
[ChapterURL "https://lichess.org/study/a5GGg5Hf/FQWMcGQy"]
[Annotator "https://lichess.org/@/EchiquierLedonien1"]
[FEN "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1"]
[SetUp "1"]
[UTCDate "2026.08.14"]
[UTCTime "19:46:51"]

{ Fb5 d4 f4 } { [%cal Gf1b5,Rd2d4,Yf2f4] }
1. d4 { Parfait. Les Noirs ne placent pas de pion dans le petit centre, les Blancs en positionnent donc un deuxième. } (1. Bb5 { Développe le Fou mais il peut être chassé par 2...c6. Ce n’est donc pas un bon coup. }) (1. f4 { L’un des pires coups au début de partie, l’avancée du pion f découvre le Roi. }) *`;

	it('parses Example 1 with standard start FEN, 3 choices and French move labels', () => {
		const carte = parseOuvreBoiteMiniPgn(pgnExample1, 0);

		expect(carte.index).toBe(0);
		expect(carte.orientation).toBe('white');
		expect(carte.solutionSan).toBe('e4');
		expect(carte.solutionTexte).toBe('Pion e2 en e4');
		expect(carte.bonneExplication).toContain('Oui. Aux échecs, il faut contrôler le centre');
		expect(carte.shapes.length).toBeGreaterThanOrEqual(3);
		expect(carte.choix.length).toBe(3);

		const correctChoice = carte.choix.find((c) => c.isCorrect);
		expect(correctChoice).toBeDefined();
		expect(correctChoice?.san).toBe('e4');
		expect(correctChoice?.texte).toBe('Pion e2 en e4');

		const wrongChoices = carte.choix.filter((c) => !c.isCorrect);
		expect(wrongChoices.length).toBe(2);
		expect(wrongChoices.map((c) => c.san).sort()).toEqual(['a4', 'g4']);
		expect(wrongChoices.map((c) => c.texte).sort()).toEqual(['Pion a2 en a4', 'Pion g2 en g4']);
	});

	it('parses Example 2 with custom FEN, piece moves and explanations', () => {
		const carte = parseOuvreBoiteMiniPgn(pgnExample2, 1);

		expect(carte.index).toBe(1);
		expect(carte.fenDepart).toBe('rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
		expect(carte.orientation).toBe('white');
		expect(carte.solutionSan).toBe('d4');
		expect(carte.solutionTexte).toBe('Pion d2 en d4');
		expect(carte.bonneExplication).toContain('Parfait. Les Noirs ne placent pas de pion');

		const bb5Choice = carte.choix.find((c) => c.san === 'Bb5' || c.san === 'Fb5');
		expect(bb5Choice).toBeDefined();
		expect(bb5Choice?.texte).toBe('Fou f1 en b5');
		expect(bb5Choice?.explication).toContain('Développe le Fou mais il peut être chassé');

		const f4Choice = carte.choix.find((c) => c.san === 'f4');
		expect(f4Choice).toBeDefined();
		expect(f4Choice?.texte).toBe('Pion f2 en f4');
		expect(f4Choice?.explication).toContain('L’un des pires coups');
	});

	it('correctly translates knight, king, queen and rook moves in French', () => {
		const pos = Chess.default();
		expect(formatMoveInFrench(pos, 'Nf3').texte).toBe('Cavalier g1 en f3');
		expect(formatMoveInFrench(pos, 'Nc3').texte).toBe('Cavalier b1 en c3');
		expect(formatMoveInFrench(pos, 'e4').texte).toBe('Pion e2 en e4');
		expect(formatMoveInFrench(pos, 'O-O').texte).toBe('Petit roque (O-O)');
		expect(formatMoveInFrench(pos, 'O-O-O').texte).toBe('Grand roque (O-O-O)');
	});
});
