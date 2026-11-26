import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import ContentHeader from '@/components/learning/ContentHeader.vue';

describe( 'ContentHeader.vue', () => {
	test( 'renders merged single-card header without duplicate title for exercise', () => {
		const wrapper = mount( ContentHeader, {
			props: {
				title: "T8 - Vision'checs",
				typeLabel: "Vision'checs",
				chapitreNiveauLabel: 'Matérialité · N1',
				consigne: 'Observez les 4 diagrammes ci-dessous.',
				stepBadgeText: 'Diagramme 1 / 4',
			},
		} );

		expect( wrapper.findAll( '.header-card' ) ).toHaveLength( 1 );
		expect( wrapper.find( '.meta-title' ).exists() ).toBe( false );
		expect( wrapper.find( '.meta-type' ).text() ).toBe( "Vision'checs" );
		expect( wrapper.find( '.meta-chapitre-niveau' ).text() ).toBe(
			'Matérialité · N1'
		);
		expect( wrapper.find( '.consigne-text' ).text() ).toBe(
			'Observez les 4 diagrammes ci-dessous.'
		);
		expect( wrapper.find( '.step-badge' ).text() ).toBe(
			'Diagramme 1 / 4'
		);
	} );

	test( 'shows title and hides consigne row when showTitle and hideSubPanel are true (Video/Lesson)', () => {
		const wrapper = mount( ContentHeader, {
			props: {
				title: 'Vidéo : Les mats élémentaires',
				typeLabel: 'Vidéo',
				chapitreNiveauLabel: 'Bases · N1',
				consigne: 'Consigne ignorée',
				stepBadgeText: 'Étape 1/1',
				hideSubPanel: true,
				showTitle: true,
			},
		} );

		expect( wrapper.find( '.meta-title' ).text() ).toBe(
			'Vidéo : Les mats élémentaires'
		);
		expect( wrapper.find( '.meta-type' ).text() ).toBe( 'Vidéo' );
		expect( wrapper.find( '.meta-chapitre-niveau' ).text() ).toBe(
			'Bases · N1'
		);
		expect( wrapper.find( '.consigne-row' ).exists() ).toBe( false );
	} );

	test( 'hides consigne row when no consigne or stepBadgeText is provided', () => {
		const wrapper = mount( ContentHeader, {
			props: {
				title: 'Leçon d’introduction',
				typeLabel: 'Leçon',
				chapitreNiveauLabel: 'Initiation · N1',
				showTitle: true,
			},
		} );

		expect( wrapper.find( '.meta-title' ).text() ).toBe(
			'Leçon d’introduction'
		);
		expect( wrapper.find( '.meta-type' ).text() ).toBe( 'Leçon' );
		expect( wrapper.find( '.consigne-row' ).exists() ).toBe( false );
	} );
} );
