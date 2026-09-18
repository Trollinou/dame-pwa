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

		const isAuthenticated = computed(
			() => !! token.value && token.value.length > 10
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
		} = useIdentitiesService( token, selectedIdentity, router );

		// ─── SDK simple-jwt-login & Session ───────────────────────────────────────
		const jwtSdk = createJwtSdk( ( jwt ) => {
			token.value = jwt;
			localStorage.setItem( 'dame_jwt_token', jwt );
		} );

		if ( token.value ) {
			jwtSdk.setTokens( token.value );
		}

		let activeRefreshPromise: Promise< string | null > | null = null;

		const tryRefreshToken = async (): Promise< string | null > => {
			if ( activeRefreshPromise ) {
				return activeRefreshPromise;
			}

			activeRefreshPromise = ( async () => {
				if ( ! token.value ) {
					logout();
					return null;
				}
				const storedRefreshToken =
					typeof localStorage !== 'undefined'
						? localStorage.getItem( 'dame:refresh_token' )
						: null;

				try {
					let refreshResponse;
					if ( storedRefreshToken ) {
						refreshResponse = await jwtSdk.refreshToken( {
							refresh_token: storedRefreshToken,
						} );
					} else {
						refreshResponse = await jwtSdk.refreshToken( {
							JWT: token.value,
						} );
					}

					const newJwt = refreshResponse?.data?.jwt;
					if ( newJwt ) {
						token.value = newJwt;
						localStorage.setItem( 'dame_jwt_token', newJwt );
						return newJwt;
					}
					logout();
					return null;
				} catch ( refreshError: unknown ) {
					const err = refreshError as
						| { data?: { message?: string }; message?: string }
						| undefined;
					const msg = String(
						err?.data?.message || err?.message || ''
					).toLowerCase();
					if (
						! msg.includes( 'network' ) &&
						! msg.includes( 'offline' ) &&
						! msg.includes( 'fetch' )
					) {
						logout();
					}
					return null;
				} finally {
					activeRefreshPromise = null;
				}
			} )();

			return activeRefreshPromise;
		};

		const validateSession = async () => {
			if ( ! token.value ) {
				return;
			}
			const info = getTokenExpiryInfo( token.value );

			if ( info.isExpired ) {
				await tryRefreshToken();
				return;
			}
			try {
				const response = await jwtSdk.validateToken( {
					JWT: token.value,
				} );
				if ( response && response.success === false ) {
					await tryRefreshToken();
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
					await tryRefreshToken();
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
					localStorage.setItem( 'dame_jwt_token', jwtToken );

					let roles: string[] = [];
					let displayName = username;
					let email = '';

					try {
						const profileRes = await safeFetch(
							`${
								import.meta.env.VITE_API_BASE_URL
							}/wp/v2/users/me?context=edit`,
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
								await jwtSdk
									.revokeToken( { JWT: token.value } )
									.catch( () => {} );
								token.value = '';
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

		const logout = () => {
			if ( token.value ) {
				jwtSdk.revokeToken( { JWT: token.value } ).catch( ( e ) => {
					console.warn(
						'Erreur lors de la révocation du jeton sur le serveur:',
						e
					);
				} );
				jwtSdk.clearTokens();
			}

			try {
				queryClient.clear();
			} catch ( e ) {
				console.warn(
					"Erreur lors de l'effacement du QueryClient:",
					e
				);
			}
			token.value = '';
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
			router.push( '/tabs/home' );
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
			omit: [ 'isLoading' ],
		},
	}
);
