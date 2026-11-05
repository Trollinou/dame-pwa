import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgendaSegmentView from '@/components/public/agenda/AgendaSegmentView.vue';
import AgendaCalendarView from '@/components/public/agenda/AgendaCalendarView.vue';
import AgendaDetailContent from '@/components/public/agenda/detail/AgendaDetailContent.vue';
import BenevolatSegmentView from '@/components/public/agenda/BenevolatSegmentView.vue';
import BenevolatDetailContent from '@/components/public/agenda/detail/BenevolatDetailContent.vue';
import type { AgendaEvent } from '@/types/api/agenda';
import type { Benevolat } from '@/types/api/benevolat';

const mockPush = vi.fn();
vi.mock( 'vue-router', () => ( {
	useRouter: () => ( {
		push: mockPush,
	} ),
	useRoute: () => ( {
		params: { id: '412' },
	} ),
} ) );

vi.mock( '@/stores/auth', () => ( {
	useAuthStore: () => ( {
		isAuthenticated: true,
		adminMode: false,
		isAdmin: false,
		selectedIdentity: { member_id: 1, name: 'Jean Dupont' },
	} ),
} ) );

vi.mock( '@/stores/agenda', () => ( {
	useAgendaStore: () => ( {
		events: [],
		adminEvents: [],
		isLoading: false,
		isAdminEventsLoading: false,
		fetchMonthEvents: vi.fn(),
	} ),
} ) );

vi.mock( '@/utils/safeFetch', () => ( {
	safeFetch: vi.fn().mockResolvedValue( {
		ok: true,
		json: async () => [],
	} ),
} ) );

const mockBenevolatsList: Benevolat[] = [];

vi.mock( '@/stores/benevolat', () => ( {
	useBenevolatStore: () => ( {
		benevolats: mockBenevolatsList,
		isLoading: false,
		hasUserVoted: vi.fn().mockReturnValue( false ),
		getResponseCount: vi.fn().mockReturnValue( 0 ),
		fetchBenevolatStats: vi.fn().mockResolvedValue( null ),
	} ),
} ) );

vi.mock( '@/stores/unread', () => ( {
	useUnreadStore: () => ( {
		isBenevolatUnread: vi.fn().mockReturnValue( false ),
		markBenevolatAsSeen: vi.fn(),
	} ),
} ) );

describe( 'Liaison Bidirectionnelle Agenda ⟷ Bénévolat (TDD)', () => {
	const commonDirectives = {
		'safe-html': ( el: HTMLElement, binding: { value: string } ) => {
			el.innerHTML = binding.value || '';
		},
	};

	describe( 'Agenda -> Bénévolat', () => {
		const eventWithActiveBenevolat: AgendaEvent = {
			id: 412,
			title: { rendered: "Tournoi d'Automne 2026" },
			meta: {
				_dame_start_date: '2026-11-15',
				_dame_end_date: '2026-11-15',
				_dame_location_name: 'Salle des Fêtes',
				_dame_linked_benevolat_id: 850,
			},
			linked_benevolat: {
				id: 850,
				title: "Bénévoles — Installation & Buvette Tournoi d'Automne",
				slug: 'benevoles-installation-buvette',
				url: 'https://club.local/benevolat/850',
				is_active: true,
			},
		};

		const eventWithoutBenevolat: AgendaEvent = {
			id: 413,
			title: { rendered: 'Entraînement Jeunes' },
			meta: {
				_dame_start_date: '2026-11-16',
				_dame_end_date: '2026-11-16',
			},
			linked_benevolat: null,
		};

		const eventWithInactiveBenevolat: AgendaEvent = {
			id: 414,
			title: { rendered: 'Événement Clôturé' },
			meta: {
				_dame_start_date: '2026-11-17',
				_dame_end_date: '2026-11-17',
			},
			linked_benevolat: {
				id: 851,
				title: 'Bénévoles passés',
				slug: 'benevoles-passes',
				url: 'https://club.local/benevolat/851',
				is_active: false,
			},
		};

		it( 'affiche le badge "🤝 Bénévoles demandés" dans AgendaSegmentView si un appel est actif', () => {
			const wrapper = mount( AgendaSegmentView, {
				props: {
					viewMode: 'list',
					searchQuery: '',
					events: [ eventWithActiveBenevolat, eventWithoutBenevolat, eventWithInactiveBenevolat ],
					isLoading: false,
					todayStr: '2026-11-01',
				},
				global: {
					directives: commonDirectives,
					stubs: {
						SplitMasterDetail: { template: '<div><slot name="master" /><slot name="detail" /></div>' },
						AgendaDetailContent: true,
						AgendaCalendarView: true,
						IonSpinner: true,
						IonList: { template: '<div><slot /></div>' },
						IonItem: { template: '<div class="ion-item-stub"><slot /></div>' },
						IonLabel: { template: '<div class="ion-label-stub"><slot /></div>' },
						IonBadge: { template: '<span class="ion-badge-stub" @click="$emit(\'click\', $event)"><slot /></span>' },
						IonButton: { template: '<button><slot /></button>' },
					},
				},
			} );

			const badges = wrapper.findAll( '.badge-benevolat' );
			expect( badges.length ).toBe( 1 );
			expect( badges[ 0 ].text() ).toContain( 'Bénévoles demandés' );
		} );

		it( 'affiche le badge "🤝 Bénévoles demandés" dans AgendaCalendarView si un appel est actif', () => {
			const wrapper = mount( AgendaCalendarView, {
				props: {
					events: [ eventWithActiveBenevolat ],
					todayStr: '2026-11-15',
				},
				global: {
					directives: commonDirectives,
					stubs: {
						IonButton: { template: '<button><slot /></button>' },
						IonIcon: true,
						IonList: { template: '<div><slot /></div>' },
						IonItem: { template: '<div class="ion-item-stub"><slot /></div>' },
						IonLabel: { template: '<div class="ion-label-stub"><slot /></div>' },
						IonBadge: { template: '<span class="ion-badge-stub" @click="$emit(\'click\', $event)"><slot /></span>' },
					},
				},
			} );

			const badge = wrapper.find( '.badge-benevolat' );
			expect( badge.exists() ).toBe( true );
			expect( badge.text() ).toContain( 'Bénévoles demandés' );
		} );

		it( 'redirige vers le bénévolat au clic sur le badge dans AgendaSegmentView', async () => {
			mockPush.mockClear();
			const wrapper = mount( AgendaSegmentView, {
				props: {
					viewMode: 'list',
					searchQuery: '',
					events: [ eventWithActiveBenevolat ],
					isLoading: false,
					todayStr: '2026-11-01',
				},
				global: {
					directives: commonDirectives,
					stubs: {
						SplitMasterDetail: { template: '<div><slot name="master" /></div>' },
						AgendaDetailContent: true,
						AgendaCalendarView: true,
						IonSpinner: true,
						IonList: { template: '<div><slot /></div>' },
						IonItem: { template: '<div class="ion-item-stub"><slot /></div>' },
						IonLabel: { template: '<div class="ion-label-stub"><slot /></div>' },
						IonBadge: { template: '<span class="ion-badge-stub" @click="$emit(\'click\', $event)"><slot /></span>' },
						IonButton: { template: '<button><slot /></button>' },
					},
				},
			} );

			const badge = wrapper.find( '.badge-benevolat' );
			expect( badge.exists() ).toBe( true );
			await badge.trigger( 'click' );

			expect( mockPush ).toHaveBeenCalledWith( '/benevolat/participation/850' );
		} );

		it( 'affiche la carte "🤝 Appel à bénévoles" avec bouton CTA dans AgendaDetailContent', async () => {
			mockPush.mockClear();
			const wrapper = mount( AgendaDetailContent, {
				props: {
					event: eventWithActiveBenevolat,
					eventId: 412,
				},
				global: {
					directives: commonDirectives,
					stubs: {
						IonCard: { template: '<div class="ion-card-stub"><slot /></div>' },
						IonCardHeader: { template: '<div class="ion-card-header-stub"><slot /></div>' },
						IonCardTitle: { template: '<h2 class="ion-card-title-stub"><slot /></h2>' },
						IonCardContent: { template: '<div class="ion-card-content-stub"><slot /></div>' },
						IonList: { template: '<div><slot /></div>' },
						IonItem: { template: '<div class="ion-item-stub"><slot /></div>' },
						IonLabel: { template: '<div class="ion-label-stub"><slot /></div>' },
						IonIcon: true,
						IonButton: { template: '<button class="ion-button-stub" @click="$emit(\'click\')"><slot /></button>' },
						IonSpinner: true,
						WpContentRenderer: true,
					},
				},
			} );

			const card = wrapper.find( '.card-linked-benevolat' );
			expect( card.exists() ).toBe( true );
			expect( card.text() ).toContain( 'Appel à bénévoles' );
			expect( card.text() ).toContain( "Bénévoles — Installation & Buvette Tournoi d'Automne" );

			const cta = card.find( '.btn-benevolat-cta' );
			expect( cta.exists() ).toBe( true );
			expect( cta.text() ).toContain( 'Participer comme bénévole' );

			await cta.trigger( 'click' );
			expect( mockPush ).toHaveBeenCalledWith( '/benevolat/participation/850' );
		} );

		it( 'ne montre pas la carte Appel à bénévoles si aucun appel actif', () => {
			const wrapper = mount( AgendaDetailContent, {
				props: {
					event: eventWithoutBenevolat,
					eventId: 413,
				},
				global: {
					directives: commonDirectives,
					stubs: {
						IonCard: { template: '<div><slot /></div>' },
						IonCardHeader: true,
						IonCardTitle: true,
						IonCardContent: true,
						IonList: true,
						IonItem: true,
						IonLabel: true,
						IonIcon: true,
						IonButton: true,
						IonSpinner: true,
						WpContentRenderer: true,
					},
				},
			} );

			expect( wrapper.find( '.card-linked-benevolat' ).exists() ).toBe( false );
		} );
	} );

	describe( 'Bénévolat -> Agenda', () => {
		const benevolatWithLinkedAgenda: Benevolat = {
			id: 850,
			modified: '2026-11-05T10:00:00',
			title: { rendered: 'Bénévoles — Installation Tournoi' },
			dame_benevolat_data: [
				{
					date: '2026-11-15',
					time_slots: [ { start: '08:00', end: '10:00', needed: 4 } ],
				},
			],
			linked_agenda: {
				id: 412,
				title: "Tournoi d'Automne 2026",
				start_date: '2026-11-15',
				end_date: '2026-11-15',
				location: 'Salle Municipale des Fêtes',
				url: 'https://club.local/agenda/tournoi-d-automne-2026/',
			},
			meta: {
				_dame_linked_agenda_id: 412,
			},
		};

		const benevolatWithoutAgenda: Benevolat = {
			id: 852,
			modified: '2026-11-05T10:00:00',
			title: { rendered: 'Permanence bibliothèque' },
			dame_benevolat_data: [
				{
					date: '2026-11-20',
					time_slots: [ { start: '14:00', end: '16:00', needed: 2 } ],
				},
			],
			linked_agenda: null,
		};

		it( 'affiche la pastille "📅 Événement associé" dans BenevolatSegmentView si lié et redirige au clic', async () => {
			mockPush.mockClear();
			mockBenevolatsList.length = 0;
			mockBenevolatsList.push( benevolatWithLinkedAgenda, benevolatWithoutAgenda );

			const wrapper = mount( BenevolatSegmentView, {
				props: {
					searchQuery: '',
					todayStr: '2026-11-01',
				},
				global: {
					directives: commonDirectives,
					stubs: {
						SplitMasterDetail: { template: '<div><slot name="master" /><slot name="detail" /></div>' },
						BenevolatDetailContent: true,
						IonSpinner: true,
						IonList: { template: '<div><slot /></div>' },
						IonListHeader: { template: '<div><slot /></div>' },
						IonItem: { template: '<div class="ion-item-stub"><slot /></div>' },
						IonLabel: { template: '<div class="ion-label-stub"><slot /></div>' },
						IonBadge: { template: '<span class="ion-badge-stub" @click="$emit(\'click\', $event)"><slot /></span>' },
						IonIcon: true,
					},
				},
			} );

			const badges = wrapper.findAll( '.badge-linked-agenda' );
			expect( badges.length ).toBe( 1 );
			expect( badges[ 0 ].text() ).toContain( 'Événement associé' );

			await badges[ 0 ].trigger( 'click' );
			expect( mockPush ).toHaveBeenCalledWith( '/agenda/412' );
		} );

		it( 'affiche la bannière ".banner-linked-agenda" dans BenevolatDetailContent avec navigation au clic', async () => {
			mockPush.mockClear();
			const wrapper = mount( BenevolatDetailContent, {
				props: {
					benevolat: benevolatWithLinkedAgenda,
					benevolatId: 850,
					isAdmin: false,
				},
				global: {
					directives: commonDirectives,
					stubs: {
						IonList: { template: '<div><slot /></div>' },
						IonListHeader: { template: '<div><slot /></div>' },
						IonItem: { template: '<div><slot /></div>' },
						IonItemDivider: { template: '<div><slot /></div>' },
						IonLabel: { template: '<div><slot /></div>' },
						IonCheckbox: true,
						IonButton: { template: '<button><slot /></button>' },
						IonSpinner: true,
						IonCard: true,
						IonCardHeader: true,
						IonCardSubtitle: true,
						IonCardContent: true,
						IonAccordion: true,
						IonAccordionGroup: true,
						IonChip: true,
						IonBadge: { template: '<span class="ion-badge-stub"><slot /></span>' },
						IonIcon: true,
					},
				},
			} );

			const banner = wrapper.find( '.banner-linked-agenda' );
			expect( banner.exists() ).toBe( true );
			expect( banner.text() ).toContain( "Tournoi d'Automne 2026" );
			expect( banner.text() ).toContain( '15/11/2026' );

			await banner.trigger( 'click' );
			expect( mockPush ).toHaveBeenCalledWith( '/agenda/412' );
		} );

		it( 'ne montre pas la bannière dans BenevolatDetailContent si aucun événement associé', () => {
			const wrapper = mount( BenevolatDetailContent, {
				props: {
					benevolat: benevolatWithoutAgenda,
					benevolatId: 852,
					isAdmin: false,
				},
				global: {
					directives: commonDirectives,
					stubs: {
						IonList: true,
						IonListHeader: true,
						IonItem: true,
						IonItemDivider: true,
						IonLabel: true,
						IonCheckbox: true,
						IonButton: true,
						IonSpinner: true,
						IonCard: true,
						IonCardHeader: true,
						IonCardSubtitle: true,
						IonCardContent: true,
						IonAccordion: true,
						IonAccordionGroup: true,
						IonChip: true,
						IonBadge: true,
						IonIcon: true,
					},
				},
			} );

			expect( wrapper.find( '.banner-linked-agenda' ).exists() ).toBe( false );
		} );
	} );

	describe( 'Bouton d’appel à bénévole issu d’un shortcode dans un article', () => {
		it( 'intercepte le clic sur le bouton d’appel à bénévole et navigue vers la participation', async () => {
			mockPush.mockClear();
			const { useInternalLinks } = await import( '@/composables/core/useInternalLinks' );
			const { handleInternalLinks } = useInternalLinks();

			const button = document.createElement( 'ion-button' );
			button.setAttribute( 'data-path', '/tabs/benevolat/participation/18045' );
			const innerSpan = document.createElement( 'span' );
			innerSpan.textContent = 'Proposer mon aide';
			button.appendChild( innerSpan );

			const fakeEvent = {
				target: button,
				preventDefault: vi.fn(),
				composedPath: () => [ innerSpan, button ],
			} as unknown as MouseEvent;

			handleInternalLinks( fakeEvent );

			expect( fakeEvent.preventDefault ).toHaveBeenCalled();
			expect( mockPush ).toHaveBeenCalledWith( '/tabs/benevolat/participation/18045' );
		} );
	} );
} );
