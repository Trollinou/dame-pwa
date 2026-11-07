import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PlayActionsPanel from '@/components/learning/play/PlayActionsPanel.vue';

describe( 'PlayActionsPanel.vue', () => {
	it( 'renders only [Nouveau] and [Analyse] when isGameOver is true', () => {
		const wrapper = mount( PlayActionsPanel, {
			props: {
				isLandscape: false,
				gameStatusMessage: '🏁 Échec et mat',
				gameStatusColor: 'danger',
				turnColor: 'white',
				isHintEnabled: false,
				helpCount: 0,
				oupsCount: 0,
				viewOnly: true,
				isGameOver: true,
				currentPly: 20,
			},
		} );

		const text = wrapper.text();
		expect( text ).toContain( 'Nouveau' );
		expect( text ).toContain( 'Analyse' );
		expect( text ).not.toContain( 'Oups' );
		expect( text ).not.toContain( 'Aide' );
		expect( text ).not.toContain( 'Nulle' );
		expect( text ).not.toContain( 'Abandon' );
	} );

	it( 'renders only [Nouvelle partie / Réglages] when currentPly is 0 and not isGameOver', () => {
		const wrapper = mount( PlayActionsPanel, {
			props: {
				isLandscape: false,
				gameStatusMessage: '',
				gameStatusColor: 'medium',
				turnColor: 'white',
				isHintEnabled: false,
				helpCount: 0,
				oupsCount: 0,
				viewOnly: false,
				isGameOver: false,
				currentPly: 0,
			},
		} );

		const text = wrapper.text();
		expect( text ).toContain( 'Nouvelle partie / Réglages' );
		expect( text ).not.toContain( 'Oups' );
		expect( text ).not.toContain( 'Aide' );
		expect( text ).not.toContain( 'Nulle' );
		expect( text ).not.toContain( 'Abandon' );
		expect( text ).not.toContain( 'Analyse' );
	} );

	it( 'renders [Oups], [Nulle], [Abandon] in Normal Mode when currentPly > 0 and not isGameOver', () => {
		const wrapper = mount( PlayActionsPanel, {
			props: {
				isLandscape: false,
				gameStatusMessage: '',
				gameStatusColor: 'medium',
				turnColor: 'white',
				isHintEnabled: false,
				helpCount: 0,
				oupsCount: 1,
				viewOnly: false,
				isGameOver: false,
				isCoachMode: false,
				currentPly: 10,
			},
		} );

		const text = wrapper.text();
		expect( text ).toContain( 'Oups' );
		expect( text ).toContain( 'Nulle' );
		expect( text ).toContain( 'Abandon' );
		expect( text ).not.toContain( 'Aide' );
		expect( text ).not.toContain( 'Nouveau' );
		expect( text ).not.toContain( 'Analyse' );
	} );

	it( 'renders [Oups], [Aide], [Nulle], [Abandon] in Coach Mode when currentPly > 0 and not isGameOver', () => {
		const wrapper = mount( PlayActionsPanel, {
			props: {
				isLandscape: false,
				gameStatusMessage: '',
				gameStatusColor: 'medium',
				turnColor: 'white',
				isHintEnabled: true,
				helpCount: 2,
				oupsCount: 1,
				viewOnly: false,
				isGameOver: false,
				isCoachMode: true,
				currentPly: 12,
			},
		} );

		const text = wrapper.text();
		expect( text ).toContain( 'Oups' );
		expect( text ).toContain( 'Aide' );
		expect( text ).toContain( 'Nulle' );
		expect( text ).toContain( 'Abandon' );
		expect( text ).not.toContain( 'Nouveau' );
		expect( text ).not.toContain( 'Analyse' );
	} );
} );
