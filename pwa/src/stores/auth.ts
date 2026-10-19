import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { alertController } from '@ionic/vue';
import { App } from '@capacitor/app';
import { queryClient } from '../queryClient';
import router from '../router';
import type { WpUser } from '@/types/wp';
import type { Identity, AssociatedMember } from './auth/types';
import {
	createJwtSdk,
	getTokenExpiryInfo,
	isTokenExpired,
	translateErrorMessage,
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

export const useAuthStore = defineStore(
	'auth',
	() => {
		const isLoading = ref( false );

		const getStoredToken = () => {
			const t = localStorage.getItem( 'dame_jwt_token' );
			return t === 'null' || t === 'undefined' || ! t ? '' : t;
		};

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

		const token = ref( getStoredToken() );
		const user = ref< WpUser | null >( getStoredUser() );
		const selectedIdentity = ref< Identity | null >( getStoredIdentity() );
		const adminMode = ref( false );

		// ─── SDK simple-jwt-login & Session ───────────────────────────────────────
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
				localStorage.setItem( 'dame_jwt_token', jwt );
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

		if ( token.value && ! jwtSdk.getJwt() ) {
			jwtSdk.setTokens( token.value );
		} else if ( ! token.value && jwtSdk.getJwt() ) {
			const sdkJwt = jwtSdk.getJwt() || '';
			token.value = sdkJwt;
			if ( sdkJwt ) {
				localStorage.setItem( 'dame_jwt_token', sdkJwt );
			}
		}

		const isAuthState = ref(
			jwtSdk.isAuthenticated() ||
				( !! token.value && token.value.length > 10 )
		);

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
			if ( token.value && ! jwtSdk.getJwt() ) {
				jwtSdk.setTokens( token.value );
			}
			const newJwt = await jwtSdk.getValidJwt( force );
			if ( newJwt ) {
				token.value = newJwt;
				isAuthState.value = true;
				localStorage.setItem( 'dame_jwt_token', newJwt );
				return newJwt;
			}
			// Ne déconnecter l'utilisateur que si sdk.isAuthenticated() est false
			// (les erreurs réseau ou 5xx préservent les tokens dans le SDK)
			if ( ! jwtSdk.isAuthenticated() ) {
				isAuthState.value = false;
			}
			return null;
		};

		const validateSession = async () => {
			if ( ! jwtSdk.isAuthenticated() && ! token.value ) {
				return;
			}
			if ( token.value && ! jwtSdk.getJwt() ) {
				jwtSdk.setTokens( token.value );
			}

			const currentJwt = await jwtSdk.getValidJwt();
			if ( ! currentJwt ) {
				// Si hors-ligne ou erreur réseau mais toujours authentifié localement, on garde la session active
				return;
			}

			token.value = currentJwt;
			isAuthState.value = true;
			localStorage.setItem( 'dame_jwt_token', currentJwt );

			try {
				const response = await jwtSdk.validateToken( {
					JWT: currentJwt,
				} );
				if ( response && response.success === false ) {
					await tryRefreshToken( true );
				}
			} catch ( error: unknown ) {
				const err = error as
					| {
							response?: unknown;
							data?: { message?: string };
							message?: string;
					  }
					| undefined;
				let rawResponse = '';
				if ( typeof err?.response === 'string' ) {
					rawResponse = err.response;
				} else if ( typeof error === 'string' ) {
					rawResponse = error;
				}

				if (
					rawResponse.includes( 'not enabled' ) ||
					rawResponse.includes( '82' )
				) {
					return;
				}

				const msg = String(
					err?.data?.message || err?.message || rawResponse
				).toLowerCase();
				if (
					msg.includes( 'expired' ) ||
					msg.includes( 'invalid' ) ||
					msg.includes( 'revoked' )
				) {
					await tryRefreshToken( true );
				}
			}
		};

		const login = async ( username: string, password: string ) => {
			if ( ! username || ! password ) {
				return;
			}
			isLoading.value = true;

			try {
				const base64Password = btoa(
					unescape( encodeURIComponent( password ) )
				);
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
				const jwtToken = authResponse.data?.jwt;

				if ( jwtToken ) {
					token.value = jwtToken;
					isAuthState.value = true;
					localStorage.setItem( 'dame_jwt_token', jwtToken );

					let roles: string[] = [];
					let displayName = username;
					let email = '';

					try {
						const profileRes = await safeFetch(
							'/wp/v2/users/me?context=edit',
							{
								headers: {
									Authorization: `Bearer ${ token.value }`,
								},
							}
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
								localStorage.removeItem( 'dame_jwt_token' );
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

					localStorage.setItem(
						'dame_user',
						JSON.stringify( user.value )
					);

					useAgendaStore().clearData();
					await checkIdentities();
				} else {
					throw new Error( "Erreur d'identifiants" );
				}
			} catch ( error: unknown ) {
				console.error( 'Erreur de connexion:', error );

				const err = error as
					| {
							response?: string;
							message?: string;
							data?: { message?: string };
					  }
					| undefined;
				let errorMessage = 'Erreur serveur.';
				if ( err && err.response ) {
					try {
						const parsed = JSON.parse( err.response );
						errorMessage =
							parsed.message ||
							( parsed.data && parsed.data.message ) ||
							errorMessage;
					} catch {
						errorMessage = err.response || errorMessage;
					}
				} else if ( err && err.message ) {
					const match = err.message.match(
						/^HTTP Error: \d+ - (.*)$/
					);
					if ( match && match[ 1 ] ) {
						try {
							const parsed = JSON.parse( match[ 1 ] );
							errorMessage =
								parsed.message ||
								( parsed.data && parsed.data.message ) ||
								match[ 1 ];
						} catch {
							errorMessage = match[ 1 ];
						}
					} else if ( err.message ) {
						errorMessage = err.message;
					}
				}

				const alert = await alertController.create( {
					header: 'Échec de connexion',
					message: translateErrorMessage( errorMessage ),
					buttons: [ 'OK' ],
				} );
				await alert.present();
			} finally {
				isLoading.value = false;
			}
		};

		const logout = async () => {
			if ( token.value && ! jwtSdk.getJwt() ) {
				jwtSdk.setTokens( token.value );
			}
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
			login,
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
			omit: [ 'isLoading', 'jwtSdk' ],
		},
	}
);
