import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import BenevolatDetailContent from '@/components/public/agenda/detail/BenevolatDetailContent.vue';
import type { Benevolat } from '@/stores/benevolat';

vi.mock( '@/stores/auth/jwtService', async ( importOriginal ) => {
	const actual = await importOriginal< typeof import( '@/stores/auth/jwtService' ) >();
	return {
		...actual,
		createJwtSdk: () => ( {
			isAuthenticated: vi.fn().mockReturnValue( false ),
			getJwt: vi.fn().mockReturnValue( null ),
			getValidJwt: vi.fn().mockResolvedValue( null ),
			setTokens: vi.fn(),
			clearTokens: vi.fn(),
			logout: vi.fn(),
			fetchWithAuth: vi.fn().mockResolvedValue( {
				ok: true,
				json: async () => ( { choices: [] } ),
			} ),
		} ),
	};
} );

// Mock v-safe-html directive
const vSafeHtml = {
	mounted( el: HTMLElement, binding: { value: string } ) {
		el.innerHTML = binding.value || '';
	},
	updated( el: HTMLElement, binding: { value: string } ) {
		el.innerHTML = binding.value || '';
	},
};

const mockBenevolat: Benevolat = {
	id: 42,
	modified: '2026-11-20T10:00:00',
	title: { rendered: 'Festival du Jeu - Accueil' },
	content: { rendered: '<p>Aide à l’organisation</p>' },
	dame_benevolat_data: [
		{
			date: '2026-11-20',
			time_slots: [
				{
					start: '09:00',
					end: '12:00',
					needed: 3,
				},
				{
					start: '14:00',
					end: '18:00',
					needed: 2,
				},
				{
					start: '18:00',
					end: '20:00',
					needed: 0,
				},
			],
		},
	],
	dame_benevolat_counts: {
		'0_0': 1,
		'0_1': 2,
		'0_2': 1,
	},
};

describe( 'Benevolat - Nombre de bénévoles souhaités par tranche horaire', () => {
	let app: ReturnType< typeof createApp >;

	beforeEach( () => {
		localStorage.clear();
		const pinia = createPinia();
		app = createApp( {} );
		app.use( pinia );
		app.use( VueQueryPlugin, { queryClient } );
		setActivePinia( pinia );
		queryClient.clear();
		vi.clearAllMocks();
	} );

	it( 'affiche le format (X inscrit(s) / Y souhaité(s)) en mode public', async () => {
		const authStore = ( await import( '@/stores/auth' ) ).useAuthStore();
		authStore.token = 'mock_valid_token_12345';

		const wrapper = mount( BenevolatDetailContent, {
			props: {
				benevolat: mockBenevolat,
				benevolatId: 42,
				isAdmin: false,
			},
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
				directives: {
					'safe-html': vSafeHtml,
				},
				stubs: {
					'ion-spinner': true,
					'ion-list-header': true,
					'ion-list': {
						template: '<div class="ion-list-stub"><slot /></div>',
					},
					'ion-item': {
						template: '<div class="ion-item-stub"><slot /></div>',
					},
					'ion-item-divider': true,
					'ion-label': true,
					'ion-checkbox': {
						template: '<div class="ion-checkbox-stub"><slot /></div>',
					},
					'ion-button': true,
					'ion-card': true,
					'ion-card-header': true,
					'ion-card-subtitle': true,
					'ion-card-content': true,
					'ion-accordion': true,
					'ion-accordion-group': true,
					'ion-chip': true,
					'ion-badge': true,
				},
			},
		} );

		await wrapper.vm.$nextTick();

		const slotCounts = wrapper.findAll( '.slot-count' );
		expect( slotCounts.length ).toBe( 3 );

		// Créneau 1: needed = 3, count = 1 -> (1 inscrit / 3 souhaités)
		expect( slotCounts[ 0 ].text() ).toBe( '(1 inscrit / 3 souhaités)' );

		// Créneau 2: needed = 2, count = 2 -> (2 inscrits / 2 souhaités)
		expect( slotCounts[ 1 ].text() ).toBe( '(2 inscrits / 2 souhaités)' );

		// Créneau 3: needed = 0, count = 1 -> (1 inscrit)
		expect( slotCounts[ 2 ].text() ).toBe( '(1 inscrit)' );
	} );

	it( 'affiche le ratio et la couleur de badge correspondante en mode admin', async () => {
		const wrapper = mount( BenevolatDetailContent, {
			props: {
				benevolat: mockBenevolat,
				benevolatId: 42,
				isAdmin: true,
			},
			global: {
				plugins: [ [ VueQueryPlugin, { queryClient } ] ],
				directives: {
					'safe-html': vSafeHtml,
				},
				stubs: {
					'ion-spinner': true,
					'ion-list-header': true,
					'ion-list': true,
					'ion-item': true,
					'ion-item-divider': true,
					'ion-label': true,
					'ion-checkbox': true,
					'ion-button': true,
					'ion-card': {
						template: '<div class="ion-card-stub"><slot /></div>',
					},
					'ion-card-header': {
						template: '<div class="ion-card-header-stub"><slot /></div>',
					},
					'ion-card-subtitle': true,
					'ion-card-content': true,
					'ion-accordion': {
						template: '<div class="ion-accordion-stub"><slot /><slot name="content" /></div>',
					},
					'ion-accordion-group': {
						template: '<div class="ion-accordion-group-stub"><slot /></div>',
					},
					'ion-chip': true,
					'ion-badge': {
						props: [ 'color' ],
						template: '<span class="ion-badge-stub" :data-color="color"><slot /></span>',
					},
				},
			},
		} );

		await wrapper.vm.$nextTick();

		const badges = wrapper.findAll( '.slot-ratio-badge' );
		expect( badges.length ).toBe( 3 );

		// Créneau 1: 1 / 3 souhaité(s) -> incomplet -> color="danger" (rouge)
		expect( badges[ 0 ].text() ).toBe( '1 / 3 souhaité(s)' );
		expect( badges[ 0 ].attributes( 'data-color' ) ).toBe( 'danger' );

		// Créneau 2: 2 / 2 souhaité(s) -> atteint -> color="primary" (bleu)
		expect( badges[ 1 ].text() ).toBe( '2 / 2 souhaité(s)' );
		expect( badges[ 1 ].attributes( 'data-color' ) ).toBe( 'primary' );

		// Créneau 3: needed = 0, count = 1 -> color="medium"
		expect( badges[ 2 ].text() ).toBe( '1 inscrit' );
		expect( badges[ 2 ].attributes( 'data-color' ) ).toBe( 'medium' );
	} );
} );
