import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Composable réactif détectant si l'appareil est un écran large (ordinateur)
 * ou une tablette en mode paysage (Split-View activé).
 */
export function useIsTabletLandscape() {
	const isTabletLandscape = ref( false );
	let mediaQueryList: MediaQueryList | null = null;

	const updateMatch = ( e?: MediaQueryListEvent | MediaQueryList ) => {
		if ( mediaQueryList ) {
			isTabletLandscape.value = mediaQueryList.matches;
		} else if ( e ) {
			isTabletLandscape.value = e.matches;
		}
	};

	onMounted( () => {
		if ( typeof window !== 'undefined' && window.matchMedia ) {
			// Détecte soit un écran large (>= 992px), soit une tablette (>= 768px) orientée en paysage
			mediaQueryList = window.matchMedia(
				'(min-width: 992px), ((min-width: 768px) and (orientation: landscape))'
			);
			isTabletLandscape.value = mediaQueryList.matches;

			if ( mediaQueryList.addEventListener ) {
				mediaQueryList.addEventListener( 'change', updateMatch );
			} else {
				// Fallback anciens navigateurs
				mediaQueryList.addListener( updateMatch );
			}
		}
	} );

	onUnmounted( () => {
		if ( mediaQueryList ) {
			if ( mediaQueryList.removeEventListener ) {
				mediaQueryList.removeEventListener( 'change', updateMatch );
			} else {
				// Fallback anciens navigateurs
				mediaQueryList.removeListener( updateMatch );
			}
		}
	} );

	return {
		isTabletLandscape,
	};
}
