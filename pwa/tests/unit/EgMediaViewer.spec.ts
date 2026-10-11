import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EgMediaViewer from '@/components/shared/MediaViewer/EgMediaViewer.vue';
import type { EgMediaContext } from '@/types/egMedia';

describe( 'EgMediaViewer', () => {
	const mockContext: EgMediaContext = {
		currentIndex: 0,
		layout: 'justified',
		images: [
			{
				id: 1,
				index: 0,
				thumbSrc: 'thumb1.jpg',
				fullSrc: 'full1.jpg',
				alt: 'Photo 1',
				width: 800,
				height: 600,
			},
			{
				id: 2,
				index: 1,
				thumbSrc: 'thumb2.jpg',
				fullSrc: 'full2.jpg',
				alt: 'Photo 2',
				width: 1200,
				height: 800,
			},
		],
	};

	it( 'monte correctement en mode grille justifiée', () => {
		const wrapper = mount( EgMediaViewer, {
			props: {
				context: mockContext,
			},
		} );

		expect( wrapper.find( '.eg-viewer__justified-grid' ).exists() ).toBe(
			true
		);
		const items = wrapper.findAll( '.eg-viewer__justified-item' );
		expect( items ).toHaveLength( 2 );
	} );

	it( 'monte correctement en mode standard (viewer)', () => {
		const viewerContext: EgMediaContext = {
			...mockContext,
			layout: 'viewer',
		};

		const wrapper = mount( EgMediaViewer, {
			props: {
				context: viewerContext,
			},
		} );

		expect( wrapper.find( '.eg-viewer__main' ).exists() ).toBe( true );
		expect( wrapper.find( '.eg-viewer__thumbnails' ).exists() ).toBe(
			true
		);
	} );

	it( 'ouvre et ferme le mode plein écran au clic', async () => {
		const wrapper = mount( EgMediaViewer, {
			props: {
				context: mockContext,
			},
		} );

		// Au clic sur une image, le plein écran s'active
		const firstItem = wrapper.find( '.eg-viewer__justified-item' );
		await firstItem.trigger( 'click' );

		expect( document.querySelector( '.eg-lightbox' ) ).not.toBeNull();

		// Fermeture au clic sur le bouton close
		const closeBtn = document.querySelector(
			'.eg-lightbox__close'
		) as HTMLButtonElement;
		closeBtn?.click();
		await wrapper.vm.$nextTick();

		expect( document.querySelector( '.eg-lightbox' ) ).toBeNull();
	} );
} );
