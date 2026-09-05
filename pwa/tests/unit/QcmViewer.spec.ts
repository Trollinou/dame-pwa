import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import QcmViewer from '@/components/shared/QcmViewer.vue';

// Mock eg-chessboard
vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'EgChessboard',
		props: [ 'diagram', 'boardConfig', 'stockfishConfig' ],
		emits: [ 'board-created' ],
		template: '<div class="mock-eg-chessboard"></div>',
	},
} ) );

describe( 'QcmViewer.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	test( 'affiche le SeriesCardFooter même pour un QCM unique (totalCards = 1)', async () => {
		const wrapper = mount( QcmViewer, {
			props: {
				question: 'Quel est le coup ?',
				choix: [ 'e4', 'd4', 'c4' ],
				bonneReponse: 0,
				currentCard: 1,
				totalCards: 1,
			},
		} );

		// Le footer est présent dès l’affichage du QCM
		const footer = wrapper.find( '.series-card-footer' );
		expect( footer.exists() ).toBe( true );
		expect( wrapper.find( '.card-badge' ).text() ).toBe( 'Carte 1 / 1' );
		expect( wrapper.find( '.pending-hint' ).text() ).toBe(
			'Trouvez la solution pour continuer'
		);

		// Clic sur la bonne réponse
		const buttons = wrapper.findAll( '.choice-btn' );
		await buttons[ 0 ].trigger( 'click' );

		// Le footer passe en mode résolu
		expect( wrapper.find( '.feedback-success' ).exists() ).toBe( true );
		expect( wrapper.find( '.feedback-message' ).text() ).toContain(
			'Bien joué ! Bonne réponse.'
		);
	} );

	test( 'affiche le feedback d’erreur lors d’un mauvais choix sans bloquer', async () => {
		const wrapper = mount( QcmViewer, {
			props: {
				question: 'Quel est le coup ?',
				choix: [ 'e4', 'd4', 'c4' ],
				bonneReponse: 0,
				currentCard: 1,
				totalCards: 1,
			},
		} );

		const buttons = wrapper.findAll( '.choice-btn' );
		await buttons[ 1 ].trigger( 'click' ); // Mauvaise réponse 'd4'

		expect( wrapper.find( '.feedback-danger' ).exists() ).toBe( true );
		expect( wrapper.find( '.feedback-message' ).text() ).toContain(
			'Mauvaise réponse, essaie encore !'
		);
		// Toujours pas résolu
		expect( wrapper.find( '.pending-hint' ).exists() ).toBe( true );
	} );
} );
