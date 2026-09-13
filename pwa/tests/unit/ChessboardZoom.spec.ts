import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Chessboard from '@/components/shared/Chessboard/Chessboard.vue';

// Mock eg-chessboard/vue
vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'TheChessboard',
		props: [
			'diagram',
			'boardConfig',
			'playerColor',
			'mode',
			'stockfishConfig',
			'pieceSet',
			'boardTheme',
		],
		template: '<div class="the-chessboard-mock" />',
	},
} ) );

describe( 'Chessboard - Zoom Universel (Appui long / Clic droit)', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.useFakeTimers();
	} );

	afterEach( () => {
		vi.useRealTimers();
	} );

	it( 'ne déclenche pas le zoom lorsque zoomable est false', async () => {
		const wrapper = mount( Chessboard, {
			props: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				zoomable: false,
			},
		} );

		const wrapperEl = wrapper.find( '.dame-chessboard-wrapper' );
		expect( wrapperEl.classes() ).not.toContain( 'is-zoomable' );

		// Simuler un touchstart et attendre 500ms
		await wrapperEl.trigger( 'touchstart', {
			touches: [ { clientX: 100, clientY: 100 } ],
		} );
		vi.advanceTimersByTime( 600 );
		await wrapper.vm.$nextTick();

		expect(
			document.body.querySelector( '.dame-zoom-overlay' )
		).toBeNull();
	} );

	it( "ouvre la modale de zoom après 500ms d'appui long tactile lorsque zoomable est true", async () => {
		const wrapper = mount( Chessboard, {
			props: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				zoomable: true,
			},
			attachTo: document.body,
		} );

		const wrapperEl = wrapper.find( '.dame-chessboard-wrapper' );
		expect( wrapperEl.classes() ).toContain( 'is-zoomable' );

		// Début du touchstart
		await wrapperEl.trigger( 'touchstart', {
			touches: [ { clientX: 100, clientY: 100 } ],
		} );

		// Avant 500ms : pas encore de zoom
		vi.advanceTimersByTime( 300 );
		await wrapper.vm.$nextTick();
		expect(
			document.body.querySelector( '.dame-zoom-overlay' )
		).toBeNull();

		// À 500ms : le zoom s'ouvre
		vi.advanceTimersByTime( 250 );
		await wrapper.vm.$nextTick();

		const overlay = document.body.querySelector( '.dame-zoom-overlay' );
		expect( overlay ).not.toBeNull();
		expect( overlay?.textContent ).toContain( 'Aperçu de la position' );

		// Nettoyage
		wrapper.unmount();
	} );

	it( 'annule le zoom si un défilement tactile (touchmove) survient', async () => {
		const wrapper = mount( Chessboard, {
			props: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				zoomable: true,
			},
			attachTo: document.body,
		} );

		const wrapperEl = wrapper.find( '.dame-chessboard-wrapper' );

		// Début du touchstart
		await wrapperEl.trigger( 'touchstart', {
			touches: [ { clientX: 100, clientY: 100 } ],
		} );

		// Déplacement significatif (> 10px) simulant un scroll
		await wrapperEl.trigger( 'touchmove', {
			touches: [ { clientX: 100, clientY: 130 } ],
		} );

		vi.advanceTimersByTime( 600 );
		await wrapper.vm.$nextTick();

		expect(
			document.body.querySelector( '.dame-zoom-overlay' )
		).toBeNull();

		wrapper.unmount();
	} );

	it( "ouvre la modale de zoom lors d'un clic droit (contextmenu)", async () => {
		const wrapper = mount( Chessboard, {
			props: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				zoomable: true,
			},
			attachTo: document.body,
		} );

		const wrapperEl = wrapper.find( '.dame-chessboard-wrapper' );
		await wrapperEl.trigger( 'contextmenu' );
		await wrapper.vm.$nextTick();

		const overlay = document.body.querySelector( '.dame-zoom-overlay' );
		expect( overlay ).not.toBeNull();

		// Fermeture via le bouton croix
		const closeBtn = document.body.querySelector(
			'.dame-zoom-close-btn'
		) as HTMLButtonElement;
		expect( closeBtn ).not.toBeNull();
		closeBtn.click();
		await wrapper.vm.$nextTick();

		expect(
			document.body.querySelector( '.dame-zoom-overlay' )
		).toBeNull();

		wrapper.unmount();
	} );

	it( 'ferme la modale lors de la pression sur la touche Échap', async () => {
		const wrapper = mount( Chessboard, {
			props: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				zoomable: true,
			},
			attachTo: document.body,
		} );

		const wrapperEl = wrapper.find( '.dame-chessboard-wrapper' );
		await wrapperEl.trigger( 'contextmenu' );
		await wrapper.vm.$nextTick();

		expect(
			document.body.querySelector( '.dame-zoom-overlay' )
		).not.toBeNull();

		// Simuler touche Escape
		window.dispatchEvent(
			new KeyboardEvent( 'keydown', { key: 'Escape' } )
		);
		await wrapper.vm.$nextTick();

		expect(
			document.body.querySelector( '.dame-zoom-overlay' )
		).toBeNull();

		wrapper.unmount();
	} );
} );
