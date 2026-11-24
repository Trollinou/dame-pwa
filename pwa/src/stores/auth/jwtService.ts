import {
	SimpleJwtLogin,
	SimpleJwtLoginApiError,
	LocalStorageTokenStorage,
	ERROR_CODES,
} from 'simple-jwt-login';
import type { TokenExpiryInfo } from './types';

export const encodeBase64Utf8 = ( value: string ): string => {
	const bytes = new TextEncoder().encode( value );
	let binary = '';
	for ( const byte of bytes ) {
		binary += String.fromCharCode( byte );
	}
	return btoa( binary );
};

export const getTwoFactorProviderLabel = ( provider?: string ): string => {
	switch ( provider ) {
		case 'Two_Factor_Totp':
			return 'Application d’authentification (TOTP)';
		case 'Two_Factor_Email':
			return 'Code envoyé par e-mail';
		case 'Two_Factor_Backup_Codes':
			return 'Code de secours';
		default:
			return 'Vérification en deux étapes';
	}
};

export const getApiOrigin = (): string => {
	const url = import.meta.env.VITE_API_BASE_URL || '';
	const base = url.replace( /\/wp-json\/?.*$/, '' );
	if ( ! base || base.startsWith( '/' ) ) {
		return (
			( typeof window !== 'undefined' ? window.location.origin : '' ) +
			base
		);
	}
	return base;
};

export const createJwtSdk = (
	onTokenRefreshed: ( _jwt: string ) => void,
	onSessionExpired?: ( _error: SimpleJwtLoginApiError ) => void
) => {
	return new SimpleJwtLogin( getApiOrigin(), {
		tokenStorage: new LocalStorageTokenStorage( 'dame' ),
		refreshBeforeExpirySeconds: 60,
		useWpJson: true,
		onTokenRefreshed,
		onSessionExpired,
	} );
};

export const decodeJwtPayload = (
	jwt: string
): Record< string, unknown > | null => {
	try {
		const parts = jwt.split( '.' );
		if ( parts.length !== 3 ) {
			return null;
		}
		return JSON.parse( atob( parts[ 1 ] ) );
	} catch {
		return null;
	}
};

export const getTokenExpiryInfo = ( jwt: string ): TokenExpiryInfo => {
	const payload = decodeJwtPayload( jwt );
	if ( ! payload || typeof payload.exp !== 'number' ) {
		return {
			isExpired: true,
			secondsLeft: 0,
			expDate: 'Inconnu/Invalide',
			payload,
		};
	}
	const nowSeconds = Math.floor( Date.now() / 1000 );
	const secondsLeft = payload.exp - nowSeconds;
	return {
		isExpired: secondsLeft <= 0,
		secondsLeft,
		expDate: new Date( payload.exp * 1000 ).toLocaleTimeString(),
		payload,
	};
};

export const isTokenExpired = ( jwt: string ): boolean => {
	if ( ! jwt ) {
		return true;
	}
	return getTokenExpiryInfo( jwt ).isExpired;
};

export const translateErrorMessage = ( msg: string ): string => {
	if ( ! msg ) {
		return 'Erreur de connexion.';
	}
	const lowerMsg = msg.toLowerCase().trim();

	const translations: { [ key: string ]: string } = {
		'wrong user credentials.': 'Identifiants incorrects.',
		'wrong username or password.': 'Identifiants incorrects.',
		'wrong email or password.': 'Identifiants incorrects.',
		'user not found.': 'Utilisateur non trouvé.',
		'missing username or email.': "Nom d'utilisateur ou e-mail manquant.",
		'missing password.': 'Mot de passe manquant.',
		'token is expired.':
			'Votre session a expiré. Veuillez vous reconnecter.',
		'jwt is expired.': 'Votre session a expiré. Veuillez vous reconnecter.',
		'invalid token.': 'Session de connexion invalide.',
		'jwt is invalid.': 'Session de connexion invalide.',
		'token has been revoked.': 'Votre session a été fermée sur le serveur.',
		'validation failed.': 'Échec de la validation de session.',
	};

	if ( translations[ lowerMsg ] ) {
		return translations[ lowerMsg ];
	}

	if (
		lowerMsg.includes( 'credential' ) ||
		lowerMsg.includes( 'wrong password' ) ||
		lowerMsg.includes( 'incorrect' )
	) {
		return 'Identifiants incorrects.';
	}
	if ( lowerMsg.includes( 'expired' ) ) {
		return 'Votre session a expiré. Veuillez vous reconnecter.';
	}
	if ( lowerMsg.includes( 'invalid' ) ) {
		return 'Session invalide. Veuillez vous reconnecter.';
	}
	if ( lowerMsg.includes( 'not found' ) ) {
		return 'Utilisateur non trouvé.';
	}

	return msg;
};

export const formatJwtErrorMessage = (
	error: unknown,
	fallback = 'Erreur serveur.'
): string => {
	if ( error instanceof SimpleJwtLoginApiError ) {
		if ( error.isErrorCode( ERROR_CODES.INVALID_CREDENTIALS ) ) {
			return 'Identifiants incorrects.';
		}
		if ( error.isErrorCode( ERROR_CODES.USER_NOT_FOUND ) ) {
			return 'Utilisateur non trouvé.';
		}
		if ( error.isErrorCode( ERROR_CODES.JWT_EXPIRED ) ) {
			return 'Votre session a expiré. Veuillez vous reconnecter.';
		}
		if ( error.isErrorCode( ERROR_CODES.JWT_REVOKED ) ) {
			return 'Votre session a été fermée sur le serveur.';
		}
		if (
			error.isErrorCode( ERROR_CODES.JWT_NOT_BEFORE ) ||
			error.isErrorCode( ERROR_CODES.JWT_NOT_YET_VALID ) ||
			error.isErrorCode( ERROR_CODES.JWT_SIGNATURE_INVALID ) ||
			error.isErrorCode( ERROR_CODES.JWT_STRUCTURAL_ERROR ) ||
			error.isErrorCode( ERROR_CODES.JWT_AUDIENCE_MISMATCH )
		) {
			return 'Session invalide. Veuillez vous reconnecter.';
		}
		if ( error.isErrorCode( ERROR_CODES.PROTECT_ENDPOINTS_MISSING_JWT ) ) {
			return 'Authentification requise.';
		}
		if (
			error.isErrorCode( ERROR_CODES.PROTECT_ENDPOINTS_INSUFFICIENT_ROLE )
		) {
			return 'Droits insuffisants pour accéder à cette ressource.';
		}
		if ( error.isErrorCode( ERROR_CODES.TWO_FACTOR_INVALID_CODE ) ) {
			if ( /reset/i.test( error.message ) ) {
				return error.message;
			}
			return 'Code de vérification invalide. Veuillez réessayer.';
		}
		if (
			error.isErrorCode( ERROR_CODES.TWO_FACTOR_INVALID_NONCE ) ||
			error.isErrorCode( ERROR_CODES.TWO_FACTOR_INTERIM_JWT_REQUIRED ) ||
			error.isErrorCode( ERROR_CODES.TWO_FACTOR_INTERIM_JWT_REJECTED )
		) {
			return 'La session de vérification 2FA a expiré. Veuillez vous reconnecter.';
		}
		if ( error.isErrorCode( ERROR_CODES.TWO_FACTOR_RATE_LIMITED ) ) {
			return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
		}
		if ( error.isErrorCode( ERROR_CODES.TWO_FACTOR_NONCE_CREATE_FAILED ) ) {
			return 'Erreur temporaire du serveur lors de la vérification 2FA. Veuillez réessayer.';
		}
		return translateErrorMessage( error.message || fallback );
	}

	if ( error instanceof Error ) {
		return translateErrorMessage( error.message || fallback );
	}

	return fallback;
};
