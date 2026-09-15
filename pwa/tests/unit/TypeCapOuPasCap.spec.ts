import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeCapOuPasCap from '@/views/types/TypeCapOuPasCap.vue';

const fireCelebrationMock = vi.fn();
vi.mock( '@/composables/useCelebration', () => ( {
	fireExerciseCelebration: () => fireCelebrationMock(),
} ) );

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
          @click="$emit('move', { san: 'O-O', from: 'e1', to: 'g1', lan: 'e1g1', color: 'w' })"
        >
          Play O-O
        </button>
        <button
          class="mock-wrong-move-btn"
          @click="$emit('move', { san: 'Nf3', from: 'g1', to: 'f3', lan: 'g1f3', color: 'w' })"
        >
          Play Nf3
        </button>
      </div>
    `,
	},
} ) );

describe( 'TypeCapOuPasCap.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		fireCelebrationMock.mockClear();
	} );

	const samplePgn = `[SetUp "1"]
[FEN "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"]

{ [%cal Ge1g1] }
*`;

	test( 'affiche correctement l’en-tête et le badge Carte 1 / 5', () => {
		const config = {
			consigne: 'Cap ou pas cap de roquer ?',
			variante: 'qcm_oui_non',
			question: 'Le roque est-il possible ?',
			exercices: [
				{ pgn: samplePgn, reponse_oui_non: true },
				{ pgn: samplePgn, reponse_oui_non: false },
				{ pgn: samplePgn, reponse_oui_non: true },
				{ pgn: samplePgn, reponse_oui_non: false },
				{ pgn: samplePgn, reponse_oui_non: true },
			],
			metaTitre: 'Exercice Cap ou pas Cap 1',
			metaTypeLabel: 'Cap ou pas Cap ?',
			metaChapitreNiveauLabel: 'Niveau 1 - Les Roques',
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1401,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Exercice Cap ou pas Cap 1' );
		expect( wrapper.text() ).toContain( 'Cap ou pas cap de roquer ?' );
		expect( wrapper.text() ).toContain( 'Carte 1 / 5' );
		expect( wrapper.text() ).toContain( 'Le roque est-il possible ?' );
	} );

	test( 'gère la validation d’une variante QCM Oui/Non avec le toggle neutre', async () => {
		const config = {
			consigne: 'Cap ou pas cap de roquer ?',
			variante: 'qcm_oui_non',
			question: 'Le roque est-il possible ?',
			exercices: [ { pgn: samplePgn, reponse_oui_non: true } ],
			metaTitre: 'Exercice Cap ou pas Cap',
			metaTypeLabel: 'Cap ou pas Cap ?',
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1402,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const ouiBtn = wrapper.find( '.toggle-btn--oui' );
		const nonBtn = wrapper.find( '.toggle-btn--non' );
		expect( ouiBtn.exists() ).toBe( true );
		expect( nonBtn.exists() ).toBe( true );

		// Initialement neutre
		expect( ouiBtn.classes() ).not.toContain( 'is-selected' );
		expect( nonBtn.classes() ).not.toContain( 'is-selected' );

		// Clic sur mauvaise réponse (NON)
		await nonBtn.trigger( 'click' );
		expect( nonBtn.classes() ).toContain( 'is-selected' );
		expect( wrapper.text() ).toContain( 'Mauvaise réponse' );

		// Clic sur bonne réponse (OUI)
		await ouiBtn.trigger( 'click' );
		expect( ouiBtn.classes() ).toContain( 'is-selected' );
		expect( wrapper.text() ).toContain( 'Bravo !' );
	} );

	test( 'gère la validation d’une variante QCM Multiple avec plusieurs propositions', async () => {
		const config = {
			consigne: 'Évaluez les possibilités de roque.',
			variante: 'qcm_multiple',
			propositions: [
				'Petit roque blanc (0-0) ?',
				'Grand roque blanc (0-0-0) ?',
			],
			exercices: [
				{
					pgn: samplePgn,
					reponses_multiple: [ true, false ],
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1403,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Petit roque blanc (0-0) ?' );
		expect( wrapper.text() ).toContain( 'Grand roque blanc (0-0-0) ?' );

		const rows = wrapper.findAll( '.proposition-row' );
		expect( rows.length ).toBe( 2 );

		// Répondre faux à la première proposition (NON au lieu de OUI) et OUI à la 2e (au lieu de NON)
		const row0Non = rows[ 0 ].find( '.toggle-btn--non' );
		const row1Oui = rows[ 1 ].find( '.toggle-btn--oui' );
		await row0Non.trigger( 'click' );
		await row1Oui.trigger( 'click' );

		expect( wrapper.text() ).toContain(
			'Certaines réponses sont inexactes'
		);

		// Corriger les réponses : OUI à la 1ère, NON à la 2nde
		const row0Oui = rows[ 0 ].find( '.toggle-btn--oui' );
		const row1Non = rows[ 1 ].find( '.toggle-btn--non' );
		await row0Oui.trigger( 'click' );
		await row1Non.trigger( 'click' );

		expect( wrapper.text() ).toContain(
			'Excellent ! Toutes vos réponses sont exactes.'
		);
	} );

	test( 'gère la validation d’une variante Move', async () => {
		const config = {
			consigne: 'Jouez le coup de roque.',
			variante: 'move',
			exercices: [
				{
					pgn: samplePgn,
					move_san: 'O-O',
					move_explication: 'Le roque est le meilleur coup.',
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1404,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const moveBtn = wrapper.find( '.mock-move-btn' );
		expect( moveBtn.exists() ).toBe( true );

		await moveBtn.trigger( 'click' );
		expect( wrapper.text() ).toContain( 'Le roque est le meilleur coup.' );
	} );

	test( 'gère la variante Notation avec extraction FEN et saisie des coordonnées', async () => {
		// FEN avec Tour blanche en c2, Dame noire en d4, Pion blanc en c3
		const fenNotation = '8/8/8/8/3q4/2P5/2R5/8 w - - 0 1';
		const config = {
			consigne: 'Indiquez la position de chaque pièce.',
			variante: 'notation',
			exercices: [
				{
					pgn: `[SetUp "1"]\n[FEN "${ fenNotation }"]\n\n*`,
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1405,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain(
			'Indiquez la position de chaque pièce'
		);

		const pieceRows = wrapper.findAll( '.notation-piece-row' );
		// 3 pièces : Tour blanche (c2), Pion blanc (c3), Dame noire (d4)
		expect( pieceRows.length ).toBe( 3 );

		const inputs = wrapper.findAll( '.notation-input' );
		expect( inputs.length ).toBe( 3 );

		// Saisir des notations avec mauvaise casse (ex: tc2 au lieu de Tc2, C3 au lieu de c3, dd4 au lieu de Dd4)
		await inputs[ 0 ].setValue( 'tc2' );
		await inputs[ 1 ].setValue( 'C3' );
		await inputs[ 2 ].setValue( 'dd4' );

		expect( wrapper.text() ).toContain(
			'Certaines notations sont inexactes'
		);

		// Saisir les notations avec la casse exacte (Tc2, c3, Dd4)
		await inputs[ 0 ].setValue( 'Tc2' );
		await inputs[ 1 ].setValue( 'c3' );
		await inputs[ 2 ].setValue( 'Dd4' );

		expect( wrapper.text() ).toContain(
			'Bravo ! Toutes les notations de pièces sont exactes.'
		);
	} );

	test( 'gère la variante Notation avec plusieurs pièces du même type', async () => {
		// FEN avec 2 Cavaliers blancs en c3 et f3
		const fenKnights = '8/8/8/8/8/2N2N2/8/8 w - - 0 1';
		const config = {
			consigne: 'Donnez les coordonnées des cavaliers.',
			variante: 'notation',
			exercices: [
				{
					pgn: `[SetUp "1"]\n[FEN "${ fenKnights }"]\n\n*`,
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1406,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const inputs = wrapper.findAll( '.notation-input' );
		expect( inputs.length ).toBe( 2 );

		// Saisie croisée des deux cavaliers (Cf3 puis Cc3)
		await inputs[ 0 ].setValue( 'Cf3' );
		await inputs[ 1 ].setValue( 'Cc3' );

		expect( wrapper.text() ).toContain(
			'Bravo ! Toutes les notations de pièces sont exactes.'
		);
	} );
} );
