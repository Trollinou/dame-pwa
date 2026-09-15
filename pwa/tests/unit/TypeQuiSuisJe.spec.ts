import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeQuiSuisJe from '@/views/types/TypeQuiSuisJe.vue';

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
        <button
          class="mock-click-e4-btn"
          @click="$emit('square-click', 'e4')"
        >
          Click e4
        </button>
        <button
          class="mock-click-d4-btn"
          @click="$emit('square-click', 'd4')"
        >
          Click d4
        </button>
      </div>
    `,
	},
} ) );

describe( 'TypeQuiSuisJe.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		fireCelebrationMock.mockClear();
	} );

	test( 'affiche correctement l’en-tête et le badge Carte 1 / 6 pour la variante pieces', () => {
		const config = {
			consigne: 'Trouvez la pièce mystère',
			variante: 'pieces',
			series: [
				{ indices: 'Indice 1\nIndice 2', piece: 'wQ' },
				{ indices: 'Indice B1\nIndice B2', piece: 'wK' },
				{ indices: 'Indice C1', piece: 'wR' },
				{ indices: 'Indice D1', piece: 'wB' },
				{ indices: 'Indice E1', piece: 'wN' },
				{ indices: 'Indice F1', piece: 'wP' },
			],
			metaTitre: 'Exercice Qui-suis-je 1',
			metaTypeLabel: 'Qui suis-je ?',
			metaChapitreNiveauLabel: 'Niveau 1 - Les Pièces',
		};

		const wrapper = mount( TypeQuiSuisJe, {
			props: {
				config,
				id: 1201,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Exercice Qui-suis-je 1' );
		expect( wrapper.text() ).toContain( 'Trouvez la pièce mystère' );
		expect( wrapper.text() ).toContain( 'Carte 1 / 6' );
		expect( wrapper.text() ).toContain( 'Indice 1' );
		expect( wrapper.text() ).toContain( 'Indice 2' );
	} );

	test( 'variante pieces : validation du bon choix et passage de carte', async () => {
		const config = {
			consigne: 'Trouvez la pièce mystère',
			variante: 'pieces',
			series: [
				{ indices: 'Je suis la Dame', piece: 'wQ' },
				{ indices: 'Je suis le Roi', piece: 'wK' },
			],
			metaTitre: 'Exercice Pièces',
		};

		const wrapper = mount( TypeQuiSuisJe, {
			props: {
				config,
				id: 1202,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const pieceBtns = wrapper.findAll( '.piece-btn' );
		expect( pieceBtns.length ).toBe( 6 );

		// 1. Clic sur le Roi (wK) alors que la carte 1 attend la Dame (wQ)
		const roiBtn = pieceBtns[ 0 ]; // wK
		await roiBtn.trigger( 'click' );

		expect( wrapper.text() ).toContain( "Ce n'est pas le Roi, réessaie !" );

		// 2. Clic sur la Dame (wQ)
		const dameBtn = pieceBtns[ 1 ]; // wQ
		await dameBtn.trigger( 'click' );

		expect( wrapper.text() ).toContain( "Bravo ! C'est bien la Dame." );

		// 3. Bouton Carte suivante activé
		const nextBtn = wrapper.find( '.next-card-btn' );
		expect( nextBtn.exists() ).toBe( true );
		await nextBtn.trigger( 'click' );

		// On passe à la carte 2 / 2
		expect( wrapper.text() ).toContain( 'Carte 2 / 2' );
		expect( wrapper.text() ).toContain( 'Je suis le Roi' );
	} );

	test( 'variante cases : clic sur case cible, feedback et célébration', async () => {
		const config = {
			consigne: 'Trouvez la case mystère',
			variante: 'cases',
			series: [
				{
					indices: 'Je suis au centre du jeu (e4)',
					fen: '8/8/8/8/8/8/8/8 w - - 0 1',
					shapes: [ { orig: 'e4', brush: 'green' } ],
					case_attendue: 'e4',
				},
			],
			metaTitre: 'Exercice Cases',
		};

		const wrapper = mount( TypeQuiSuisJe, {
			props: {
				config,
				id: 1203,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Carte 1 / 1' );
		expect( wrapper.text() ).toContain( 'Je suis au centre du jeu (e4)' );

		// 1. Clic sur la mauvaise case d4
		const wrongBtn = wrapper.find( '.mock-click-d4-btn' );
		await wrongBtn.trigger( 'click' );
		expect( wrapper.text() ).toContain(
			"La case D4 n'est pas la bonne réponse, réessaie !"
		);

		// 2. Clic sur la bonne case e4
		const goodBtn = wrapper.find( '.mock-click-e4-btn' );
		await goodBtn.trigger( 'click' );
		expect( wrapper.text() ).toContain(
			'Bravo ! La case E4 est la bonne réponse.'
		);

		// 3. Validation de l'exercice
		const finishBtn = wrapper.find( '.next-card-btn' );
		expect( finishBtn.exists() ).toBe( true );
		await finishBtn.trigger( 'click' );

		expect( wrapper.emitted( 'success' ) ).toBeTruthy();
	} );

	test( 'variante pieces : supporte les notations françaises complètes comme Da1 ou Tf4', async () => {
		const config = {
			consigne: 'Trouvez la pièce mystère',
			variante: 'pieces',
			series: [
				{ indices: 'Je suis en a1 (Da1)', piece: 'Da1' },
				{ indices: 'Je suis en f4 (TF4)', piece: 'TF4' },
			],
			metaTitre: 'Exercice Notations FR',
		};

		const wrapper = mount( TypeQuiSuisJe, {
			props: {
				config,
				id: 1204,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const pieceBtns = wrapper.findAll( '.piece-btn' );

		// Carte 1 attend Da1 -> Dame (D)
		const dameBtn = pieceBtns[ 1 ]; // D (Dame)
		await dameBtn.trigger( 'click' );
		expect( wrapper.text() ).toContain( "Bravo ! C'est bien la Dame." );

		// Passer à la carte suivante
		const nextBtn = wrapper.find( '.next-card-btn' );
		await nextBtn.trigger( 'click' );

		// Carte 2 attend TF4 -> Tour (T)
		const tourBtn = wrapper.findAll( '.piece-btn' )[ 2 ]; // T (Tour)
		await tourBtn.trigger( 'click' );
		expect( wrapper.text() ).toContain( "Bravo ! C'est bien la Tour." );
	} );
} );
