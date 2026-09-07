import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import ContentHeader from '@/components/shared/ContentHeader.vue';

describe( 'ContentHeader.vue', () => {
	test( 'renders unified 2-panel header correctly for exercise', () => {
		const wrapper = mount( ContentHeader, {
			props: {
				title: "T8 - Vision'checs",
				typeLabel: "Vision'checs",
				chapitreNiveauLabel: 'Matérialité // Niveau 1',
				consigne: 'Observez les 4 diagrammes ci-dessous.',
				stepBadgeText: 'Diagramme 1 / 4',
			},
		} );

		expect( wrapper.find( '.meta-title' ).text() ).toBe(
			"T8 - Vision'checs"
		);
		expect( wrapper.find( '.meta-type' ).text() ).toBe( "Vision'checs" );
		expect( wrapper.find( '.meta-chapitre-niveau' ).text() ).toBe(
			'Matérialité // Niveau 1'
		);
		expect( wrapper.find( '.consigne-text' ).text() ).toBe(
			'Observez les 4 diagrammes ci-dessous.'
		);
		expect( wrapper.find( '.step-badge' ).text() ).toBe(
			'Diagramme 1 / 4'
		);
	} );

	test( 'hides Panel 2 when hideSubPanel is true (e.g. for Video or Lesson)', () => {
		const wrapper = mount( ContentHeader, {
			props: {
				title: 'Vidéo : Les mats élémentaires',
				typeLabel: 'Vidéo',
				chapitreNiveauLabel: 'Bases // Niveau 1',
				consigne: 'Consigne ignorée',
				stepBadgeText: 'Étape 1/1',
				hideSubPanel: true,
			},
		} );

		expect( wrapper.find( '.meta-title' ).text() ).toBe(
			'Vidéo : Les mats élémentaires'
		);
		expect( wrapper.find( '.meta-type' ).text() ).toBe( 'Vidéo' );
		expect( wrapper.find( '.meta-chapitre-niveau' ).text() ).toBe(
			'Bases // Niveau 1'
		);
		expect( wrapper.find( '.consigne-card' ).exists() ).toBe( false );
	} );

	test( 'hides Panel 2 when no consigne or stepBadgeText is provided', () => {
		const wrapper = mount( ContentHeader, {
			props: {
				title: 'Leçon d’introduction',
				typeLabel: 'Leçon',
				chapitreNiveauLabel: 'Initiation // Niveau 1',
			},
		} );

		expect( wrapper.find( '.meta-title' ).text() ).toBe(
			'Leçon d’introduction'
		);
		expect( wrapper.find( '.meta-type' ).text() ).toBe( 'Leçon' );
		expect( wrapper.find( '.consigne-card' ).exists() ).toBe( false );
	} );
} );
