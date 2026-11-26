import { ref, onMounted, onUnmounted } from 'vue';

const LEARNING_LANDSCAPE_QUERY =
	'(min-width: 992px) and (min-height: 560px), (min-width: 768px) and (min-height: 560px) and (orientation: landscape)';

export function isLearningLandscapeViewport(): boolean {
	if ( typeof window === 'undefined' ) {
		return false;
	}
	if ( typeof window.matchMedia === 'function' ) {
		return window.matchMedia( LEARNING_LANDSCAPE_QUERY ).matches;
	}
	const w = window.innerWidth;
	const h = window.innerHeight;
	return ( w >= 992 && h >= 560 ) || ( w >= 768 && h >= 560 && w > h );
}

export function isLearningTabletOrDesktopViewport(): boolean {
	if ( typeof window === 'undefined' ) {
		return false;
	}
	return window.innerWidth >= 768 && window.innerHeight >= 560;
}

export function useBoardOrientation() {
	const isLandscape = ref( isLearningLandscapeViewport() );
	const renderKey = ref( 0 );
	let resizeTimeout: ReturnType< typeof setTimeout > | null = null;

	const updateOrientation = () => {
		if ( resizeTimeout ) {
			clearTimeout( resizeTimeout );
		}
		resizeTimeout = setTimeout( () => {
			isLandscape.value = isLearningLandscapeViewport();
			renderKey.value++;
		}, 200 );
	};

	onMounted( () => {
		window.addEventListener( 'resize', updateOrientation );
	} );

	onUnmounted( () => {
		window.removeEventListener( 'resize', updateOrientation );
	} );

	return {
		isLandscape,
		renderKey,
		updateOrientation,
	};
}
