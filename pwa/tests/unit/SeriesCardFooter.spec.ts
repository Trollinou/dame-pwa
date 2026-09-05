import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import SeriesCardFooter from '@/components/shared/SeriesCardFooter.vue';

describe( 'SeriesCardFooter.vue', () => {
	test( 'affiche le badge avec badgePrefix personnalisé', () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 2,
				totalCards: 4,
				isSolved: false,
				badgePrefix: 'Étape',
			},
		} );

		expect( wrapper.find( '.card-badge' ).text() ).toBe( 'Étape 2 / 4' );
	} );

	test( 'affiche le pendingHint lorsque isSolved est false', () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 1,
				totalCards: 3,
				isSolved: false,
				pendingHint: 'Trouvez la solution',
			},
		} );

		expect( wrapper.find( '.pending-hint' ).text() ).toBe(
			'Trouvez la solution'
		);
		expect( wrapper.find( '.next-card-btn' ).exists() ).toBe( false );
	} );

	test( 'affiche le bouton actif et émet next au clic lorsque isSolved est true et disabled est false', async () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 1,
				totalCards: 3,
				isSolved: true,
				disabled: false,
			},
		} );

		const btn = wrapper.find( '.next-card-btn' );
		expect( btn.exists() ).toBe( true );

		await btn.trigger( 'click' );
		expect( wrapper.emitted( 'next' ) ).toBeTruthy();
		expect( wrapper.emitted( 'next' )?.length ).toBe( 1 );
	} );

	test( 'n’émet pas next au clic lorsque disabled est true', async () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 1,
				totalCards: 3,
				isSolved: true,
				disabled: true,
			},
		} );

		const btn = wrapper.find( '.next-card-btn' );
		expect( btn.exists() ).toBe( true );

		await btn.trigger( 'click' );
		expect( wrapper.emitted( 'next' ) ).toBeFalsy();
	} );
} );
