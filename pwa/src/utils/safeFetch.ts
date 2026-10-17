import { useAuthStore } from '@/stores/auth';

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

		const legacyToken =
			typeof localStorage !== 'undefined'
				? localStorage.getItem( 'dame_jwt_token' )
				: null;
		if (
			authStore &&
			legacyToken &&
			! authStore.jwtSdk.getJwt() &&
			legacyToken !== 'null' &&
			legacyToken !== 'undefined'
		) {
			authStore.jwtSdk.setTokens( legacyToken );
		}

		const shouldUseAuth = Boolean(
			hasExplicitAuthHeader ||
				authStore?.isAuthenticated ||
				authStore?.jwtSdk.isAuthenticated() ||
				legacyToken
		);

		const fetchOptions: RequestInit = {
			...options,
			headers: headersRecord,
			signal: controller.signal,
		};

		let response: Response;
		if ( shouldUseAuth && authStore?.jwtSdk && ! isRetry ) {
			response = await authStore.jwtSdk.fetchWithAuth(
				resolvedUrl,
				fetchOptions
			);
		} else {
			const finalUrl =
				resolvedUrl.startsWith( '/' ) &&
				typeof window !== 'undefined' &&
				window.location?.origin
					? `${ window.location.origin }${ resolvedUrl }`
					: resolvedUrl;
			response = await fetch( finalUrl, fetchOptions );
		}

		clearTimeout( id );

		// Repli de compatibilité : en cas de 401 (si non déjà rejoué) ou de 400 avec jeton d'authentification (rejet Simple-JWT-Login)
		const isAuthError =
			response.status === 401 ||
			( response.status === 400 && shouldUseAuth );

		if ( isAuthError && ! isRetry && authStore && shouldUseAuth ) {
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
