import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import { safeFetch } from '@/utils/safeFetch';
import { useAuthStore } from '@/stores/auth';
import { getApiOrigin } from '@/stores/auth/jwtService';
import router from '@/router';

describe( 'safeFetch utility', () => {
	let app: ReturnType< typeof createApp >;

	beforeEach( () => {
		const pinia = createPinia();
		app = createApp( {} );
		app.use( pinia );
		app.use( VueQueryPlugin, { queryClient } );
		setActivePinia( pinia );
		vi.restoreAllMocks();
		localStorage.clear();
	} );

	afterEach( () => {
		vi.restoreAllMocks();
	} );

	test( 'executes successful HTTP fetch', async () => {
		const mockResponse = new Response( JSON.stringify( { status: 'ok' } ), {
			status: 200,
		} );
		vi.stubGlobal( 'fetch', vi.fn().mockResolvedValue( mockResponse ) );

		const res = await safeFetch( 'https://api.example.com/data' );
		expect( res.status ).toBe( 200 );
		expect( fetch ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'throws user-friendly error on request timeout / abort', async () => {
		const abortError = new Error( 'The operation was aborted' );
		abortError.name = 'AbortError';

		vi.stubGlobal( 'fetch', vi.fn().mockRejectedValue( abortError ) );

		await expect(
			safeFetch( 'https://api.example.com/slow', {}, 100 )
		).rejects.toThrow( 'Le serveur met trop de temps à répondre.' );
	} );

	test( 'attempts transparent token refresh on 401 Unauthorized status via sdk.fetchWithAuth', async () => {
		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			authStore.jwtSdk.setTokens( 'expired-token', 'refresh-token-123' );

			vi.spyOn( authStore.jwtSdk, 'getValidJwt' ).mockImplementation(
				async ( forceRefresh?: boolean ) => {
					return forceRefresh
						? 'new-refreshed-token'
						: 'expired-token';
				}
			);

			const unauthorizedResponse = new Response( null, { status: 401 } );
			const successResponse = new Response(
				JSON.stringify( { data: 'secret' } ),
				{ status: 200 }
			);

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce( unauthorizedResponse )
				.mockResolvedValueOnce( successResponse );

			vi.stubGlobal( 'fetch', fetchMock );

			const res = await safeFetch( `${ getApiOrigin() }/protected` );

			expect( authStore.jwtSdk.getValidJwt ).toHaveBeenCalledWith( true );
			expect( fetchMock ).toHaveBeenCalledTimes( 2 );
			expect( res.status ).toBe( 200 );

			const secondCallHeaders = new Headers(
				fetchMock.mock.calls[ 1 ][ 1 ]?.headers
			);
			expect( secondCallHeaders.get( 'Authorization' ) ).toBe(
				'Bearer new-refreshed-token'
			);
		} );
	} );

	test( 'does not perform a double refresh when 401 persists after fetchWithAuth internal retry', async () => {
		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			authStore.jwtSdk.setTokens( 'expired-token', 'refresh-token-123' );

			const getValidJwtSpy = vi
				.spyOn( authStore.jwtSdk, 'getValidJwt' )
				.mockImplementation( async ( forceRefresh?: boolean ) => {
					return forceRefresh
						? 'new-refreshed-token'
						: 'expired-token';
				} );

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce( new Response( null, { status: 401 } ) )
				.mockResolvedValueOnce( new Response( null, { status: 401 } ) );

			vi.stubGlobal( 'fetch', fetchMock );

			const res = await safeFetch( `${ getApiOrigin() }/protected` );

			expect( res.status ).toBe( 401 );
			expect( fetchMock ).toHaveBeenCalledTimes( 2 );
			expect( getValidJwtSpy ).toHaveBeenCalledTimes( 2 );
			expect( getValidJwtSpy ).toHaveBeenNthCalledWith( 1 );
			expect( getValidJwtSpy ).toHaveBeenNthCalledWith( 2, true );
		} );
	} );

	test( 'attempts transparent token refresh on 400 Bad Request with Authorization header', async () => {
		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			vi.spyOn( authStore, 'tryRefreshToken' ).mockResolvedValue(
				'new-refreshed-token-400'
			);
			authStore.jwtSdk.setTokens( 'expired-token', 'refresh-token-123' );

			const badRequestAuthResponse = new Response(
				JSON.stringify( {
					code: 'jwt_auth_invalid_token',
					message: 'Expired token',
				} ),
				{ status: 400 }
			);
			const successResponse = new Response(
				JSON.stringify( { data: 'secret-after-400' } ),
				{ status: 200 }
			);

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce( badRequestAuthResponse )
				.mockResolvedValueOnce( successResponse );

			vi.stubGlobal( 'fetch', fetchMock );

			const res = await safeFetch(
				'https://api.example.com/protected-agenda',
				{
					headers: { Authorization: 'Bearer expired-token' },
				}
			);

			expect( authStore.tryRefreshToken ).toHaveBeenCalledTimes( 1 );
			expect( fetchMock ).toHaveBeenCalledTimes( 2 );
			expect( res.status ).toBe( 200 );

			const secondCallHeaders = new Headers(
				fetchMock.mock.calls[ 1 ][ 1 ]?.headers
			);
			expect( secondCallHeaders.get( 'Authorization' ) ).toBe(
				'Bearer new-refreshed-token-400'
			);
		} );
	} );

	test( 'preserves session when getValidJwt returns null due to network error while refresh_token is stored', async () => {
		await app.runWithContext( async () => {
			localStorage.setItem( 'dame:refresh_token', 'valid-refresh-token' );
			const authStore = useAuthStore();
			expect( authStore.isAuthenticated ).toBe( true );

			vi.spyOn( authStore.jwtSdk, 'getValidJwt' ).mockResolvedValue(
				null
			);

			const result = await authStore.tryRefreshToken( true );
			expect( result ).toBeNull();
			expect( authStore.jwtSdk.isAuthenticated() ).toBe( true );
			expect( authStore.isAuthenticated ).toBe( true );
		} );
	} );

	test( 'preserves tokens and session on 500 REFRESH_TOKEN_STORE_FAILED during refresh', async () => {
		await app.runWithContext( async () => {
			const expiredJwt = 'header.eyJleHAiOjF9.sig';
			localStorage.setItem( 'dame:jwt', expiredJwt );
			localStorage.setItem( 'dame:refresh_token', 'valid-refresh-token' );

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue(
					new Response(
						JSON.stringify( {
							success: false,
							error_code: 131,
							data: {
								message: 'Unable to store refresh token.',
							},
						} ),
						{ status: 500 }
					)
				)
			);

			const authStore = useAuthStore();
			const pushSpy = vi
				.spyOn( router, 'push' )
				.mockResolvedValue( undefined as never );

			const result = await authStore.tryRefreshToken( true );
			expect( result ).toBeNull();
			expect( authStore.jwtSdk.getJwt() ).toBe( expiredJwt );
			expect( authStore.jwtSdk.getRefreshToken() ).toBe(
				'valid-refresh-token'
			);
			expect( authStore.jwtSdk.isAuthenticated() ).toBe( true );
			expect( authStore.isAuthenticated ).toBe( true );
			expect( pushSpy ).not.toHaveBeenCalled();
		} );
	} );

	test( 'runs full authenticate -> 401 -> silentRefresh rejection -> onSessionExpired flow', async () => {
		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			const pushSpy = vi
				.spyOn( router, 'push' )
				.mockResolvedValue( undefined as never );

			const fetchMock = vi
				.fn()
				// 1. POST /auth
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							success: true,
							data: {
								jwt: 'valid-initial-jwt',
								refresh_token: 'initial-refresh-token',
							},
						} ),
						{ status: 200 }
					)
				)
				// 2. GET /wp/v2/users/me
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							name: 'Jean Test',
							email: 'jean@exemple.fr',
							roles: [ 'adherent' ],
						} ),
						{ status: 200 }
					)
				)
				// 3. GET /dame/v1/my-identities
				.mockResolvedValueOnce(
					new Response( JSON.stringify( [] ), { status: 200 } )
				)
				// 4. GET /protected -> 401
				.mockResolvedValueOnce( new Response( null, { status: 401 } ) )
				// 5. POST /auth/refresh -> 401 revoked
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							success: false,
							error_code: 55,
							data: { message: 'Token has been revoked.' },
						} ),
						{ status: 401 }
					)
				);

			vi.stubGlobal( 'fetch', fetchMock );

			await authStore.login( 'jean@exemple.fr', 'Secret123!' );
			expect( authStore.isAuthenticated ).toBe( true );

			const res = await safeFetch( `${ getApiOrigin() }/protected` );
			expect( res.status ).toBe( 401 );
			expect( authStore.isAuthenticated ).toBe( false );
			expect( authStore.jwtSdk.getJwt() ).toBeNull();
			expect( pushSpy ).toHaveBeenCalledWith(
				expect.objectContaining( { path: '/login' } )
			);
		} );
	} );
} );
