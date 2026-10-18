import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';
import { useQueryClient } from '@tanstack/vue-query';
import { safeFetch } from '@/utils/safeFetch';
import type { SaveGameRequest, GameEntry } from '@/types/roi';

export type { GameEntry };
export type PendingGame = SaveGameRequest;

export const useChessStore = defineStore(
	'chess',
	() => {
		const queryClient = useQueryClient();
		const currentPgn = ref( '' );
		const orientation = ref< 'white' | 'black' >( 'white' );
		const engineElo = ref( 1320 );
		const helpCount = ref( 0 );
		const oupsCount = ref( 0 );
		const isSyncing = ref( false );

		const saveGame = (
			pgn: string,
			playerOrientation: 'white' | 'black',
			elo: number,
			help: number = 0,
			oups: number = 0
		) => {
			currentPgn.value = pgn;
			orientation.value = playerOrientation;
			engineElo.value = elo;
			helpCount.value = help;
			oupsCount.value = oups;
		};

		const clearGame = () => {
			currentPgn.value = '';
			helpCount.value = 0;
			oupsCount.value = 0;
		};

		const saveCompletedGame = async (
			durationSeconds: number,
			pgnOverride?: string
		) => {
			const authStore = useAuthStore();
			const identity = authStore.selectedIdentity;

			// Règle métier : Ignorer si non authentifié, sans profil ou si c'est un responsable légal (parent)
			if (
				! authStore.isAuthenticated ||
				! identity ||
				identity.type === 'representative'
			) {
				return;
			}

			const finalPgn = ( pgnOverride || currentPgn.value || '' ).trim();
			if ( ! finalPgn ) {
				return;
			}

			// Synchronisation préalable des éventuelles parties en attente
			if ( navigator.onLine ) {
				void syncPendingGames();
			}

			const targetMemberId =
				typeof identity.member_id === 'number' && identity.member_id > 0
					? identity.member_id
					: 0;

			const gameData: PendingGame = {
				member_id: targetMemberId,
				difficulty_level: engineElo.value,
				hints_count: helpCount.value,
				takebacks_count: oupsCount.value,
				pgn: finalPgn,
				duration: Math.max( 0, Math.round( durationSeconds ) ),
				game_date: new Date().toISOString(),
			};

			// Si hors ligne, stocker localement
			if ( ! navigator.onLine ) {
				queuePendingGame( gameData );
				return;
			}

			// Sinon tenter l'envoi direct
			try {
				const headers: Record< string, string > = {
					'Content-Type': 'application/json',
				};
				if ( identity.id ) {
					headers[ 'X-Selected-Identity' ] = identity.id;
				}

				const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
				const endpoint = apiUrl
					? `${ apiUrl }/roi/v1/games`
					: '/roi/v1/games';

				const response = await safeFetch( endpoint, {
					method: 'POST',
					headers,
					body: JSON.stringify( gameData ),
				} );

				if ( ! response.ok ) {
					throw new Error( 'Erreur de sauvegarde serveur' );
				}

				queryClient.invalidateQueries( {
					queryKey: [ 'saved-games' ],
				} );
			} catch ( error ) {
				console.warn(
					"Échec de l'envoi immédiat, mise en file d'attente hors ligne:",
					error
				);
				queuePendingGame( gameData );
			}
		};

		const queuePendingGame = ( game: PendingGame ) => {
			const pending = getPendingGames();
			pending.push( game );
			localStorage.setItem(
				'dame_pending_games',
				JSON.stringify( pending )
			);
		};

		const getPendingGames = (): PendingGame[] => {
			const data = localStorage.getItem( 'dame_pending_games' );
			try {
				return data ? JSON.parse( data ) : [];
			} catch {
				return [];
			}
		};

		const syncPendingGames = async () => {
			if ( isSyncing.value || ! navigator.onLine ) {
				return;
			}
			const pending = getPendingGames();
			if ( pending.length === 0 ) {
				return;
			}

			const authStore = useAuthStore();
			if ( ! authStore.isAuthenticated ) {
				return;
			}

			isSyncing.value = true;
			const remaining: PendingGame[] = [];

			for ( const game of pending ) {
				try {
					const headers: Record< string, string > = {
						'Content-Type': 'application/json',
					};
					if ( authStore.selectedIdentity?.id ) {
						headers[ 'X-Selected-Identity' ] =
							authStore.selectedIdentity.id;
					}

					const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
					const endpoint = apiUrl
						? `${ apiUrl }/roi/v1/games`
						: '/roi/v1/games';

					const response = await safeFetch( endpoint, {
						method: 'POST',
						headers,
						body: JSON.stringify( game ),
					} );

					if ( ! response.ok ) {
						remaining.push( game );
					}
				} catch {
					remaining.push( game );
				}
			}

			localStorage.setItem(
				'dame_pending_games',
				JSON.stringify( remaining )
			);
			isSyncing.value = false;
		};

		// Écouteur de retour en ligne
		if ( typeof window !== 'undefined' ) {
			window.addEventListener( 'online', () => {
				syncPendingGames();
			} );
		}

		return {
			currentPgn,
			orientation,
			engineElo,
			helpCount,
			oupsCount,
			saveGame,
			clearGame,
			saveCompletedGame,
			syncPendingGames,
		};
	},
	{
		persist: true,
	}
);
