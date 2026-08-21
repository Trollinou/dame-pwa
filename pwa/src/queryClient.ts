import { QueryClient } from '@tanstack/vue-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/query-persist-client-core';

export const queryClient = new QueryClient( {
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			staleTime: 1000 * 60 * 5, // 5 minutes
			gcTime: 1000 * 60 * 60 * 24, // 24 heures (Garbage Collection / cacheTime)
		},
	},
} );

// Gestion de la version applicative et invalidation du cache de requêtes
const APP_VERSION =
	typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const VERSION_STORAGE_KEY = 'dame_pwa_app_version';

if ( typeof window !== 'undefined' ) {
	try {
		const storedVersion = localStorage.getItem( VERSION_STORAGE_KEY );
		if ( storedVersion && storedVersion !== APP_VERSION ) {
			// Version mise à jour : vider l'ancien cache persistant de requêtes pour éviter les désynchronisations
			localStorage.removeItem( 'DAME_QUERY_CACHE' );
		}
		localStorage.setItem( VERSION_STORAGE_KEY, APP_VERSION );
	} catch ( e ) {
		console.warn( 'Impossible de vérifier la version du cache PWA :', e );
	}
}

// Persistance du cache de requêtes pour le support hors-ligne
const persister = createSyncStoragePersister( {
	storage: typeof window !== 'undefined' ? window.localStorage : undefined,
	key: 'DAME_QUERY_CACHE',
} );

persistQueryClient( {
	queryClient,
	persister,
	maxAge: 1000 * 60 * 60 * 24, // 24 heures
} );
