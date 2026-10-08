import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { safeFetch } from '@/utils/safeFetch';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useAuthStore } from './auth';
import { fetchWpCollection } from '@/utils/wpApi';
import { getSeasonFromDate, getCurrentSeason } from '@/utils/seasonUtils';

import type { AgendaEvent, AgendaEventCategory } from 'dame-types';
export type { AgendaEvent, AgendaEventCategory };

export const useAgendaStore = defineStore( 'agenda', () => {
	const authStore = useAuthStore();
	const queryClient = useQueryClient();
	const events = ref< AgendaEvent[] >( [] );
	const isLoading = ref( false );
	const hasMoreUpcoming = ref( true );
	const hasMorePast = ref( true );
	let isFetchingUpcoming = false;
	let isFetchingPast = false;

	// Query des événements en mode admin (tous les événements pour DataTable admin)
	const {
		data: rawAdminEvents,
		isLoading: isAdminEventsLoading,
		refetch: refetchAdminEvents,
	} = useQuery< AgendaEvent[] >( {
		queryKey: [ 'admin', 'agenda', 'list' ],
		queryFn: async () => {
			const allEvents = await fetchWpCollection< AgendaEvent >(
				'/wp/v2/agenda?per_page=100&orderby=meta_value&meta_key=_dame_start_date&order=asc'
			);
			return sortEvents( allEvents );
		},
		enabled: computed( () => authStore.isAdmin ),
	} );

	const adminEvents = computed( () => rawAdminEvents.value || [] );

	/**
	 * Liste des saisons disponibles (ordonnées par ordre décroissant)
	 * Comprend toujours la saison courante, ainsi que toutes les saisons trouvées dans les événements.
	 */
	const availableSeasons = computed( () => {
		const seasonsSet = new Set< string >();
		const current = getCurrentSeason();
		seasonsSet.add( current );

		for ( const ev of adminEvents.value ) {
			const s = getSeasonFromDate( ev.meta?._dame_start_date );
			if ( s ) {
				seasonsSet.add( s );
			}
		}

		// Trier par année de départ décroissante
		return Array.from( seasonsSet ).sort( ( a, b ) => {
			const startA = parseInt( a.split( '-' )[ 0 ], 10 ) || 0;
			const startB = parseInt( b.split( '-' )[ 0 ], 10 ) || 0;
			return startB - startA;
		} );
	} );

	const fetchAdminEvents = async ( force = false ) => {
		if ( force ) {
			await queryClient.invalidateQueries( {
				queryKey: [ 'admin', 'agenda' ],
			} );
		} else {
			await refetchAdminEvents();
		}
	};

	// Etat de la pagination partagé
	const upcomingPage = ref( 1 );
	const pastPage = ref( 1 );

	/**
	 * Récupère un lot d'événements depuis le serveur en passant par TanStack Query
	 * @param direction
	 * @param referenceDate
	 * @param page
	 */
	const fetchBatch = async (
		direction: 'upcoming' | 'past',
		referenceDate: string,
		page: number
	) => {
		if ( direction === 'upcoming' && isFetchingUpcoming ) {
			return null;
		}
		if ( direction === 'past' && isFetchingPast ) {
			return null;
		}

		if ( direction === 'upcoming' ) {
			isFetchingUpcoming = true;
		}
		if ( direction === 'past' ) {
			isFetchingPast = true;
		}

		try {
			const token = localStorage.getItem( 'dame_jwt_token' );
			const isAuth = !! token;

			return await queryClient.fetchQuery( {
				queryKey: [
					'agenda',
					direction,
					referenceDate,
					page,
					isAuth ? 'auth' : 'public',
				],
				queryFn: async () => {
					if ( ! navigator.onLine ) {
						throw new Error( 'Offline' );
					}

					const context = 'view';
					const perPage = 20;

					const order = direction === 'upcoming' ? 'asc' : 'desc';
					const dateParam =
						direction === 'upcoming'
							? `after_date=${ referenceDate }`
							: `before_date=${ referenceDate }`;

					const baseUrl = `${
						import.meta.env.VITE_API_BASE_URL
					}/wp/v2/agenda`;
					const queryParams = [
						`per_page=${ perPage }`,
						`page=${ page }`,
						`context=${ context }`,
						`orderby=meta_value`,
						`meta_key=_dame_start_date`,
						`order=${ order }`,
						dateParam,
					].join( '&' );

					const headers: Record< string, string > = {
						'Content-Type': 'application/json',
					};
					if ( token ) {
						headers.Authorization = `Bearer ${ token }`;
					}

					let response = await safeFetch(
						`${ baseUrl }?${ queryParams }`,
						{ method: 'GET', headers },
						8000
					);

					// Repli gracieux : Si 400/401/403 avec un token invalide, on retente en mode public sans bloquer l'agenda
					if (
						( response.status === 401 ||
							response.status === 403 ||
							response.status === 400 ) &&
						token
					) {
						console.warn(
							`Accès agenda authentifié refusé (${ response.status }), tentative de chargement public...`
						);
						response = await safeFetch(
							`${ baseUrl }?${ queryParams }`,
							{
								method: 'GET',
								headers: { 'Content-Type': 'application/json' },
							},
							8000
						);
					}

					if ( ! response.ok ) {
						if ( response.status === 400 ) {
							if ( direction === 'upcoming' ) {
								hasMoreUpcoming.value = false;
							}
							if ( direction === 'past' ) {
								hasMorePast.value = false;
							}
							return [];
						}
						throw new Error( `Server status ${ response.status }` );
					}

					const totalPagesHeader =
						response.headers.get( 'X-WP-TotalPages' ) ||
						response.headers.get( 'x-wp-totalpages' );
					const totalPages = totalPagesHeader
						? parseInt( totalPagesHeader, 10 )
						: null;

					const data: AgendaEvent[] = await response.json();

					if ( direction === 'upcoming' ) {
						if ( totalPages !== null ) {
							hasMoreUpcoming.value = page < totalPages;
						} else {
							hasMoreUpcoming.value = data.length >= perPage;
						}
					}

					if ( direction === 'past' ) {
						if ( totalPages !== null ) {
							hasMorePast.value = page < totalPages;
						} else {
							hasMorePast.value = data.length >= perPage;
						}
					}

					return data;
				},
				staleTime: 1000 * 60 * 5, // 5 minutes
			} );
		} catch ( error: unknown ) {
			const isOffline =
				error instanceof Error && error.message === 'Offline';
			if ( isOffline ) {
				const token = localStorage.getItem( 'dame_jwt_token' );
				const isAuth = !! token;
				const cached = queryClient.getQueryData< AgendaEvent[] >( [
					'agenda',
					direction,
					referenceDate,
					page,
					isAuth ? 'auth' : 'public',
				] );
				if ( cached ) {
					return cached;
				}
			}
			const errObj = error as
				| { name?: string; message?: string }
				| undefined;
			if (
				errObj?.name !== 'AbortError' &&
				errObj?.name !== 'CancelledError' &&
				errObj?.message !== 'CancelledError' &&
				navigator.onLine
			) {
				console.error( `Erreur fetchBatch ${ direction }:`, error );
			}
			return null;
		} finally {
			if ( direction === 'upcoming' ) {
				isFetchingUpcoming = false;
			}
			if ( direction === 'past' ) {
				isFetchingPast = false;
			}
		}
	};

	/**
	 * Récupère la date du jour au format YYYY-MM-DD (Locale)
	 */
	const getTodayLocal = () => {
		const now = new Date();
		return `${ now.getFullYear() }-${ String( now.getMonth() + 1 ).padStart(
			2,
			'0'
		) }-${ String( now.getDate() ).padStart( 2, '0' ) }`;
	};

	/**
	 * Trie un tableau d'événements par date de début et heure de début
	 * @param list
	 */
	const sortEvents = ( list: AgendaEvent[] ): AgendaEvent[] => {
		return [ ...list ].sort( ( a, b ) => {
			const dateA = a.meta?._dame_start_date || '';
			const dateB = b.meta?._dame_start_date || '';
			if ( dateA !== dateB ) {
				return dateA.localeCompare( dateB );
			}
			const timeA = a.meta?._dame_start_time || '';
			const timeB = b.meta?._dame_start_time || '';
			return timeA.localeCompare( timeB );
		} );
	};

	let isFetchingAgenda = false;

	/**
	 * Rafraîchit les données de base (utilisé par Home et Pull-to-refresh)
	 */
	const fetchAgenda = async () => {
		// Si on est déjà en cours de chargement ou hors ligne avec des données, on ignore
		// Ajout d'une vérification de "fraîcheur" (5 min) pour éviter les erreurs console inutiles
		if (
			isFetchingAgenda ||
			( ! navigator.onLine && events.value.length > 0 )
		) {
			return;
		}

		isFetchingAgenda = true;
		isLoading.value = true;
		try {
			const today = getTodayLocal();
			const data = await fetchBatch( 'upcoming', today, 1 );

			// CRITIQUE : Si fetchBatch renvoie null (erreur), on arrête TOUT pour préserver le cache
			if ( data === null ) {
				return;
			}

			// --- LOGIQUE DE FUSION INTELLIGENTE ---
			// On garde tous les événements passés déjà chargés en mémoire
			const pastEventsInCache = events.value.filter( ( e ) => {
				const refDate =
					e.meta?._dame_end_date || e.meta?._dame_start_date || '';
				return refDate < today;
			} );

			// On remplace le bloc futur par les données fraîches
			const mergedEvents = [ ...pastEventsInCache, ...data ];

			// Sécurité anti-doublons et tri chronologique
			events.value = sortEvents(
				mergedEvents.filter(
					( v, i, a ) => a.findIndex( ( t ) => t.id === v.id ) === i
				)
			);

			upcomingPage.value = 1;
		} finally {
			isLoading.value = false;
			isFetchingAgenda = false;
		}
	};

	/**
	 * Récupère les événements d'un mois spécifique
	 * @param year  Année (ex: 2026)
	 * @param month Mois 0-indexed (0 = Janvier, 11 = Décembre)
	 */
	const fetchMonthEvents = async ( year: number, month: number ) => {
		const startDate = `${ year }-${ String( month + 1 ).padStart(
			2,
			'0'
		) }-01`;
		const lastDay = new Date( year, month + 1, 0 ).getDate();
		const endDate = `${ year }-${ String( month + 1 ).padStart(
			2,
			'0'
		) }-${ String( lastDay ).padStart( 2, '0' ) }`;

		isLoading.value = true;
		try {
			const token = localStorage.getItem( 'dame_jwt_token' );
			const isAuth = !! token;

			return await queryClient.fetchQuery( {
				queryKey: [
					'agenda',
					'month',
					year,
					month,
					isAuth ? 'auth' : 'public',
				],
				queryFn: async () => {
					if ( ! navigator.onLine ) {
						throw new Error( 'Offline' );
					}

					const baseUrl = `${
						import.meta.env.VITE_API_BASE_URL
					}/wp/v2/agenda`;
					const queryParams = [
						'per_page=100',
						'context=view',
						'orderby=meta_value',
						'meta_key=_dame_start_date',
						'order=asc',
						`after_date=${ startDate }`,
						`before_date=${ endDate }`,
					].join( '&' );

					const headers: Record< string, string > = {
						'Content-Type': 'application/json',
					};
					if ( token ) {
						headers.Authorization = `Bearer ${ token }`;
					}

					let response = await safeFetch(
						`${ baseUrl }?${ queryParams }`,
						{ method: 'GET', headers },
						8000
					);

					if (
						( response.status === 401 ||
							response.status === 403 ||
							response.status === 400 ) &&
						token
					) {
						response = await safeFetch(
							`${ baseUrl }?${ queryParams }`,
							{
								method: 'GET',
								headers: { 'Content-Type': 'application/json' },
							},
							8000
						);
					}

					if ( ! response.ok ) {
						return [];
					}

					const data: AgendaEvent[] = await response.json();

					const mergedEvents = [ ...events.value, ...data ];
					events.value = sortEvents(
						mergedEvents.filter(
							( v, i, a ) =>
								a.findIndex( ( t ) => t.id === v.id ) === i
						)
					);

					return data;
				},
				staleTime: 1000 * 60 * 5,
			} );
		} catch ( error: unknown ) {
			if ( error instanceof Error && error.message === 'Offline' ) {
				return events.value;
			}
			console.error( 'Erreur fetchMonthEvents:', error );
			return null;
		} finally {
			isLoading.value = false;
		}
	};

	const clearData = () => {
		events.value = [];
		hasMoreUpcoming.value = true;
		hasMorePast.value = true;
		upcomingPage.value = 1;
		pastPage.value = 1;
		queryClient.removeQueries( { queryKey: [ 'agenda' ] } );
	};

	return {
		events,
		adminEvents,
		isLoading,
		isAdminEventsLoading,
		availableSeasons,
		hasMoreUpcoming,
		hasMorePast,
		upcomingPage,
		pastPage,
		getTodayLocal,
		fetchBatch,
		fetchAgenda,
		fetchAdminEvents,
		fetchMonthEvents,
		clearData,
	};
} );
