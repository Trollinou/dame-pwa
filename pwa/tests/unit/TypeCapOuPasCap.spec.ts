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

	test( 'affiche uniquement la FEN initiale pour la variante QCM Oui/Non même si le PGN contient un coup joué', () => {
		const initialFen = '8/8/8/P6p/6pP/3qk1P1/8/4K3 w - - 0 1';
		const pgnWithMove = `[SetUp "1"]\n[FEN "${ initialFen }"]\n\n{ [%csl Ga6][%cal Ga5a6] }\n1. a6 *`;

		const config = {
			consigne: 'Cap ou pas cap ?',
			variante: 'qcm_oui_non',
			question: 'Le pion va-t-il à dame ?',
			exercices: [ { pgn: pgnWithMove, reponse_oui_non: true } ],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 14021,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const mockFen = wrapper.find( '.mock-fen' );
		expect( mockFen.exists() ).toBe( true );
		expect( mockFen.text() ).toBe( initialFen );
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

	test( 'affiche les puces de coups trouvés en notation française dans la variante Move multi-coups', async () => {
		const multiMovePgn = `[SetUp "1"]
[FEN "r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]

1. Nf3 (1. Nc3) *`;

		const config = {
			consigne: 'Trouvez tous les coups de cavalier possibles.',
			variante: 'move',
			exercices: [
				{
					pgn: multiMovePgn,
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 14041,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const chessboard = wrapper.findComponent( { name: 'EgChessboard' } );
		expect( chessboard.exists() ).toBe( true );

		// Jouer Nf3
		await chessboard.vm.$emit( 'move', {
			san: 'Nf3',
			from: 'g1',
			to: 'f3',
			lan: 'g1f3',
			color: 'w',
		} );
		expect( wrapper.text() ).toContain( '✓ Cf3' );
		expect( wrapper.text() ).not.toContain( '✓ Nf3' );

		// Jouer Nc3
		await chessboard.vm.$emit( 'move', {
			san: 'Nc3',
			from: 'b1',
			to: 'c3',
			lan: 'b1c3',
			color: 'w',
		} );
		expect( wrapper.text() ).toContain( '✓ Cf3' );
		expect( wrapper.text() ).toContain( '✓ Cc3' );
		expect( wrapper.text() ).toContain(
			'Bravo ! Tous les coups ont été trouvés.'
		);
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

	test( 'gère la variante Setup en mode mémoire et préserve les pièces placées lors de Revoir la position', async () => {
		const targetFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
		const config = {
			consigne: 'Reconstituez la position de mémoire.',
			variante: 'setup',
			mode_setup: 'memoire' as const,
			exercices: [
				{
					pgn: `[SetUp "1"]\n[FEN "${ targetFen }"]\n\n*`,
					conseil: 'Regardez la position des Rois.',
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1407,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		// Étape 1 : Phase de mémorisation initiale
		expect( wrapper.text() ).toContain( 'Mémorisez bien la position' );
		expect( wrapper.text() ).toContain( 'Regardez la position des Rois.' );
		const memoriseBtn = wrapper.find(
			'.setup-memorize-panel .action-btn--primary'
		);
		expect( memoriseBtn.exists() ).toBe( true );
		expect( memoriseBtn.text() ).toContain( "J'ai mémorisé !" );

		// Étape 2 : Clic sur "J'ai mémorisé !" -> passage en reconstitution
		await memoriseBtn.trigger( 'click' );
		expect( wrapper.find( '.setup-reconstruct-panel' ).exists() ).toBe(
			true
		);

		const chessboard = wrapper.findComponent( { name: 'EgChessboard' } );
		expect( chessboard.exists() ).toBe( true );

		// Sélectionner le Roi blanc dans la palette (1er bouton blanc)
		const paletteBtns = wrapper.findAll( '.palette-btn' );
		const kingWhiteBtn = paletteBtns[ 0 ]; // roi blanc
		await kingWhiteBtn.trigger( 'click' );

		// Poser le Roi blanc en e1
		await chessboard.vm.$emit( 'square-click', 'e1' );

		// Étape 3 : Clic sur "Revoir la position"
		const revoirBtn = wrapper.find( '.action-btn--peek' );
		expect( revoirBtn.exists() ).toBe( true );
		await revoirBtn.trigger( 'click' );

		// On est de retour en mémorisation, le bouton indique "Reprendre la reconstitution"
		expect( wrapper.find( '.setup-memorize-panel' ).exists() ).toBe( true );
		const reprendreBtn = wrapper.find(
			'.setup-memorize-panel .action-btn--primary'
		);
		expect( reprendreBtn.text() ).toContain(
			'Reprendre la reconstitution'
		);

		// Étape 4 : Clic sur "Reprendre la reconstitution"
		await reprendreBtn.trigger( 'click' );
		expect( wrapper.find( '.setup-reconstruct-panel' ).exists() ).toBe(
			true
		);

		// Sélectionner le Roi noir dans la palette (7e bouton = roi noir)
		const kingBlackBtn = paletteBtns[ 6 ];
		await kingBlackBtn.trigger( 'click' );

		// Poser le Roi noir en e8
		const chessboardAfterResume = wrapper.findComponent( {
			name: 'EgChessboard',
		} );
		await chessboardAfterResume.vm.$emit( 'square-click', 'e8' );

		// Étape 5 : L'échiquier reconstitué correspond à la position cible -> Succès
		expect( wrapper.text() ).toContain(
			'Parfait ! Vous avez reproduit exactement la position.'
		);
	} );

	test( 'gère la variante Clic avec cercles cibles multiples (rouge, bleu) et cercle jaune comme seul repère visuel', async () => {
		const fenClic = '4k3/6p1/4npp1/4p3/2B1P3/P7/1P3P2/4K3 w - - 0 1';
		// PGN avec 1 cercle jaune (guide d'observation Ye6), 1 rouge (cible Re4) et 2 bleus (cibles Bc4, Bb2)
		const pgnClic = `[SetUp "1"]
[FEN "${ fenClic }"]

{ [%csl Ye6,Re4,Bc4,Bb2] }
*`;

		const config = {
			consigne: 'Entourez les pièces attaquantes et défenseurs.',
			variante: 'clic',
			mode_clic: 'cibles' as const,
			exercices: [
				{
					pgn: pgnClic,
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1408,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		// 3 cibles attendues (e4, c4, b2), e6 étant jaune (repère d'observation non compté dans les cibles)
		expect( wrapper.text() ).toContain( '0 / 3' );

		const chessboard = wrapper.findComponent( { name: 'EgChessboard' } );
		expect( chessboard.exists() ).toBe( true );

		// Cliquer sur les 3 cases cibles
		await chessboard.vm.$emit( 'square-click', 'e4' );
		await chessboard.vm.$emit( 'square-click', 'c4' );
		await chessboard.vm.$emit( 'square-click', 'b2' );

		expect( wrapper.text() ).toContain(
			'Bravo ! Toutes les cibles ont été trouvées.'
		);
	} );

	test( 'affiche le cercle jaune de mise en évidence en variante QCM Multiple pendant la recherche', async () => {
		const pgnWithGuide = `[Event "EA_Matérialité_SeDefendre: EA_Niv1_M_CO-1_Cap ou pas cap ? (QCM choix multiples)"]
[FEN "4r1k1/2pn1pp1/1p3n1p/4N3/2P5/6NP/1P3PP1/4R1K1 w - - 0 1"]
[SetUp "1"]

{ [%csl Ye5] [%cal Rd7e5,Re8e5,Ge1e5,Bf2f4] }
*`;

		const config = {
			consigne: 'La pièce en jaune est-elle attaquée ?',
			variante: 'qcm_multiple',
			propositions: [
				'Le Cavalier en e5 est attaqué 2 fois ?',
				'Le Cavalier en e5 est défendu 2 fois ?',
			],
			exercices: [
				{
					pgn: pgnWithGuide,
					reponses_multiple: [ true, true ],
				},
			],
		};

		const wrapper = mount( TypeCapOuPasCap, {
			props: {
				config,
				id: 1409,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const chessboard = wrapper.findComponent( { name: 'EgChessboard' } );
		expect( chessboard.exists() ).toBe( true );

		// Pendant la réflexion : seul le cercle jaune (Ye5) est affiché
		const initialDiagram = chessboard.props( 'diagram' );
		expect( initialDiagram.shapes ).toEqual( [
			{ orig: 'e5', brush: 'yellow' },
		] );

		// Répondre correctement aux propositions
		const rows = wrapper.findAll( '.proposition-row' );
		const row0Oui = rows[ 0 ].find( '.toggle-btn--oui' );
		const row1Oui = rows[ 1 ].find( '.toggle-btn--oui' );
		await row0Oui.trigger( 'click' );
		await row1Oui.trigger( 'click' );

		// Après validation : toutes les formes (cercle + flèches) sont révélées
		const solvedDiagram = chessboard.props( 'diagram' );
		expect( solvedDiagram.shapes.length ).toBeGreaterThan( 1 );
		expect( solvedDiagram.shapes ).toEqual(
			expect.arrayContaining( [
				{ orig: 'e5', brush: 'yellow' },
				{ orig: 'd7', dest: 'e5', brush: 'red' },
				{ orig: 'e8', dest: 'e5', brush: 'red' },
				{ orig: 'e1', dest: 'e5', brush: 'green' },
				{ orig: 'f2', dest: 'f4', brush: 'blue' },
			] )
		);
	} );
} );
