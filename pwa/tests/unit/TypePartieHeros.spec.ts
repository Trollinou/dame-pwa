import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypePartieHeros from '@/views/types/TypePartieHeros.vue';

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
      </div>
    `,
	},
} ) );

describe( 'TypePartieHeros.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	const samplePgn = `[Event "Partie Héros Demo"]
[FEN "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"]
[SetUp "1"]

{ Position de départ }
1. Bb5 a6 (1... Nf6 2. O-O { Berlin }) 2. Ba4 Nf6 *`;

	const sampleConfig = {
		consigne: 'Revivez la partie du héros et trouvez le bon coup.',
		pgn: samplePgn,
		metaTitre: 'Partie Héros Test',
		metaTypeLabel: 'Partie du Héros',
		metaChapitreNiveauLabel: 'Niveau 1',
	};

	test( 'affiche les contrôles de navigation PGN sans le bouton Fin', () => {
		const wrapper = mount( TypePartieHeros, {
			props: {
				config: sampleConfig,
				id: 44,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		// Vérifie l'en-tête
		expect( wrapper.text() ).toContain( 'Partie Héros Test' );

		// Vérifie la présence des boutons Début, Précédent, Suivant
		const debutBtn = wrapper.find( 'ion-button[title="Début"]' );
		const prevBtn = wrapper.find( 'ion-button[title="Précédent"]' );
		const nextBtn = wrapper.find( 'ion-button[title="Suivant"]' );
		const finBtn = wrapper.find( 'ion-button[title="Fin"]' );

		expect( debutBtn.exists() ).toBe( true );
		expect( prevBtn.exists() ).toBe( true );
		expect( nextBtn.exists() ).toBe( true );
		expect( finBtn.exists() ).toBe( false );
	} );
} );
