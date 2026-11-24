import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { alertController } from '@ionic/vue';
import { ERROR_CODES } from 'simple-jwt-login';
import { queryClient } from '@/queryClient';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

describe( 'useAuthStore — SDK 1.2.0 & 2FA', () => {
	let app: ReturnType< typeof createApp >;
	let alertCreateSpy: ReturnType< typeof vi.spyOn >;

	beforeEach( () => {
		const pinia = createPinia();
		app = createApp( {} );
		app.use( pinia );
		app.use( VueQueryPlugin, { queryClient } );
		setActivePinia( pinia );
		queryClient.clear();
		localStorage.clear();
		vi.restoreAllMocks();

		alertCreateSpy = vi
			.spyOn( alertController, 'create' )
			.mockResolvedValue( {
				present: vi.fn().mockResolvedValue( undefined ),
			} as unknown as HTMLIonAlertElement );
		vi.spyOn( router, 'push' ).mockResolvedValue( undefined as never );
	} );

	afterEach( () => {
		vi.restoreAllMocks();
	} );

	test( 'migrates legacy dame_jwt_token once to SDK storage and removes legacy key', async () => {
		localStorage.setItem( 'dame_jwt_token', 'legacy-jwt-token-123456' );

		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			expect( authStore.jwtSdk.getJwt() ).toBe(
				'legacy-jwt-token-123456'
			);
			expect( localStorage.getItem( 'dame_jwt_token' ) ).toBeNull();
			expect( localStorage.getItem( 'dame:jwt' ) ).toBe(
				'legacy-jwt-token-123456'
			);
		} );
	} );

	test( 'handles 2FA challenge without storing interim JWT and completes on verifyTwoFactor', async () => {
		await app.runWithContext( async () => {
			const authStore = useAuthStore();

			const fetchMock = vi
				.fn()
				// 1. POST /auth -> 2FA required
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							success: true,
							data: {
								jwt: 'interim-2fa-jwt',
								two_factor_required: true,
								provider: 'Two_Factor_Totp',
							},
						} ),
						{ status: 200 }
					)
				)
				// 2. POST /auth/2fa -> final tokens
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							success: true,
							data: {
								jwt: 'final-authenticated-jwt',
								refresh_token: 'final-refresh-token',
							},
						} ),
						{ status: 200 }
					)
				)
				// 3. GET /wp/v2/users/me
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							name: 'Admin Club',
							email: 'admin@exemple.fr',
							roles: [ 'administrator' ],
						} ),
						{ status: 200 }
					)
				)
				// 4. GET /dame/v1/my-identities
				.mockResolvedValueOnce(
					new Response( JSON.stringify( [] ), { status: 200 } )
				);

			vi.stubGlobal( 'fetch', fetchMock );

			await authStore.login( 'admin', 'StrongPass!' );

			expect( authStore.isAuthenticated ).toBe( false );
			expect( authStore.jwtSdk.getJwt() ).toBeNull();
			expect( localStorage.getItem( 'dame_jwt_token' ) ).toBeNull();
			expect( authStore.twoFactorChallenge ).toEqual( {
				jwt: 'interim-2fa-jwt',
				provider: 'Two_Factor_Totp',
				username: 'admin',
			} );

			const verified = await authStore.verifyTwoFactor( '123456' );

			expect( verified ).toBe( true );
			expect( authStore.twoFactorChallenge ).toBeNull();
			expect( authStore.isAuthenticated ).toBe( true );
			expect( authStore.jwtSdk.getJwt() ).toBe(
				'final-authenticated-jwt'
			);
			expect( authStore.jwtSdk.getRefreshToken() ).toBe(
				'final-refresh-token'
			);
			expect( authStore.isAdmin ).toBe( true );
		} );
	} );

	test( 'keeps 2FA challenge on 401 TWO_FACTOR_INVALID_CODE and 429 TWO_FACTOR_RATE_LIMITED', async () => {
		const consoleErrorSpy = vi
			.spyOn( console, 'error' )
			.mockImplementation( () => {} );

		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			authStore.twoFactorChallenge = {
				jwt: 'interim-2fa-jwt',
				provider: 'Two_Factor_Totp',
				username: 'admin',
			};

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							success: false,
							error_code: ERROR_CODES.TWO_FACTOR_INVALID_CODE,
							data: { message: 'Invalid 2FA code.' },
						} ),
						{ status: 401 }
					)
				)
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							success: false,
							error_code: ERROR_CODES.TWO_FACTOR_RATE_LIMITED,
							data: { message: 'Too many attempts.' },
						} ),
						{ status: 429 }
					)
				);

			vi.stubGlobal( 'fetch', fetchMock );

			const firstAttempt = await authStore.verifyTwoFactor( '000000' );
			expect( firstAttempt ).toBe( false );
			expect( authStore.twoFactorChallenge ).not.toBeNull();
			expect( alertCreateSpy ).toHaveBeenLastCalledWith(
				expect.objectContaining( {
					message:
						'Code de vérification invalide. Veuillez réessayer.',
				} )
			);

			const secondAttempt = await authStore.verifyTwoFactor( '111111' );
			expect( secondAttempt ).toBe( false );
			expect( authStore.twoFactorChallenge ).not.toBeNull();
			expect( alertCreateSpy ).toHaveBeenLastCalledWith(
				expect.objectContaining( {
					message:
						'Trop de tentatives. Veuillez patienter avant de réessayer.',
				} )
			);
		} );
		consoleErrorSpy.mockRestore();
	} );

	test( 'resets 2FA challenge to login form on 401 TWO_FACTOR_INVALID_NONCE', async () => {
		const consoleErrorSpy = vi
			.spyOn( console, 'error' )
			.mockImplementation( () => {} );

		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			authStore.twoFactorChallenge = {
				jwt: 'interim-2fa-jwt',
				provider: 'Two_Factor_Totp',
				username: 'admin',
			};

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValueOnce(
					new Response(
						JSON.stringify( {
							success: false,
							error_code: ERROR_CODES.TWO_FACTOR_INVALID_NONCE,
							data: { message: 'Invalid or expired nonce.' },
						} ),
						{ status: 401 }
					)
				)
			);

			const result = await authStore.verifyTwoFactor( '123456' );
			expect( result ).toBe( false );
			expect( authStore.twoFactorChallenge ).toBeNull();
			expect( alertCreateSpy ).toHaveBeenCalledWith(
				expect.objectContaining( {
					message:
						'La session de vérification 2FA a expiré. Veuillez vous reconnecter.',
				} )
			);
		} );
		consoleErrorSpy.mockRestore();
	} );

	test( 'validateSession ignores VALIDATION_DISABLED (82) and refreshes on JWT_REVOKED (55) or JWT_AUDIENCE_MISMATCH (130)', async () => {
		await app.runWithContext( async () => {
			const authStore = useAuthStore();
			authStore.jwtSdk.setTokens( 'valid-jwt', 'valid-refresh' );
			const getValidJwtSpy = vi
				.spyOn( authStore.jwtSdk, 'getValidJwt' )
				.mockImplementation( async ( force?: boolean ) =>
					force ? 'refreshed-jwt' : 'valid-jwt'
				);

			const validateResponses = [
				new Response(
					JSON.stringify( {
						success: false,
						error_code: ERROR_CODES.VALIDATION_DISABLED,
						data: { message: 'Validation is not enabled.' },
					} ),
					{ status: 400 }
				),
				new Response(
					JSON.stringify( {
						success: false,
						error_code: ERROR_CODES.JWT_REVOKED,
						data: { message: 'Token has been revoked.' },
					} ),
					{ status: 401 }
				),
				new Response(
					JSON.stringify( {
						success: false,
						error_code: ERROR_CODES.JWT_AUDIENCE_MISMATCH,
						data: { message: 'Invalid JWT audience.' },
					} ),
					{ status: 401 }
				),
			];

			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation( async ( input: RequestInfo | URL ) => {
					const url = String( input );
					if ( url.includes( '/auth/validate' ) ) {
						return (
							validateResponses.shift() ??
							new Response( JSON.stringify( { success: true } ), {
								status: 200,
							} )
						);
					}
					return new Response( JSON.stringify( [] ), {
						status: 200,
					} );
				} )
			);

			await authStore.validateSession();
			expect(
				getValidJwtSpy.mock.calls.filter( ( [ arg ] ) => arg === true )
			).toHaveLength( 0 );

			await authStore.validateSession();
			expect(
				getValidJwtSpy.mock.calls.filter( ( [ arg ] ) => arg === true )
			).toHaveLength( 1 );

			await authStore.validateSession();
			expect(
				getValidJwtSpy.mock.calls.filter( ( [ arg ] ) => arg === true )
			).toHaveLength( 2 );
		} );
	} );
} );
