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
	 * Interroge le serveur en direct avec un cache-buster pour vérifier si une nouvelle version est déployée.
	 * Si autoReload est à true et qu'une mise à jour est trouvée, déclenche la purge et le rechargement.
	 *
	 * @param autoReload Indique s'il faut déclencher automatiquement le rechargement et la purge.
	 */
	const checkServerVersion = async (
		autoReload = false
	): Promise< {
		isOutdated: boolean;
		serverVersion: string;
		currentVersion: string;
	} > => {
		try {
			const res = await fetch( `./version.json?_t=${ Date.now() }`, {
				cache: 'no-store',
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					Pragma: 'no-cache',
				},
			} );

			if ( res.ok ) {
				const data = ( await res.json() ) as {
					version?: string;
					buildTime?: number;
				};
				if ( data?.version && data.version !== appVersion ) {
					updateAvailable.value = true;
					if ( autoReload ) {
						await clearCacheAndReload();
					}
					return {
						isOutdated: true,
						serverVersion: data.version,
						currentVersion: appVersion,
					};
				}
				return {
					isOutdated: false,
					serverVersion: data?.version || appVersion,
					currentVersion: appVersion,
				};
			}
		} catch ( error ) {
			console.warn(
				'Vérification de version serveur non disponible (hors-ligne):',
				error
			);
		}

		return {
			isOutdated: false,
			serverVersion: appVersion,
			currentVersion: appVersion,
		};
	};

	/**
	 * Déclenche une vérification manuelle auprès du serveur et du Service Worker.
	 */
	const checkForUpdates = async (): Promise< {
		updated: boolean;
		message: string;
	} > => {
		isChecking.value = true;
		try {
			// 1. Vérification prioritaire de la version réelle sur le serveur
			const versionCheck = await checkServerVersion( false );
			if ( versionCheck.isOutdated ) {
				updateAvailable.value = true;
				// Déclenche le rechargement immédiat
				setTimeout( async () => {
					await clearCacheAndReload();
				}, 600 );
				return {
					updated: true,
					message: `Nouvelle version (${ versionCheck.serverVersion }) détectée ! Mise à jour en cours...`,
				};
			}

			// 2. Vérification complémentaire auprès du Service Worker
			if (
				typeof window !== 'undefined' &&
				'serviceWorker' in navigator
			) {
				const registration =
					await navigator.serviceWorker.getRegistration();
				if ( registration ) {
					await registration.update();
					if ( registration.waiting || registration.installing ) {
						updateAvailable.value = true;
						setTimeout( async () => {
							await clearCacheAndReload();
						}, 600 );
						return {
							updated: true,
							message:
								'Nouvelle version en cours d’installation...',
						};
					}
				}
			}

			return {
				updated: false,
				message: `Votre application est à jour (v${ appVersion }).`,
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
		checkServerVersion,
		checkForUpdates,
		clearCacheAndReload,
	};
}
