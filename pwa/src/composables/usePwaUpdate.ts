import { ref } from 'vue';
import { queryClient } from '@/queryClient';

const appVersion =
	typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const isChecking = ref( false );
const updateAvailable = ref( false );

/**
 * Composable de gestion du cycle de vie des mises à jour et de purge de cache PWA.
 */
export function usePwaUpdate() {
	/**
	 * Déclenche une vérification manuelle auprès du Service Worker.
	 */
	const checkForUpdates = async (): Promise< {
		updated: boolean;
		message: string;
	} > => {
		if (
			typeof window === 'undefined' ||
			! ( 'serviceWorker' in navigator )
		) {
			return {
				updated: false,
				message: 'Service Worker non supporté sur ce navigateur.',
			};
		}

		isChecking.value = true;
		try {
			const registration =
				await navigator.serviceWorker.getRegistration();
			if ( ! registration ) {
				return {
					updated: false,
					message: 'Aucun Service Worker actif.',
				};
			}

			// Force la vérification du fichier sw.js sur le serveur
			await registration.update();

			if ( registration.waiting || registration.installing ) {
				updateAvailable.value = true;
				return {
					updated: true,
					message: 'Nouvelle version en cours d’installation...',
				};
			}

			return {
				updated: false,
				message: 'Votre application est déjà à jour.',
			};
		} catch ( error ) {
			console.warn(
				'Erreur lors de la vérification de mise à jour:',
				error
			);
			return {
				updated: false,
				message: 'Impossible de vérifier la mise à jour (hors-ligne).',
			};
		} finally {
			isChecking.value = false;
		}
	};

	/**
	 * Purge les caches d'assets et de requêtes tout en PRÉSERVANT la session de l'utilisateur,
	 * puis recharge l'application.
	 */
	const clearCacheAndReload = async (): Promise< void > => {
		try {
			// 1. Purge du CacheStorage du Service Worker (HTML, JS, CSS, images)
			if ( typeof window !== 'undefined' && 'caches' in window ) {
				const cacheKeys = await window.caches.keys();
				await Promise.all(
					cacheKeys.map( ( key ) => window.caches.delete( key ) )
				);
			}

			// 2. Purge du cache des requêtes TanStack
			try {
				queryClient.clear();
				if ( typeof localStorage !== 'undefined' ) {
					localStorage.removeItem( 'DAME_QUERY_CACHE' );
				}
			} catch ( e ) {
				console.warn( 'Erreur nettoyage cache TanStack Query:', e );
			}

			// 3. Forcer la mise à jour du Service Worker si existant
			if (
				typeof navigator !== 'undefined' &&
				'serviceWorker' in navigator
			) {
				const registration =
					await navigator.serviceWorker.getRegistration();
				if ( registration ) {
					await registration.update();
				}
			}
		} catch ( err ) {
			console.error( 'Erreur lors de la purge de cache PWA:', err );
		} finally {
			// 4. Rechargement propre de la page
			if ( typeof window !== 'undefined' ) {
				window.location.reload();
			}
		}
	};

	return {
		appVersion,
		isChecking,
		updateAvailable,
		checkForUpdates,
		clearCacheAndReload,
	};
}
