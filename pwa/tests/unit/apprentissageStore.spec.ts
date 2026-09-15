import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { useApprentissageStore } from '@/stores/apprentissage';
import { queryClient } from '@/queryClient';

vi.mock( '@/utils/safeFetch', () => ( {
	safeFetch: vi.fn(),
} ) );

describe( 'apprentissageStore - selective sync & modified timestamp', () => {
	let app: ReturnType< typeof createApp >;

	beforeEach( () => {
		const pinia = createPinia();
		app = createApp( {} );
		app.use( pinia );
		app.use( VueQueryPlugin, { queryClient } );
		setActivePinia( pinia );
		queryClient.clear();
		vi.clearAllMocks();
	} );

	it( 'preserves cached content if modified timestamp is identical', async () => {
		await app.runWithContext( async () => {
			const store = useApprentissageStore();
			const identityId = 'default';

			// Simuler un contenu déjà en cache
			queryClient.setQueryData( [ 'contenu', 101, identityId ], {
				id: 101,
				titre: 'Exercice 1',
				modified: '2026-09-14 10:00:00',
			} );

			// Simuler le parcours renvoyé avec la même date modified
			queryClient.setQueryData(
				[ 'parcours', identityId ],
				[
					{
						id: 1,
						titre: 'Cours 1',
						niveau: 1,
						playlist: [
							{
								id: 101,
								type: 'roi_exercice',
								titre: 'Exercice 1',
								modified: '2026-09-14 10:00:00',
							},
						],
					},
				]
			);

			const contenu = await store.fetchContenu( 101 );
			expect( contenu ).toBeDefined();
			expect( contenu?.id ).toBe( 101 );
			expect( contenu?.modified ).toBe( '2026-09-14 10:00:00' );
		} );
	} );

	it( 'prefetches only when item is not in cache or modified has changed', async () => {
		await app.runWithContext( async () => {
			const store = useApprentissageStore();
			const identityId = 'default';
			const { safeFetch } = await import( '@/utils/safeFetch' );
			const mockSafeFetch = vi.mocked( safeFetch );

			// 101 a la même date -> ne doit pas être fetché
			queryClient.setQueryData( [ 'contenu', 101, identityId ], {
				id: 101,
				titre: 'Exercice 1',
				modified: '2026-09-14 10:00:00',
			} );

			// Définir le parcours dans le store
			queryClient.setQueryData(
				[ 'parcours', identityId ],
				[
					{
						id: 1,
						titre: 'Cours 1',
						niveau: 1,
						playlist: [
							{
								id: 101,
								type: 'roi_exercice',
								titre: 'Exercice 1',
								modified: '2026-09-14 10:00:00',
							},
							{
								id: 102,
								type: 'roi_exercice',
								titre: 'Exercice 2',
								modified: '2026-09-14 11:00:00',
							},
						],
					},
				]
			);

			mockSafeFetch.mockResolvedValue( {
				ok: true,
				json: async () => ( {
					id: 102,
					titre: 'Exercice 2',
					modified: '2026-09-14 11:00:00',
				} ),
			} as unknown as Response );

			store.prefetchCoursContenus( 1 );

			// Seul 102 a dû déclencher un safeFetch car 101 est déjà à jour
			expect( safeFetch ).toHaveBeenCalledTimes( 1 );
			expect( String( mockSafeFetch.mock.calls[ 0 ][ 0 ] ) ).toContain(
				'/roi/v1/contenu/102'
			);
		} );
	} );
} );
