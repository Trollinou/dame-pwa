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

	it( 'fetchParcours(true) and fetchProgression(true) invalidate queries and refetch with cache: no-store', async () => {
		await app.runWithContext( async () => {
			const { useAuthStore } = await import( '@/stores/auth' );
			const authStore = useAuthStore();
			authStore.token = 'fake-jwt-token';

			const store = useApprentissageStore();
			const { safeFetch } = await import( '@/utils/safeFetch' );
			const mockSafeFetch = vi.mocked( safeFetch );

			mockSafeFetch.mockImplementation( async ( url ) => {
				if ( String( url ).includes( '/roi/v1/parcours' ) ) {
					return {
						ok: true,
						json: async () => [
							{
								id: 1,
								titre: 'Cours Mis à Jour',
								niveau: 1,
								playlist: [
									{
										id: 201,
										type: 'roi_exercice',
										titre: 'Nouvel Exercice',
										modified: '2026-11-20 12:00:00',
									},
								],
							},
						],
					} as unknown as Response;
				}
				return {
					ok: true,
					json: async () => [ 201 ],
				} as unknown as Response;
			} );

			await Promise.all( [
				store.fetchParcours( true ),
				store.fetchProgression( true ),
			] );

			expect( store.parcours ).toHaveLength( 1 );
			expect( store.parcours[ 0 ].playlist ).toHaveLength( 1 );
			expect( store.parcours[ 0 ].playlist[ 0 ].id ).toBe( 201 );
			expect( store.elementsValides ).toEqual( [ 201 ] );

			const parcoursCall = mockSafeFetch.mock.calls.find( ( c ) =>
				String( c[ 0 ] ).includes( '/roi/v1/parcours' )
			);
			const progressionCall = mockSafeFetch.mock.calls.find( ( c ) =>
				String( c[ 0 ] ).includes( '/roi/v1/progression' )
			);

			expect( parcoursCall?.[ 1 ]?.cache ).toBe( 'no-store' );
			expect( progressionCall?.[ 1 ]?.cache ).toBe( 'no-store' );
		} );
	} );

	it( 'computes niveauxDisponibles, prochainContenuAReprendre and getProchainCours', async () => {
		await app.runWithContext( async () => {
			const store = useApprentissageStore();
			const identityId = 'default';

			queryClient.setQueryData(
				[ 'parcours', identityId ],
				[
					{
						id: 1,
						titre: 'Cours 1',
						niveau: 1,
						chapitre_nom: 'Matérialité',
						chapitre_couleur: 'primary',
						ordre: 1,
						audience_type: 'all',
						target_groups: [],
						target_members: [],
						is_assigned: false,
						unlocked_by_assignment: false,
						playlist: [
							{ id: 101, type: 'roi_exercice', titre: 'Ex 1' },
							{ id: 102, type: 'roi_exercice', titre: 'Ex 2' },
						],
					},
					{
						id: 2,
						titre: 'Cours 2',
						niveau: 2,
						chapitre_nom: 'Activité',
						chapitre_couleur: 'secondary',
						ordre: 2,
						audience_type: 'all',
						target_groups: [],
						target_members: [],
						is_assigned: false,
						unlocked_by_assignment: false,
						playlist: [
							{ id: 201, type: 'roi_exercice', titre: 'Ex 3' },
						],
					},
					{
						id: 3,
						titre: 'Cours Assigné',
						niveau: 3,
						chapitre_nom: 'Sécurité',
						chapitre_couleur: 'tertiary',
						ordre: 3,
						audience_type: 'restricted',
						target_groups: [],
						target_members: [],
						is_assigned: true,
						unlocked_by_assignment: true,
						playlist: [
							{ id: 301, type: 'roi_exercice', titre: 'Ex 4' },
						],
					},
				]
			);

			// Ex 101 validé -> prochain = Cours 1, Ex 102
			queryClient.setQueryData( [ 'progression', identityId ], [ 101 ] );

			expect( store.niveauxDisponibles ).toEqual( [ 1, 2 ] );
			expect( store.prochainContenuAReprendre?.cours.id ).toBe( 1 );
			expect( store.prochainContenuAReprendre?.item.id ).toBe( 102 );
			expect( store.prochainContenuAReprendre?.playlistIndex ).toBe( 1 );
			expect( store.getProchainCours( 1 )?.id ).toBe( 2 );
			expect( store.getProchainCours( 2 ) ).toBeNull();

			// Tout validé -> prochain = null
			queryClient.setQueryData(
				[ 'progression', identityId ],
				[ 101, 102, 201 ]
			);
			expect( store.prochainContenuAReprendre ).toBeNull();
		} );
	} );
} );
