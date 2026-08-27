import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeABCDaire from '@/views/types/TypeABCDaire.vue';

// Mock eg-chessboard
vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'EgChessboard',
		props: [
			'diagram',
			'boardConfig',
			'playerColor',
			'mode',
			'stockfishConfig',
			'pieceSet',
			'boardTheme',
		],
		emits: [ 'move', 'board-created', 'square-click' ],
		template: `
      <div class="mock-eg-chessboard">
        <span class="mock-fen">{{ diagram ? diagram.fen : '' }}</span>
        <button
          class="mock-move-btn"
          @click="$emit('move', { san: 'Qxg7#', from: 'h6', to: 'g7', lan: 'h6g7' })"
        >
          Play Qxg7#
        </button>
        <button
          class="mock-wrong-move-btn"
          @click="$emit('move', { san: 'Nf3', from: 'g1', to: 'f3', lan: 'g1f3' })"
        >
          Play Nf3
        </button>
      </div>
    `,
	},
} ) );

describe( 'TypeABCDaire.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	const sampleLichessPgn = `[Event "EA_Matérialité_TerminerUnePartie: EA_Niv1_M_TD-1_ABCDéaire Tactique"]
[Date "2023.07.24"]
[Result "*"]
[Variant "Standard"]
[ECO "?"]
[Opening "?"]
[StudyName "EA_Matérialité_TerminerUnePartie"]
[ChapterName "EA_Niv1_M_TD-1_ABCDéaire Tactique"]
[ChapterURL "https://lichess.org/study/LUloXCQ6/WHzyVbTh"]
[Annotator "https://lichess.org/@/EchiquierLedonien1"]
[FEN "r4rk1/ppp2ppp/3qpn1Q/3p4/3P4/3B2RP/PPP2PP1/R5K1 w - - 0 1"]
[SetUp "1"]
[UTCDate "2023.07.24"]
[UTCTime "13:36:41"]

{ [%csl Bh6,Bg7][%cal Rg7g8,Bh6g7,Gg3g7] }
1. Qxg7# *`;

	const sampleConfig = {
		consigne: 'Trouver le meilleur coup.',
		exercices: [
			{ pgn: sampleLichessPgn },
			{ pgn: sampleLichessPgn },
			{ pgn: sampleLichessPgn },
			{ pgn: sampleLichessPgn },
		],
		metaTitre: 'Exercice ABCDaire 1',
		metaTypeLabel: 'ABCDaire Tactique',
		metaChapitreNiveauLabel: 'Mat en 1 - Débutant',
	};

	test( 'affiche correctement l’en-tête et le badge Carte 1 / 4', () => {
		const wrapper = mount( TypeABCDaire, {
			props: {
				config: sampleConfig,
				id: 42,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Exercice ABCDaire 1' );
		expect( wrapper.text() ).toContain( 'Trouver le meilleur coup.' );
		expect( wrapper.text() ).toContain( 'Carte 1 / 4' );
	} );

	test( 'gère la validation d’un coup correct et le passage au mode récapitulatif', async () => {
		const wrapper = mount( TypeABCDaire, {
			props: {
				config: sampleConfig,
				id: 42,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const moveBtn = wrapper.find( '.mock-move-btn' );
		expect( moveBtn.exists() ).toBe( true );

		// Déclencher le coup attendu (Qxg7#)
		await moveBtn.trigger( 'click' );

		// Vérifier la présence du feedback de succès
		expect( wrapper.text() ).toContain( 'Bravo ! Exercice réussi.' );
	} );

	test( 'gère le format de rétrocompatibilité (fen + solution)', async () => {
		const legacyConfig = {
			fen: 'r4rk1/ppp2ppp/3qpn1Q/3p4/3P4/3B2RP/PPP2PP1/R5K1 w - - 0 1',
			solution: [ 'Qxg7#' ],
			couleur_joueur: 'white' as const,
			consigne: 'Trouver le meilleur coup.',
		};

		const wrapper = mount( TypeABCDaire, {
			props: {
				config: legacyConfig,
				id: 43,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Trouver le meilleur coup.' );
		expect( wrapper.text() ).toContain( 'Carte 1 / 1' );
	} );
} );
