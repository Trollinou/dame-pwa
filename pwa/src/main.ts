import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { IonicVue } from '@ionic/vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { vSafeHtml } from './directives/safeHtml';
import { VueQueryPlugin, focusManager } from '@tanstack/vue-query';
import { App as CapacitorApp } from '@capacitor/app';
import { queryClient } from './queryClient';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables & Shared Components */
import './theme/variables.css';
import './theme/shared-components.scss';
import { registerSW } from 'virtual:pwa-register';

const pinia = createPinia();
pinia.use( piniaPluginPersistedstate );

// Lier le focusManager de TanStack Query au cycle de vie natif de Capacitor
try {
	CapacitorApp.addListener( 'appStateChange', ( { isActive } ) => {
		focusManager.setFocused( isActive );
	} );
} catch ( e ) {
	console.warn( 'Capacitor App listener non disponible :', e );
}

const app = createApp( App )
	.use( IonicVue, {
		mode: 'ios',
	} )
	.use( pinia )
	.use( router )
	.use( VueQueryPlugin, { queryClient } );

app.directive( 'safe-html', vSafeHtml );

router.isReady().then( () => {
	app.mount( '#app' );

	// Rechargement automatique et immédiat dès qu'un nouveau Service Worker s'active
	if ( typeof navigator !== 'undefined' && 'serviceWorker' in navigator ) {
		navigator.serviceWorker.addEventListener( 'controllerchange', () => {
			window.location.reload();
		} );
	}

	// Enregistrement du Service Worker avec vérifications périodiques et au réveil
	registerSW( {
		immediate: true,
		onRegisteredSW( _swUrl, registration ) {
			if ( ! registration ) {
				return;
			}

			// 1. Vérification périodique toutes les 30 minutes
			setInterval(
				() => {
					registration.update().catch( () => {} );
				},
				30 * 60 * 1000
			);

			// 2. Vérification au retour au premier plan (crucial sur iOS WebClip)
			if ( typeof document !== 'undefined' ) {
				document.addEventListener( 'visibilitychange', () => {
					if ( document.visibilityState === 'visible' ) {
						registration.update().catch( () => {} );
					}
				} );
			}

			if ( typeof window !== 'undefined' ) {
				window.addEventListener( 'pageshow', () => {
					registration.update().catch( () => {} );
				} );
			}

			// 3. Vérification lors de la reprise de l'app native/Capacitor
			try {
				CapacitorApp.addListener(
					'appStateChange',
					( { isActive } ) => {
						if ( isActive ) {
							registration.update().catch( () => {} );
						}
					}
				);
			} catch {
				// Silencieux si Capacitor n'est pas actif
			}
		},
		onNeedRefresh() {
			window.location.reload();
		},
	} );
} );
