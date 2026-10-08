import { describe, it, expect } from 'vitest';
import {
	getSeasonFromDate,
	getCurrentSeason,
	formatDateFr,
	formatEventSchedule,
	formatEventLocation,
} from '../../src/utils/seasonUtils';
import type { AgendaEvent } from 'dame-types';

describe( 'seasonUtils', () => {
	describe( 'getSeasonFromDate', () => {
		it( 'identifies September date as start of new season', () => {
			expect( getSeasonFromDate( '2025-09-01' ) ).toBe( '2025-2026' );
			expect( getSeasonFromDate( '2025-09-30' ) ).toBe( '2025-2026' );
		} );

		it( 'identifies December date as part of current season', () => {
			expect( getSeasonFromDate( '2025-12-25' ) ).toBe( '2025-2026' );
		} );

		it( 'identifies January date as part of previous year start season', () => {
			expect( getSeasonFromDate( '2026-01-01' ) ).toBe( '2025-2026' );
		} );

		it( 'identifies August date as end of season', () => {
			expect( getSeasonFromDate( '2026-08-31' ) ).toBe( '2025-2026' );
		} );

		it( 'identifies September of next year as next season', () => {
			expect( getSeasonFromDate( '2026-09-01' ) ).toBe( '2026-2027' );
		} );

		it( 'handles null or invalid input gracefully', () => {
			expect( getSeasonFromDate( null ) ).toBeNull();
			expect( getSeasonFromDate( '' ) ).toBeNull();
			expect( getSeasonFromDate( 'invalid' ) ).toBeNull();
		} );
	} );

	describe( 'getCurrentSeason', () => {
		it( 'returns correct season for given reference dates', () => {
			expect( getCurrentSeason( new Date( '2025-09-15' ) ) ).toBe(
				'2025-2026'
			);
			expect( getCurrentSeason( new Date( '2026-05-10' ) ) ).toBe(
				'2025-2026'
			);
			expect( getCurrentSeason( new Date( '2026-08-31' ) ) ).toBe(
				'2025-2026'
			);
			expect( getCurrentSeason( new Date( '2026-09-01' ) ) ).toBe(
				'2026-2027'
			);
		} );
	} );

	describe( 'formatDateFr', () => {
		it( 'formats YYYY-MM-DD to DD/MM/YYYY', () => {
			expect( formatDateFr( '2026-10-15' ) ).toBe( '15/10/2026' );
			expect( formatDateFr( '2026-01-05T12:00:00' ) ).toBe(
				'05/01/2026'
			);
			expect( formatDateFr( null ) ).toBe( '-' );
		} );
	} );

	describe( 'formatEventSchedule', () => {
		it( 'formats multi-day events', () => {
			const event = {
				meta: {
					_dame_start_date: '2026-10-15',
					_dame_end_date: '2026-10-17',
				},
			} as AgendaEvent;
			expect( formatEventSchedule( event ) ).toBe(
				'Du 15/10/2026 au 17/10/2026'
			);
		} );

		it( 'formats single-day all day event', () => {
			const event = {
				meta: {
					_dame_start_date: '2026-10-15',
					_dame_end_date: '2026-10-15',
					_dame_all_day: 1,
				},
			} as AgendaEvent;
			expect( formatEventSchedule( event ) ).toBe( 'Toute la journée' );
		} );

		it( 'formats single-day with start and end times', () => {
			const event = {
				meta: {
					_dame_start_date: '2026-10-15',
					_dame_end_date: '2026-10-15',
					_dame_start_time: '14:00',
					_dame_end_time: '18:00',
				},
			} as AgendaEvent;
			expect( formatEventSchedule( event ) ).toBe( '14:00 - 18:00' );
		} );

		it( 'formats single-day with only start time', () => {
			const event = {
				meta: {
					_dame_start_date: '2026-10-15',
					_dame_start_time: '20:30',
				},
			} as AgendaEvent;
			expect( formatEventSchedule( event ) ).toBe( 'À partir de 20:30' );
		} );
	} );

	describe( 'formatEventLocation', () => {
		it( 'formats location with name and city', () => {
			const event = {
				meta: {
					_dame_location_name: 'Club House',
					_dame_city: 'Nantes',
				},
			} as AgendaEvent;
			expect( formatEventLocation( event ) ).toBe( 'Club House, Nantes' );
		} );

		it( 'formats location with only name or city', () => {
			const event = {
				meta: {
					_dame_city: 'Nantes',
				},
			} as AgendaEvent;
			expect( formatEventLocation( event ) ).toBe( 'Nantes' );
		} );

		it( 'returns fallback dash if no location info', () => {
			const event = { meta: {} } as AgendaEvent;
			expect( formatEventLocation( event ) ).toBe( '-' );
		} );
	} );
} );
