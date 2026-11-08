import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PlayInfoBar from '@/components/learning/play/PlayInfoBar.vue';

describe( 'PlayInfoBar.vue', () => {
	it( 'renders player name, level and coach badge when coachMode is true', () => {
		const wrapper = mount( PlayInfoBar, {
			props: {
				playerName: 'Alexandre',
				level: 1600,
				gameMode: '1player',
				coachMode: true,
			},
			global: {
				stubs: {
					'ion-icon': true,
				},
			},
		} );

		expect( wrapper.text() ).toContain( 'Alexandre' );
		expect( wrapper.text() ).toContain( '1600 ELO' );
		expect( wrapper.text() ).toContain( 'Intermédiaire' );
		expect( wrapper.text() ).toContain( '🎓 Coach' );

		const coachBtn = wrapper.find( 'button.coach-badge' );
		expect( coachBtn.exists() ).toBe( true );
	} );

	it( 'emits open-coach-legend when clicking the coach badge', async () => {
		const wrapper = mount( PlayInfoBar, {
			props: {
				playerName: 'Alexandre',
				level: 1500,
				gameMode: '1player',
				coachMode: true,
			},
			global: {
				stubs: {
					'ion-icon': true,
				},
			},
		} );

		const coachBtn = wrapper.find( 'button.coach-badge' );
		expect( coachBtn.exists() ).toBe( true );

		await coachBtn.trigger( 'click' );
		expect( wrapper.emitted( 'open-coach-legend' ) ).toBeTruthy();
		expect( wrapper.emitted( 'open-coach-legend' )?.length ).toBe( 1 );
	} );

	it( 'does not render coach badge in 2players mode', () => {
		const wrapper = mount( PlayInfoBar, {
			props: {
				playerName: 'Alexandre',
				level: 1500,
				gameMode: '2players',
				coachMode: true,
			},
			global: {
				stubs: {
					'ion-icon': true,
				},
			},
		} );

		expect( wrapper.text() ).toContain( '2 Joueurs' );
		expect( wrapper.text() ).not.toContain( '🎓 Coach' );
	} );
} );
