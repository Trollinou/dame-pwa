import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import { useAgendaStore, type AgendaEvent } from '@/stores/agenda';

vi.mock( '@/utils/safeFetch', () => ( {
	safeFetch: vi.fn(),
} ) );

import { safeFetch } from '@/utils/safeFetch';

describe( 'useAgendaStore - Chargement direct des événements à venir', () => {
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

	it( 'fetchAgenda charge directement tous les événements à venir et conserve les événements passés en cache', async () => {
		await app.runWithContext( async () => {
			const store = useAgendaStore();

			// Simuler un événement passé déjà présent en cache mémoire (ex: chargé via le calendrier)
			const pastEvent: AgendaEvent = {
				id: 99,
				title: { rendered: 'Ancien match' },
				meta: { _dame_start_date: '2026-08-01', _dame_end_date: '2026-08-01' },
			} as unknown as AgendaEvent;
			store.events = [ pastEvent ];

			const upcomingEvents: AgendaEvent[] = [
				{
					id: 101,
					title: { rendered: 'Tournoi Futur 1' },
					meta: { _dame_start_date: '2026-11-01', _dame_end_date: '2026-11-01' },
				} as unknown as AgendaEvent,
				{
					id: 102,
					title: { rendered: 'Tournoi Futur 2' },
					meta: { _dame_start_date: '2026-12-01', _dame_end_date: '2026-12-01' },
				} as unknown as AgendaEvent,
			];

			vi.mocked( safeFetch ).mockResolvedValueOnce( {
				ok: true,
				status: 200,
				headers: {
					get: ( header: string ) => {
						if ( header.toLowerCase() === 'x-wp-totalpages' ) {
							return '1';
						}
						return null;
					},
				},
				json: async () => upcomingEvents,
			} as unknown as Response );

			await store.fetchAgenda();

			// Doit contenir le passé (conservé pour le calendrier) + les 2 futurs chargés directement
			expect( store.events.length ).toBe( 3 );
			expect( store.events.map( ( e ) => e.id ) ).toEqual( [ 99, 101, 102 ] );
			expect( store.hasMoreUpcoming ).toBe( false );
		} );
	} );

	it( 'fetchAllUpcoming gère plusieurs pages pour récupérer la totalité des événements futurs', async () => {
		await app.runWithContext( async () => {
			const store = useAgendaStore();

			const page1: AgendaEvent[] = [
				{
					id: 1,
					title: { rendered: 'Ev 1' },
					meta: { _dame_start_date: '2026-11-01' },
				} as unknown as AgendaEvent,
			];
			const page2: AgendaEvent[] = [
				{
					id: 2,
					title: { rendered: 'Ev 2' },
					meta: { _dame_start_date: '2026-11-05' },
				} as unknown as AgendaEvent,
			];

			vi.mocked( safeFetch )
				.mockResolvedValueOnce( {
					ok: true,
					status: 200,
					headers: {
						get: ( header: string ) => {
							if ( header.toLowerCase() === 'x-wp-totalpages' ) {
								return '2';
							}
							return null;
						},
					},
					json: async () => page1,
				} as unknown as Response )
				.mockResolvedValueOnce( {
					ok: true,
					status: 200,
					headers: {
						get: () => null,
					},
					json: async () => page2,
				} as unknown as Response );

			const allData = await store.fetchAllUpcoming( '2026-10-20' );

			expect( allData ).toHaveLength( 2 );
			expect( allData?.map( ( e ) => e.id ) ).toEqual( [ 1, 2 ] );
		} );
	} );
} );

