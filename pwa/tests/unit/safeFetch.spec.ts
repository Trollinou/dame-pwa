import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import { safeFetch } from '@/utils/safeFetch';
import { useAuthStore } from '@/stores/auth';

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
			localStorage.setItem( 'dame_jwt_token', 'expired-token' );
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

			const res = await safeFetch( 'https://api.example.com/protected' );

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

	test( 'attempts transparent token refresh on 400 Bad Request with Authorization header', async () => {
		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			vi.spyOn( authStore, 'tryRefreshToken' ).mockResolvedValue(
				'new-refreshed-token-400'
			);
			localStorage.setItem( 'dame_jwt_token', 'expired-token' );

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
} );
