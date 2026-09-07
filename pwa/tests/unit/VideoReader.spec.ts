import { describe, expect, test, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VideoReader from '@/components/apprentissage/VideoReader.vue';
import { useYouTubePlayer, YOUTUBE_DEFAULT_THRESHOLD_PERCENT } from '@/composables/useYouTubePlayer';

describe( 'useYouTubePlayer', () => {
	test( 'le seuil par défaut est bien de 95%', () => {
		expect( YOUTUBE_DEFAULT_THRESHOLD_PERCENT ).toBe( 95 );
		const { threshold } = useYouTubePlayer();
		expect( threshold ).toBe( 95 );
	} );

	test( 'canValidate est false à l’initialisation', () => {
		const { canValidate, hasReachedThreshold, isEnded } = useYouTubePlayer();
		expect( canValidate.value ).toBe( false );
		expect( hasReachedThreshold.value ).toBe( false );
		expect( isEnded.value ).toBe( false );
	} );

	test( 'canValidate passe à true si une erreur API survient (fallback de sécurité)', () => {
		const { canValidate, apiError } = useYouTubePlayer();
		expect( canValidate.value ).toBe( false );

		apiError.value = 'Erreur réseau';
		expect( canValidate.value ).toBe( true );
	} );
} );

describe( 'VideoReader.vue', () => {
	beforeEach( () => {
		vi.clearAllMocks();
	} );

	test( 'affiche l’en-tête et l’indication du seuil à 95% dans le footer', () => {
		const wrapper = mount( VideoReader, {
			props: {
				title: 'Les principes d’ouverture',
				videoId: 'dQw4w9WgXcQ',
				duree: '12:45',
				isAlreadyCompleted: false,
			},
		} );

		expect( wrapper.text() ).toContain( 'Les principes d’ouverture' );
		expect( wrapper.text() ).toContain( '95%' );
		expect( wrapper.find( '.video-badge-duree' ).text() ).toBe( '12:45' );
	} );

	test( 'affiche l’état validé si isAlreadyCompleted est true', () => {
		const wrapper = mount( VideoReader, {
			props: {
				title: 'Vidéo déjà vue',
				videoId: 'dQw4w9WgXcQ',
				isAlreadyCompleted: true,
			},
		} );

		expect( wrapper.text() ).toContain( 'Vidéo déjà validée' );
	} );

	test( 'émet success lors de la validation', async () => {
		const wrapper = mount( VideoReader, {
			props: {
				title: 'Vidéo test',
				videoId: 'dQw4w9WgXcQ',
				isAlreadyCompleted: false,
			},
		} );

		// Appel direct de la méthode ou clic
		( wrapper.vm as any ).validerVisionnage();
		expect( wrapper.emitted( 'success' ) ).toBeTruthy();
	} );
} );
