import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PieceSet, BoardTheme } from 'eg-chessboard';

export interface PieceSetOption {
	id: PieceSet;
	label: string;
	description: string;
}

export interface BoardThemeOption {
	id: BoardTheme;
	label: string;
	lightColor: string;
	darkColor: string;
}

export const AVAILABLE_PIECE_SET_OPTIONS: PieceSetOption[] = [
	{
		id: 'staunton',
		label: 'Staunton',
		description: 'Style 3D réaliste classique avec reflets',
	},
	{
		id: 'merida',
		label: 'Mérida',
		description: 'Standard classique des diagrammes et livres',
	},
	{
		id: 'cburnett',
		label: 'Cburnett',
		description: 'Design vectoriel moderne flat Lichess',
	},
	{
		id: 'alpha',
		label: 'Alpha',
		description: 'Contours nets et fort contraste visuel',
	},
	{
		id: 'cardinal',
		label: 'Cardinal',
		description: 'Style tournoi traditionnel élancé et élégant',
	},
	{
		id: 'dubrovny',
		label: 'Dubrovny',
		description: 'Inspiré des Olympiades de Dubrovnik 1950',
	},
	{
		id: 'maestro',
		label: 'Maestro',
		description: 'Style traditionnel européen robuste',
	},
	{
		id: 'staunty',
		label: 'Staunty',
		description: 'Variante contemporaine épurée',
	},
];

export const AVAILABLE_BOARD_THEME_OPTIONS: BoardThemeOption[] = [
	{
		id: 'brown',
		label: 'Bois Classique',
		lightColor: '#f0d9b5',
		darkColor: '#b58863',
	},
	{
		id: 'blue',
		label: 'Bleu Acier',
		lightColor: '#dee3e6',
		darkColor: '#8ca2ad',
	},
	{
		id: 'green',
		label: 'Vert Tournoi',
		lightColor: '#ffffdd',
		darkColor: '#86a666',
	},
	{
		id: 'ic',
		label: 'Style IC',
		lightColor: '#ece9d8',
		darkColor: '#c4cfa3',
	},
	{
		id: 'grey',
		label: 'Gris Ardoise',
		lightColor: '#e0e0e0',
		darkColor: '#8a8a8a',
	},
	{
		id: 'purple',
		label: 'Violet Lilas',
		lightColor: '#edeed1',
		darkColor: '#7d5ea3',
	},
	{
		id: 'wood',
		label: 'Noyer Chaud',
		lightColor: '#d2b48c',
		darkColor: '#8b5a2b',
	},
	{
		id: 'maple',
		label: 'Érable Doré',
		lightColor: '#f3dfc1',
		darkColor: '#ba7b46',
	},
];

export const useChessPreferencesStore = defineStore(
	'chessPreferences',
	() => {
		const pieceSet = ref< PieceSet >( 'staunton' );
		const boardTheme = ref< BoardTheme >( 'brown' );

		const setPieceSet = ( newSet: PieceSet ) => {
			pieceSet.value = newSet;
		};

		const setBoardTheme = ( newTheme: BoardTheme ) => {
			boardTheme.value = newTheme;
		};

		const savePreferences = ( newSet: PieceSet, newTheme: BoardTheme ) => {
			pieceSet.value = newSet;
			boardTheme.value = newTheme;
		};

		const resetDefaults = () => {
			pieceSet.value = 'staunton';
			boardTheme.value = 'brown';
		};

		return {
			pieceSet,
			boardTheme,
			setPieceSet,
			setBoardTheme,
			savePreferences,
			resetDefaults,
		};
	},
	{
		persist: true,
	}
);
