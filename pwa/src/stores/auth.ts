import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { alertController } from '@ionic/vue';
import { App } from '@capacitor/app';
import { queryClient } from '../queryClient';
import router from '../router';
import {
	SimpleJwtLoginApiError,
	ERROR_CODES,
} from 'simple-jwt-login';
import type { WpUser } from '@/types/wp';
import type { Identity, AssociatedMember } from './auth/types';
import {
	createJwtSdk,
	encodeBase64Utf8,
	formatJwtErrorMessage,
	getTokenExpiryInfo,
	isTokenExpired,
} from './auth/jwtService';
import { useIdentitiesService } from './auth/identitiesService';
import { useAppConfig } from './auth/appConfig';
import { safeFetch } from '@/utils/safeFetch';

// Import des autres stores pour nettoyage au logout
import { useAgendaStore } from './agenda';
import { useContactStore } from './contacts';
import { useDashboardStore } from './dashboard';
import { useMemberStore } from './members';
import { useMessageStore } from './messages';
import { useBenevolatStore } from './benevolat';
import { useTournamentStore } from './tournament';
import { useNewsStore } from './news';
import { useApprentissageStore } from './apprentissage';

export type { AssociatedMember, Identity };

export interface TwoFactorChallenge {
	jwt: string;
	provider: string;
	username: string;
}

export const useAuthStore = defineStore(
	'auth',
	() => {
		const isLoading = ref( false );
		const twoFactorChallenge = ref< TwoFactorChallenge | null >( null );

		const getStoredUser = () => {
			const u = localStorage.getItem( 'dame_user' );
			try {
				return u === 'null' || u === 'undefined' || ! u
					? null
					: JSON.parse( u );
			} catch {
				return null;
			}
		};

		const getStoredIdentity = () => {
			const i = localStorage.getItem( 'dame_selected_identity' );
			try {
				return i === 'null' || i === 'undefined' || ! i
					? null
					: JSON.parse( i );
			} catch {
				return null;
			}
		};

		const user = ref< WpUser | null >( getStoredUser() );
		const selectedIdentity = ref< Identity | null >( getStoredIdentity() );
		const adminMode = ref( false );

		// ─── SDK simple-jwt-login & Session ───────────────────────────────────────
		const token = ref( '' );
		const isAuthState = ref( false );

		const clearLocalSessionState = () => {
			try {
				queryClient.clear();
			} catch ( e ) {
				console.warn(
					"Erreur lors de l'effacement du QueryClient:",
					e
				);
			}
			token.value = '';
			isAuthState.value = false;
			twoFactorChallenge.value = null;
			user.value = null;
			selectedIdentity.value = null;
			adminMode.value = false;
			localStorage.removeItem( 'dame_jwt_token' );
			localStorage.removeItem( 'dame_user' );
			localStorage.removeItem( 'dame_selected_identity' );
			useAgendaStore().clearData();
			useContactStore().clearData();
			useDashboardStore().clearData();
			useMemberStore().clearData();
			useMessageStore().clearData();
			useBenevolatStore().clearData();
			useTournamentStore().clearData();
			useNewsStore().clearData();
			useApprentissageStore().clearData();
		};

		const jwtSdk = createJwtSdk(
			( jwt ) => {
				token.value = jwt;
				isAuthState.value = true;
			},
			() => {
				clearLocalSessionState();
				router.push( {
					path: '/login',
					query: {
						message:
							'Votre session a expiré. Veuillez vous reconnecter.',
					},
				} );
			}
		);

		// Migration one-shot depuis l'ancienne clé dame_jwt_token vers LocalStorageTokenStorage('dame')
		const legacyToken = localStorage.getItem( 'dame_jwt_token' );
		if (
			legacyToken &&
			legacyToken !== 'null' &&
			legacyToken !== 'undefined'
		) {
			if ( ! jwtSdk.getJwt() ) {
				jwtSdk.setTokens( legacyToken );
			}
			localStorage.removeItem( 'dame_jwt_token' );
		}

		if ( jwtSdk.isAuthenticated() ) {
			token.value = jwtSdk.getJwt() || '';
			isAuthState.value = true;
		}

		const isAuthenticated = computed(
			() =>
				isAuthState.value ||
				( !! token.value && token.value.length > 10 ) ||
				jwtSdk.isAuthenticated()
		);

		const userRoles = computed( () => {
			const roles = user.value?.roles;
			if ( Array.isArray( roles ) ) {
				return roles;
			}
			if ( typeof roles === 'object' && roles !== null ) {
				return Object.values( roles );
			}
			return [];
		} );

		const isAdmin = computed( () => {
			if ( ! isAuthenticated.value ) {
				return false;
			}
			const roles = userRoles.value;
			const privilegedRoles = [
				'administrator',
				'editor',
				'staff',
				'entraineur',
			];

			return roles.some( ( role ) => {
				if ( typeof role !== 'string' ) {
					return false;
				}
				return privilegedRoles.includes( role.toLowerCase() );
			} );
		} );

		const isAdherent = computed( () => {
			if ( ! isAuthenticated.value ) {
				return false;
			}
			return selectedIdentity.value?.type === 'member';
		} );

		// ─── Sous-modules ─────────────────────────────────────────────────────────
		const {
			isRoiActive,
			currentSeason,
			apprentissageAllowedRoles,
			fetchPwaConfig,
		} = useAppConfig();

		const canAccessApprentissage = computed( () => {
			if ( ! isRoiActive.value ) {
				return false;
			}
			if ( ! isAuthenticated.value ) {
				return false;
			}
			const roles = userRoles.value;
			const normalizedUserRoles = roles.map( ( r: unknown ) =>
				typeof r === 'string' ? r.toLowerCase() : ''
			);
			return normalizedUserRoles.some( ( role ) =>
				apprentissageAllowedRoles.value
					.map( ( r ) => r.toLowerCase() )
					.includes( role )
			);
		} );

		const {
			myIdentities,
			isIdentitiesLoading,
			selectIdentity,
			fetchMyIdentities,
			checkIdentities,
		} = useIdentitiesService(
			token,
			selectedIdentity,
			router,
			isAuthenticated
		);

		const tryRefreshToken = async (
			force = true
		): Promise< string | null > => {
			const newJwt = await jwtSdk.getValidJwt( force );
			if ( newJwt ) {
				token.value = newJwt;
				isAuthState.value = true;
				return newJwt;
			}
			// Ne déconnecter l'utilisateur que si sdk.isAuthenticated() est false
			// (les erreurs réseau ou 5xx préservent les tokens dans le SDK)
			if ( ! jwtSdk.isAuthenticated() ) {
				isAuthState.value = false;
				token.value = '';
			} else {
				isAuthState.value = true;
			}
			return null;
		};

		const validateSession = async () => {
			if ( ! jwtSdk.isAuthenticated() ) {
				return;
			}

			const currentJwt = await jwtSdk.getValidJwt();
			if ( ! currentJwt ) {
				// Si hors-ligne ou erreur réseau mais toujours authentifié localement, on garde la session active
				return;
			}

			token.value = currentJwt;
			isAuthState.value = true;

			try {
				const response = await jwtSdk.validateToken( {
					JWT: currentJwt,
				} );
				if ( response && response.success === false ) {
					await tryRefreshToken( true );
				}
			} catch ( error: unknown ) {
				if ( error instanceof SimpleJwtLoginApiError ) {
					if (
						error.isErrorCode( ERROR_CODES.VALIDATION_DISABLED )
					) {
						return;
					}

					const shouldRefresh =
						error.isErrorCode( ERROR_CODES.JWT_EXPIRED ) ||
						error.isErrorCode( ERROR_CODES.JWT_NOT_BEFORE ) ||
						error.isErrorCode( ERROR_CODES.JWT_NOT_YET_VALID ) ||
						error.isErrorCode(
							ERROR_CODES.JWT_SIGNATURE_INVALID
						) ||
						error.isErrorCode(
							ERROR_CODES.JWT_STRUCTURAL_ERROR
						) ||
						error.isErrorCode( ERROR_CODES.JWT_REVOKED ) ||
						error.isErrorCode(
							ERROR_CODES.JWT_AUDIENCE_MISMATCH
						) ||
						error.status === 401 ||
						error.status === 400;

					if ( shouldRefresh ) {
						await tryRefreshToken( true );
					}
				}
			}
		};

		const completeAuthenticatedSession = async (
			jwtToken: string,
			username: string
		) => {
			token.value = jwtToken;
			isAuthState.value = true;

			let roles: string[] = [];
			let displayName = username;
			let email = '';

			try {
				const profileRes = await safeFetch(
					'/wp/v2/users/me?context=edit'
				);

				if ( profileRes.ok ) {
					const profile = await profileRes.json();
					if ( profile.roles ) {
						roles = profile.roles;
					}
					if ( profile.name ) {
						displayName = profile.name;
					}
					if ( profile.email ) {
						email = profile.email;
					}

					if (
						roles.length === 1 &&
						roles.includes( 'subscriber' )
					) {
						await jwtSdk.logout();
						token.value = '';
						isAuthState.value = false;
						throw new Error(
							'Veuillez valider votre adresse e-mail avant de vous connecter.'
						);
					}
				}
			} catch ( e: unknown ) {
				const err = e as Error | undefined;
				if (
					err?.message &&
					err.message.includes( 'Veuillez valider' )
				) {
					throw e;
				}
				console.warn(
					"Profil complet non accessible, utilisation des données d'identifiants."
				);
			}

			user.value = {
				name: displayName,
				email,
				roles,
			};

			localStorage.setItem( 'dame_user', JSON.stringify( user.value ) );

			useAgendaStore().clearData();
			await checkIdentities();
		};

		const login = async ( username: string, password: string ) => {
			if ( ! username || ! password ) {
				return;
			}
			isLoading.value = true;
			twoFactorChallenge.value = null;

			try {
				const base64Password = encodeBase64Utf8( password );
				const authParams: {
					password: string;
					email?: string;
					username?: string;
				} = { password: base64Password };
				if ( username.includes( '@' ) ) {
					authParams.email = username;
				} else {
					authParams.username = username;
				}

				const authResponse = await jwtSdk.authenticate( authParams );

				if (
					authResponse.data?.two_factor_required &&
					authResponse.data?.jwt
				) {
					twoFactorChallenge.value = {
						jwt: authResponse.data.jwt,
						provider: authResponse.data.provider || '',
						username,
					};
					return;
				}

				const jwtToken = authResponse.data?.jwt;

				if ( jwtToken ) {
					await completeAuthenticatedSession( jwtToken, username );
				} else {
					throw new Error( "Erreur d'identifiants" );
				}
			} catch ( error: unknown ) {
				console.error( 'Erreur de connexion:', error );

				const alert = await alertController.create( {
					header: 'Échec de connexion',
					message: formatJwtErrorMessage( error ),
					buttons: [ 'OK' ],
				} );
				await alert.present();
			} finally {
				isLoading.value = false;
			}
		};

		const verifyTwoFactor = async ( code: string ): Promise< boolean > => {
			const challenge = twoFactorChallenge.value;
			const trimmedCode = code.trim();
			if ( ! challenge || ! trimmedCode ) {
				return false;
			}
			isLoading.value = true;

			try {
				const response = await jwtSdk.verifyTwoFactor( {
					JWT: challenge.jwt,
					code: trimmedCode,
				} );
				const jwtToken = response.data?.jwt;

				if ( ! jwtToken ) {
					throw new Error( 'Code de vérification invalide.' );
				}

				twoFactorChallenge.value = null;
				await completeAuthenticatedSession(
					jwtToken,
					challenge.username
				);
				return true;
			} catch ( error: unknown ) {
				console.error( 'Erreur vérification 2FA:', error );

				if (
					error instanceof SimpleJwtLoginApiError &&
					( error.isErrorCode(
						ERROR_CODES.TWO_FACTOR_INVALID_NONCE
					) ||
						error.isErrorCode(
							ERROR_CODES.TWO_FACTOR_INTERIM_JWT_REQUIRED
						) ||
						error.isErrorCode(
							ERROR_CODES.TWO_FACTOR_INTERIM_JWT_REJECTED
						) )
				) {
					twoFactorChallenge.value = null;
				}

				const alert = await alertController.create( {
					header: 'Vérification 2FA',
					message: formatJwtErrorMessage( error ),
					buttons: [ 'OK' ],
				} );
				await alert.present();
				return false;
			} finally {
				isLoading.value = false;
			}
		};

		const cancelTwoFactor = () => {
			twoFactorChallenge.value = null;
		};

		const logout = async () => {
			clearLocalSessionState();
			router.push( '/tabs/home' );
			await jwtSdk.logout();
		};

		let isSessionValidating = false;
		const debouncedValidateSession = async () => {
			if ( isSessionValidating ) {
				return;
			}
			isSessionValidating = true;
			try {
				await validateSession();
			} finally {
				setTimeout( () => {
					isSessionValidating = false;
				}, 1000 );
			}
		};

		try {
			App.addListener( 'appStateChange', ( { isActive } ) => {
				if ( isActive ) {
					debouncedValidateSession();
				}
			} );
		} catch ( e ) {
			console.warn( 'Capacitor App listener non disponible :', e );
		}

		if ( typeof document !== 'undefined' ) {
			document.addEventListener( 'visibilitychange', () => {
				if ( document.visibilityState === 'visible' ) {
					debouncedValidateSession();
				}
			} );
		}

		debouncedValidateSession();

		return {
			jwtSdk,
			token,
			user,
			selectedIdentity,
			adminMode,
			isAuthenticated,
			isAdmin,
			isAdherent,
			isLoading,
			twoFactorChallenge,
			login,
			verifyTwoFactor,
			cancelTwoFactor,
			logout,
			selectIdentity,
			checkIdentities,
			isRoiActive,
			currentSeason,
			fetchPwaConfig,
			validateSession,
			tryRefreshToken,
			isTokenExpired,
			getTokenExpiryInfo,
			apprentissageAllowedRoles,
			canAccessApprentissage,
			myIdentities,
			fetchMyIdentities,
			isIdentitiesLoading,
		};
	},
	{
		persist: {
			omit: [ 'isLoading', 'jwtSdk', 'token', 'twoFactorChallenge' ],
		},
	}
);
