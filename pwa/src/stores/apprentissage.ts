import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useAuthStore } from './auth';
import { safeFetch } from '@/utils/safeFetch';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { DrawShape } from 'eg-chessboard';

export interface ExerciceConfig {
	shapes?: DrawShape[];
	[ key: string ]: unknown;
}

export interface Contenu {
	id: number;
	titre: string;
	post_type: string;
	chapitre_nom: string;
	chapitre_couleur: string;
	niveau: number;
	type?: number;
	config?: ExerciceConfig;
	contenu_html?: string;
	video_url?: string;
	video_id?: string;
	duree?: string;
	modified?: string;
}

export interface PlaylistItem {
	type: string;
	id: number;
	titre?: string;
	modified?: string;
}

export interface Cours {
	id: number;
	titre: string;
	niveau: number;
	chapitre_nom: string;
	chapitre_couleur: string;
	playlist: PlaylistItem[];
	is_assigned?: boolean;
	unlocked_by_assignment?: boolean;
	audience_type?: string;
	target_groups?: number[];
	target_members?: number[];
}

export const useApprentissageStore = defineStore( 'apprentissage', () => {
	const authStore = useAuthStore();
	const queryClient = useQueryClient();

	const contenuActuelId = ref< number | null >( null );
	const isCustomLoading = ref( false );

	// Headers de sécurité
	const getAuthHeaders = (): Record< string, string > => {
		const token = localStorage.getItem( 'dame_jwt_token' );
		const headers: Record< string, string > = {
			'Content-Type': 'application/json',
		};
		if ( token ) {
			headers.Authorization = `Bearer ${ token }`;
		}
		if ( authStore.selectedIdentity?.id ) {
			headers[ 'X-Selected-Identity' ] = authStore.selectedIdentity.id;
		}
		return headers;
	};

	// 1. Query des Parcours
	const {
		data: queryParcours,
		isLoading: isParcoursLoading,
		refetch: refetchParcours,
	} = useQuery< Cours[] >( {
		queryKey: computed( () => [
			'parcours',
			authStore.selectedIdentity?.id || 'default',
		] ),
		enabled: computed( () => authStore.isAuthenticated ),
		queryFn: async () => {
			const apiUrl = import.meta.env.VITE_API_BASE_URL;
			const response = await safeFetch(
				`${ apiUrl }/roi/v1/parcours`,
				{ method: 'GET', headers: getAuthHeaders() },
				5000
			);

			if ( ! response.ok ) {
				throw new Error( 'Impossible de charger les parcours.' );
			}
			return response.json();
		},
	} );

	// 2. Query de Progression
	const { data: queryProgression, refetch: refetchProgression } = useQuery<
		number[]
	>( {
		queryKey: computed( () => [
			'progression',
			authStore.selectedIdentity?.id || 'default',
		] ),
		enabled: computed( () => authStore.isAuthenticated ),
		queryFn: async () => {
			const apiUrl = import.meta.env.VITE_API_BASE_URL;
			const response = await safeFetch(
				`${ apiUrl }/roi/v1/progression`,
				{ method: 'GET', headers: getAuthHeaders() },
				5000
			);

			if ( ! response.ok ) {
				throw new Error( 'Impossible de charger la progression.' );
			}
			const data = await response.json();
			return Array.isArray( data ) ? data : data.elements_valides || [];
		},
	} );

	// 3. Query du Contenu Actuel
	const { data: queryContenu, isLoading: isContenuLoading } =
		useQuery< Contenu | null >( {
			queryKey: computed( () => [
				'contenu',
				contenuActuelId.value,
				authStore.selectedIdentity?.id || 'default',
			] ),
			enabled: computed( () => contenuActuelId.value !== null ),
			queryFn: async () => {
				if ( ! contenuActuelId.value ) {
					return null;
				}
				const apiUrl = import.meta.env.VITE_API_BASE_URL;
				const response = await safeFetch(
					`${ apiUrl }/roi/v1/contenu/${ contenuActuelId.value }`,
					{ method: 'GET', headers: getAuthHeaders() },
					5000
				);

				if ( ! response.ok ) {
					throw new Error(
						`Impossible de charger le contenu ${ contenuActuelId.value }.`
					);
				}
				return response.json();
			},
		} );

	// Computed properties
	const parcours = computed( () => queryParcours.value || [] );
	const elementsValides = computed( () => queryProgression.value || [] );
	const contenuActuel = computed( () => queryContenu.value || null );
	const isLoading = computed(
		() => isParcoursLoading.value || isCustomLoading.value
	);

	// Getters
	const isCoursUnlocked = computed( () => {
		return ( coursIndex: number ): boolean => {
			const cours = parcours.value[ coursIndex ];
			if ( ! cours ) {
				return false;
			}
			// Les cours assignés par les entraîneurs sont immédiatement déverrouillés
			if ( cours.unlocked_by_assignment || cours.is_assigned ) {
				return true;
			}
			if ( coursIndex <= 0 ) {
				return true;
			}
			// Trouver le cours précédent faisant partie du tronc commun
			let previousTroncIndex = coursIndex - 1;
			while (
				previousTroncIndex >= 0 &&
				( parcours.value[ previousTroncIndex ]?.is_assigned ||
					parcours.value[ previousTroncIndex ]
						?.unlocked_by_assignment )
			) {
				previousTroncIndex--;
			}
			if ( previousTroncIndex < 0 ) {
				return true;
			}
			const coursPrecedent = parcours.value[ previousTroncIndex ];
			if ( ! coursPrecedent ) {
				return true;
			}
			return coursPrecedent.playlist.every( ( item ) =>
				elementsValides.value.includes( item.id )
			);
		};
	} );

	const coursAssignes = computed( () =>
		parcours.value.filter(
			( c ) => c.is_assigned || c.unlocked_by_assignment
		)
	);

	const coursTroncCommun = computed( () =>
		parcours.value.filter(
			( c ) => ! c.is_assigned && ! c.unlocked_by_assignment
		)
	);

	const isElementUnlocked = computed( () => {
		return ( coursIndex: number, playlistIndex: number ): boolean => {
			if ( ! isCoursUnlocked.value( coursIndex ) ) {
				return false;
			}
			if ( playlistIndex <= 0 ) {
				return true;
			}
			const cours = parcours.value[ coursIndex ];
			if ( ! cours ) {
				return false;
			}
			const elementPrecedent = cours.playlist[ playlistIndex - 1 ];
			if ( ! elementPrecedent ) {
				return false;
			}
			return elementsValides.value.includes( elementPrecedent.id );
		};
	} );

	/**
	 * Synchronisation sélective et fine du cache des contenus :
	 * Compare les dates 'modified' des éléments de la playlist avec le cache local TanStack Query.
	 * Invalide uniquement les éléments modifiés côté serveur pour éviter les requêtes inutiles.
	 * @param coursList
	 */
	const syncContenuCache = ( coursList: Cours[] ): void => {
		if ( ! Array.isArray( coursList ) ) {
			return;
		}
		const identityId = authStore.selectedIdentity?.id || 'default';
		for ( const cours of coursList ) {
			if ( ! Array.isArray( cours.playlist ) ) {
				continue;
			}
			for ( const item of cours.playlist ) {
				if ( ! item.id || ! item.modified ) {
					continue;
				}
				const cached = queryClient.getQueryData< Contenu >( [
					'contenu',
					item.id,
					identityId,
				] );
				// Si le contenu est déjà en cache et que sa date modified ne correspond plus à celle du serveur
				if (
					cached &&
					cached.modified &&
					cached.modified !== item.modified
				) {
					queryClient.invalidateQueries( {
						queryKey: [ 'contenu', item.id, identityId ],
					} );
				}
			}
		}
	};

	// Surveille les mises à jour des parcours pour invalider automatiquement les exercices modifiés
	watch(
		queryParcours,
		( newParcours ) => {
			if ( newParcours ) {
				syncContenuCache( newParcours );
			}
		},
		{ immediate: true }
	);

	// Actions
	const fetchParcours = async (): Promise< void > => {
		await refetchParcours();
	};

	const fetchProgression = async (): Promise< void > => {
		await refetchProgression();
	};

	const fetchContenu = async ( id: number ): Promise< Contenu | null > => {
		contenuActuelId.value = id;
		const identityId = authStore.selectedIdentity?.id || 'default';

		// Recherche du 'modified' attendu selon le listing des parcours
		let expectedModified: string | undefined;
		for ( const cours of parcours.value ) {
			const found = cours.playlist?.find( ( p ) => p.id === id );
			if ( found?.modified ) {
				expectedModified = found.modified;
				break;
			}
		}

		const cached = queryClient.getQueryData< Contenu >( [
			'contenu',
			id,
			identityId,
		] );

		// Si les données en cache sont obsolètes par rapport au parcours, invalider pour forcer la mise à jour
		if (
			cached &&
			expectedModified &&
			cached.modified &&
			cached.modified !== expectedModified
		) {
			await queryClient.invalidateQueries( {
				queryKey: [ 'contenu', id, identityId ],
			} );
		}

		return await queryClient.ensureQueryData< Contenu | null >( {
			queryKey: [ 'contenu', id, identityId ],
			queryFn: async () => {
				const apiUrl = import.meta.env.VITE_API_BASE_URL;
				const response = await safeFetch(
					`${ apiUrl }/roi/v1/contenu/${ id }`,
					{ method: 'GET', headers: getAuthHeaders() },
					5000
				);

				if ( ! response.ok ) {
					throw new Error(
						`Impossible de charger le contenu ${ id }.`
					);
				}
				return response.json();
			},
		} );
	};

	const validerElement = async (
		id: number,
		timeSpentSeconds?: number,
		attemptsCount?: number
	): Promise< void > => {
		try {
			const apiUrl = import.meta.env.VITE_API_BASE_URL;
			const body: {
				element_id: number;
				time_spent?: number;
				attempts?: number;
			} = {
				element_id: id,
			};
			if (
				typeof timeSpentSeconds === 'number' &&
				timeSpentSeconds >= 0
			) {
				body.time_spent = Math.round( timeSpentSeconds );
			}
			if ( typeof attemptsCount === 'number' && attemptsCount >= 1 ) {
				body.attempts = Math.round( attemptsCount );
			}

			const response = await safeFetch(
				`${ apiUrl }/roi/v1/progression`,
				{
					method: 'POST',
					headers: getAuthHeaders(),
					body: JSON.stringify( body ),
				},
				5000
			);

			if ( ! response.ok ) {
				throw new Error( `Impossible de valider l'élément ${ id }.` );
			}

			// Invalidation du cache de progression pour forcer la mise à jour réactive
			await queryClient.invalidateQueries( {
				queryKey: [ 'progression' ],
			} );
		} catch ( error ) {
			console.error(
				"Erreur lors de la validation de l'élément :",
				error
			);
		}
	};

	const prefetchCoursContenus = ( coursId: number ): void => {
		const coursTarget = parcours.value.find( ( c ) => c.id === coursId );
		if ( ! coursTarget || ! coursTarget.playlist ) {
			return;
		}

		const identityId = authStore.selectedIdentity?.id || 'default';
		const apiUrl = import.meta.env.VITE_API_BASE_URL;

		coursTarget.playlist.forEach( ( item ) => {
			const cached = queryClient.getQueryData< Contenu >( [
				'contenu',
				item.id,
				identityId,
			] );

			// Économie réseau mobile : si l'élément est déjà en cache avec la même date modified, aucune requête n'est émise
			if (
				cached &&
				item.modified &&
				cached.modified &&
				cached.modified === item.modified
			) {
				return;
			}

			queryClient.prefetchQuery( {
				queryKey: [ 'contenu', item.id, identityId ],
				queryFn: async () => {
					const response = await safeFetch(
						`${ apiUrl }/roi/v1/contenu/${ item.id }`,
						{ method: 'GET', headers: getAuthHeaders() },
						5000
					);
					if ( ! response.ok ) {
						return null;
					}
					return response.json();
				},
				staleTime: 1000 * 60 * 60,
			} );
		} );
	};

	const clearData = () => {
		contenuActuelId.value = null;
		queryClient.removeQueries( { queryKey: [ 'parcours' ] } );
		queryClient.removeQueries( { queryKey: [ 'progression' ] } );
		queryClient.removeQueries( { queryKey: [ 'contenu' ] } );
	};

	return {
		parcours,
		coursAssignes,
		coursTroncCommun,
		contenuActuel,
		elementsValides,
		isLoading,
		isContenuLoading,
		isCoursUnlocked,
		isElementUnlocked,
		fetchParcours,
		fetchProgression,
		fetchContenu,
		prefetchCoursContenus,
		validerElement,
		clearData,
	};
} );
