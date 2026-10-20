import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import AgendaSegmentView from '@/components/public/agenda/AgendaSegmentView.vue';
import type { AgendaEvent } from '@/stores/agenda';

describe( 'AgendaSegmentView.vue - Liste filtrée aux événements en cours ou futurs', () => {
	const mockEvents: AgendaEvent[] = [
		{
			id: 1,
			title: { rendered: 'Tournoi Passé', raw: 'Tournoi Passé' },
			meta: {
				_dame_start_date: '2026-09-01',
				_dame_end_date: '2026-09-01',
				_dame_start_time: '10:00',
				_dame_end_time: '12:00',
				_dame_location_name: 'Club',
			},
		} as unknown as AgendaEvent,
		{
			id: 2,
			title: { rendered: 'Événement d’aujourd’hui', raw: 'Événement d’aujourd’hui' },
			meta: {
				_dame_start_date: '2026-10-20',
				_dame_end_date: '2026-10-20',
				_dame_start_time: '14:00',
				_dame_end_time: '16:00',
				_dame_location_name: 'Salle Principale',
			},
		} as unknown as AgendaEvent,
		{
			id: 3,
			title: { rendered: 'Grand Prix Futur', raw: 'Grand Prix Futur' },
			meta: {
				_dame_start_date: '2026-11-15',
				_dame_end_date: '2026-11-16',
				_dame_start_time: '09:00',
				_dame_end_time: '18:00',
				_dame_location_name: 'Palais des Congrès',
			},
		} as unknown as AgendaEvent,
	];

	const defaultProps = {
		viewMode: 'list' as const,
		searchQuery: '',
		events: mockEvents,
		isLoading: false,
		todayStr: '2026-10-20',
	};

	const globalConfig = {
		directives: {
			'safe-html': ( el: HTMLElement, binding: { value: string } ) => {
				el.innerHTML = binding.value || '';
			},
		},
		stubs: {
			SplitMasterDetail: {
				template: '<div><slot name="master" /><slot name="detail" /></div>',
			},
			AgendaDetailContent: true,
			AgendaCalendarView: true,
			IonSpinner: true,
			IonList: { template: '<div><slot /></div>' },
			IonItem: { template: '<div class="ion-item-stub"><slot /></div>' },
			IonLabel: { template: '<div class="ion-label-stub"><slot /></div>' },
			IonBadge: { template: '<span class="ion-badge-stub"><slot /></span>' },
			IonButton: { template: '<button><slot /></button>' },
		},
	};

	test( 'exclut strictement les événements antérieurs dans la vue liste', () => {
		const wrapper = mount( AgendaSegmentView, {
			props: defaultProps,
			global: globalConfig,
		} );

		// Seuls les événements 2 (aujourd'hui) et 3 (futur) doivent apparaître
		const items = wrapper.findAll( '.ion-item-stub' );
		expect( items.length ).toBe( 2 );

		// Vérifier que le titre de l'événement passé n'apparaît nulle part
		expect( wrapper.text() ).not.toContain( 'Tournoi Passé' );
		expect( wrapper.text() ).toContain( 'Événement d’aujourd’hui' );
		expect( wrapper.text() ).toContain( 'Grand Prix Futur' );
	} );

	test( 'ne contient aucun composant ion-infinite-scroll dans le template', () => {
		const wrapper = mount( AgendaSegmentView, {
			props: defaultProps,
			global: globalConfig,
		} );

		expect( wrapper.find( 'ion-infinite-scroll' ).exists() ).toBe( false );
	} );

	test( 'filtre par recherche parmi les événements en cours ou futurs', async () => {
		const wrapper = mount( AgendaSegmentView, {
			props: {
				...defaultProps,
				searchQuery: 'Congrès',
			},
			global: globalConfig,
		} );

		const items = wrapper.findAll( '.ion-item-stub' );
		expect( items.length ).toBe( 1 );
		expect( wrapper.text() ).toContain( 'Grand Prix Futur' );
		expect( wrapper.text() ).not.toContain( 'Événement d’aujourd’hui' );
	} );

	test( 'bascule vers AgendaCalendarView en mode calendrier', () => {
		const wrapper = mount( AgendaSegmentView, {
			props: {
				...defaultProps,
				viewMode: 'calendar',
			},
			global: globalConfig,
		} );

		expect( wrapper.findComponent( { name: 'AgendaCalendarView' } ).exists() ).toBe( true );
	} );
} );

