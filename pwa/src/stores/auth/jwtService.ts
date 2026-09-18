import { SimpleJwtLogin, LocalStorageTokenStorage } from 'simple-jwt-login';
import type { TokenExpiryInfo } from './types';

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

export const createJwtSdk = ( onTokenRefreshed: ( _jwt: string ) => void ) => {
	return new SimpleJwtLogin( getApiOrigin(), {
		tokenStorage: new LocalStorageTokenStorage( 'dame' ),
		refreshBeforeExpirySeconds: 60,
		onTokenRefreshed,
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
