import { describe, expect, test, beforeEach } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PgnViewer from '@/components/shared/PgnViewer.vue';

describe( 'PgnViewer.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	// Helper to create a fake BoardCore
	const createMockBoardApi = ( totalMoves: number ) => {
		let currentPly = 0;
		let isEnabled = totalMoves > 0;

		return {
			loadPgn: () => {
				currentPly = 0;
				isEnabled = totalMoves > 0;
			},
			getCurrentComment: () => '',
			getCurrentPlyNumber: () => totalMoves,
			getHistoryViewerState: () => ( {
				isEnabled,
				plyViewing: isEnabled ? currentPly : undefined,
			} ),
			getShapes: () => [],
			setShapes: () => {},
			redraw: () => {},
			viewStart: () => {
				isEnabled = true;
				currentPly = 0;
			},
			viewPrevious: () => {
				if ( currentPly > 0 ) {
					currentPly--;
					isEnabled = true;
				}
			},
			viewNext: () => {
				if ( currentPly < totalMoves ) {
					currentPly++;
					isEnabled = true;
				}
			},
			stopViewingHistory: () => {
				isEnabled = false;
				currentPly = totalMoves;
			},
		};
	};

	const getNavButton = ( wrapper: VueWrapper, title: string ) => {
		const btn = wrapper
			.findAllComponents( { name: 'IonButton' } )
			.find( ( b ) => b.attributes( 'title' ) === title );
		if ( ! btn ) {
			throw new Error( `Bouton avec titre "${ title }" introuvable` );
		}
		return btn;
	};

	test( 'désactive Début et Précédent à la position initiale (ply 0)', async () => {
		const mockApi = createMockBoardApi( 3 );
		const wrapper = mount( PgnViewer, {
			props: {
				pgnString: '1. e4 e5 2. Nf3',
			},
			global: {
				stubs: {
					Chessboard: {
						template: '<div class="mock-chessboard"></div>',
						emits: [ 'board-created' ],
						mounted() {
							this.$emit( 'board-created', mockApi );
						},
					},
				},
			},
		} );

		await flushPromises();

		expect( getNavButton( wrapper, 'Début' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Précédent' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Suivant' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Fin' ).props( 'disabled' ) ).toBe(
			false
		);
	} );

	test( "active tous les boutons lors d'un coup intermédiaire", async () => {
		const mockApi = createMockBoardApi( 3 );
		const wrapper = mount( PgnViewer, {
			props: {
				pgnString: '1. e4 e5 2. Nf3',
			},
			global: {
				stubs: {
					Chessboard: {
						template: '<div class="mock-chessboard"></div>',
						emits: [ 'board-created' ],
						mounted() {
							this.$emit( 'board-created', mockApi );
						},
					},
				},
			},
		} );

		await flushPromises();

		const nextBtn = getNavButton( wrapper, 'Suivant' );
		await nextBtn.trigger( 'click' );
		await flushPromises();

		expect( getNavButton( wrapper, 'Début' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Précédent' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Suivant' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Fin' ).props( 'disabled' ) ).toBe(
			false
		);
	} );

	test( 'désactive Suivant et Fin sur le dernier coup du PGN', async () => {
		const mockApi = createMockBoardApi( 2 );
		const wrapper = mount( PgnViewer, {
			props: {
				pgnString: '1. e4 e5',
			},
			global: {
				stubs: {
					Chessboard: {
						template: '<div class="mock-chessboard"></div>',
						emits: [ 'board-created' ],
						mounted() {
							this.$emit( 'board-created', mockApi );
						},
					},
				},
			},
		} );

		await flushPromises();

		const nextBtn = getNavButton( wrapper, 'Suivant' );
		// Coup 1
		await nextBtn.trigger( 'click' );
		await flushPromises();
		// Coup 2 (dernier coup)
		await nextBtn.trigger( 'click' );
		await flushPromises();

		expect( getNavButton( wrapper, 'Début' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Précédent' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Suivant' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Fin' ).props( 'disabled' ) ).toBe(
			true
		);
	} );

	test( 'réactive Suivant et Fin après un recul depuis la fin', async () => {
		const mockApi = createMockBoardApi( 2 );
		const wrapper = mount( PgnViewer, {
			props: {
				pgnString: '1. e4 e5',
			},
			global: {
				stubs: {
					Chessboard: {
						template: '<div class="mock-chessboard"></div>',
						emits: [ 'board-created' ],
						mounted() {
							this.$emit( 'board-created', mockApi );
						},
					},
				},
			},
		} );

		await flushPromises();

		// Aller directement à la fin
		await getNavButton( wrapper, 'Fin' ).trigger( 'click' );
		await flushPromises();

		expect( getNavButton( wrapper, 'Suivant' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Fin' ).props( 'disabled' ) ).toBe(
			true
		);

		// Reculer d'un coup
		await getNavButton( wrapper, 'Précédent' ).trigger( 'click' );
		await flushPromises();

		expect( getNavButton( wrapper, 'Début' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Précédent' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Suivant' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Fin' ).props( 'disabled' ) ).toBe(
			false
		);

		// Revenir au début
		await getNavButton( wrapper, 'Début' ).trigger( 'click' );
		await flushPromises();

		expect( getNavButton( wrapper, 'Début' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Précédent' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Suivant' ).props( 'disabled' ) ).toBe(
			false
		);
		expect( getNavButton( wrapper, 'Fin' ).props( 'disabled' ) ).toBe(
			false
		);
	} );

	test( 'désactive tous les boutons si le PGN ne contient aucun coup', async () => {
		const mockApi = createMockBoardApi( 0 );
		const wrapper = mount( PgnViewer, {
			props: {
				pgnString: '[Event "Test"]',
			},
			global: {
				stubs: {
					Chessboard: {
						template: '<div class="mock-chessboard"></div>',
						emits: [ 'board-created' ],
						mounted() {
							this.$emit( 'board-created', mockApi );
						},
					},
				},
			},
		} );

		await flushPromises();

		expect( getNavButton( wrapper, 'Début' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Précédent' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Suivant' ).props( 'disabled' ) ).toBe(
			true
		);
		expect( getNavButton( wrapper, 'Fin' ).props( 'disabled' ) ).toBe(
			true
		);
	} );
} );
