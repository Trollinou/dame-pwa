import { useAuthStore } from '@/stores/auth';
import { getApiOrigin } from '@/stores/auth/jwtService';

const resolveWpJsonUrl = ( url: string ): string => {
	if ( url.startsWith( 'http://' ) || url.startsWith( 'https://' ) ) {
		return url;
	}
	const normalized = url.startsWith( '/' ) ? url : `/${ url }`;
	if ( normalized.startsWith( '/wp-json/' ) ) {
		return normalized;
	}
	return `/wp-json${ normalized }`;
};

const extractHeaderRecord = (
	headers?: HeadersInit
): Record< string, string > => {
	if ( ! headers ) {
		return {};
	}
	if ( headers instanceof Headers ) {
		const record: Record< string, string > = {};
		headers.forEach( ( value, key ) => {
			record[ key ] = value;
		} );
		return record;
	}
	if ( Array.isArray( headers ) ) {
		return Object.fromEntries( headers );
	}
	return { ...( headers as Record< string, string > ) };
};

/**
 * Utilitaire de fetch avec timeout pour éviter de bloquer l'interface,
 * délégation native à `sdk.fetchWithAuth` pour l'injection du header Bearer
 * et le rafraîchissement transparent des jetons JWT en cas de statut 401/400.
 *
 * @param url
 * @param options
 * @param timeout
 * @param isRetry
 */
export const safeFetch = async (
	url: string,
	options: RequestInit = {},
	timeout = 5000,
	isRetry = false
): Promise< Response > => {
	const controller = new AbortController();
	const id = setTimeout( () => controller.abort(), timeout );

	try {
		const resolvedUrl = resolveWpJsonUrl( url );
		const headersRecord = extractHeaderRecord( options.headers );
		const hasExplicitAuthHeader = Boolean(
			headersRecord.Authorization || headersRecord.authorization
		);

		let authStore: ReturnType< typeof useAuthStore > | null = null;
		try {
			authStore = useAuthStore();
		} catch {
			authStore = null;
		}

		const shouldUseAuth = Boolean(
			hasExplicitAuthHeader ||
				authStore?.isAuthenticated ||
				authStore?.jwtSdk.isAuthenticated()
		);

		const fetchOptions: RequestInit = {
			...options,
			headers: headersRecord,
			signal: controller.signal,
		};

		const usedSdkFetchWithAuth = Boolean(
			shouldUseAuth && authStore?.jwtSdk && ! isRetry
		);

		let response: Response;
		if ( usedSdkFetchWithAuth && authStore?.jwtSdk ) {
			response = await authStore.jwtSdk.fetchWithAuth(
				resolvedUrl,
				fetchOptions
			);
		} else {
			const apiOrigin =
				getApiOrigin() ||
				( typeof window !== 'undefined' && window.location?.origin
					? window.location.origin
					: '' );
			const finalUrl =
				resolvedUrl.startsWith( '/' ) && apiOrigin
					? `${ apiOrigin }${ resolvedUrl }`
					: resolvedUrl;
			response = await fetch( finalUrl, fetchOptions );
		}

		clearTimeout( id );

		// sdk.fetchWithAuth() gère déjà un refresh + retry unique sur 401.
		// Ne pas déclencher de second refresh sur 401 si fetchWithAuth a déjà été utilisé
		// (protection des refresh tokens rotatifs à usage unique en WP plugin >= 4.2.0).
		const shouldFallbackRefresh =
			( response.status === 400 && shouldUseAuth ) ||
			( response.status === 401 &&
				! usedSdkFetchWithAuth &&
				shouldUseAuth );

		if ( shouldFallbackRefresh && ! isRetry && authStore ) {
			try {
				const newToken = await authStore.tryRefreshToken( true );
				if ( newToken ) {
					const newHeaders: Record< string, string > = {
						...headersRecord,
						Authorization: `Bearer ${ newToken }`,
					};
					return await safeFetch(
						resolvedUrl,
						{ ...options, headers: newHeaders },
						timeout,
						true
					);
				}
			} catch ( refreshError ) {
				console.warn(
					'Échec du rafraîchissement transparent du token :',
					refreshError
				);
			}
		}

		return response;
	} catch ( error: unknown ) {
		clearTimeout( id );
		if ( error instanceof Error && error.name === 'AbortError' ) {
			throw new Error( 'Le serveur met trop de temps à répondre.' );
		}
		throw error;
	}
};
