import { describe, it, expect } from 'vitest';
import {
	getSeasonFromDate,
	getCurrentSeason,
	formatDateFr,
	formatEventSchedule,
	formatEventLocation,
	extractTimeFormatted,
	formatCampaignSchedule,
	getCampaignSeason,
} from '../../src/utils/seasonUtils';
import type { AgendaEvent } from 'dame-types';
import type { TicketingCampaignDTO } from '../../src/types/api/ticketing';

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
			expect( formatDateFr( '2026-10-25 23:00:00' ) ).toBe(
				'25/10/2026'
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

	describe( 'extractTimeFormatted', () => {
		it( 'extracts formatted time HHhMM from date string', () => {
			expect( extractTimeFormatted( '2026-10-25 14:30:00' ) ).toBe( '14h30' );
			expect( extractTimeFormatted( '2026-10-25T09:05:00' ) ).toBe( '09h05' );
		} );

		it( 'ignores 00:00:00 and 23:59:59 as all-day markers', () => {
			expect( extractTimeFormatted( '2026-10-25 00:00:00' ) ).toBeNull();
			expect( extractTimeFormatted( '2026-10-25 23:59:59' ) ).toBeNull();
		} );

		it( 'returns null for null, empty or date-only inputs', () => {
			expect( extractTimeFormatted( null ) ).toBeNull();
			expect( extractTimeFormatted( '' ) ).toBeNull();
			expect( extractTimeFormatted( '2026-10-25' ) ).toBeNull();
		} );
	} );

	describe( 'formatCampaignSchedule', () => {
		it( 'formats single-day events with start and end times', () => {
			expect(
				formatCampaignSchedule( '2026-10-25 14:00:00', '2026-10-25 17:00:00' )
			).toBe( '25/10/2026 (14h00 à 17h00)' );
		} );

		it( 'formats single-day events with only start time', () => {
			expect(
				formatCampaignSchedule( '2026-10-25 14:00:00', '2026-10-25 23:59:59' )
			).toBe( '25/10/2026 (à 14h00)' );
		} );

		it( 'formats single-day events without hours', () => {
			expect(
				formatCampaignSchedule( '2026-10-25 00:00:00', '2026-10-25 23:59:59' )
			).toBe( '25/10/2026' );
		} );

		it( 'formats multi-day events', () => {
			expect(
				formatCampaignSchedule( '2026-10-25 09:00:00', '2026-10-27 18:00:00' )
			).toBe( 'Du 25/10/2026 au 27/10/2026' );
		} );

		it( 'formats events with only end date', () => {
			expect( formatCampaignSchedule( null, '2026-10-27 18:00:00' ) ).toBe(
				"Jusqu'au 27/10/2026"
			);
		} );

		it( 'formats undated campaigns as Formulaire permanent', () => {
			expect( formatCampaignSchedule( null, null ) ).toBe( 'Formulaire permanent' );
			expect( formatCampaignSchedule( '', '' ) ).toBe( 'Formulaire permanent' );
		} );
	} );

	describe( 'getCampaignSeason', () => {
		it( 'prioritizes explicit linked_season_id', () => {
			const campaign = {
				linked_season_id: 2026,
				start_date: '2025-06-01 00:00:00',
				end_date: '2025-08-31 00:00:00',
			} as unknown as TicketingCampaignDTO;
			expect( getCampaignSeason( campaign ) ).toBe( '2026-2027' );
		} );

		it( 'uses end_date to identify season for campaigns spanning past season boundary', () => {
			// Early opened membership (opened in June 2026 but extends through August 2027)
			const campaign = {
				start_date: '2026-06-30 00:00:00',
				end_date: '2027-08-31 00:00:00',
			} as unknown as TicketingCampaignDTO;
			expect( getCampaignSeason( campaign ) ).toBe( '2026-2027' );
		} );

		it( 'falls back to start_date when end_date is missing', () => {
			const campaign = {
				start_date: '2026-10-15 14:00:00',
			} as unknown as TicketingCampaignDTO;
			expect( getCampaignSeason( campaign ) ).toBe( '2026-2027' );
		} );

		it( 'returns empty string for undated permanent forms', () => {
			const campaign = {} as unknown as TicketingCampaignDTO;
			expect( getCampaignSeason( campaign ) ).toBe( '' );
		} );
	} );
} );
