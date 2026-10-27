import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import { useTicketingStore } from '@/stores/ticketing';
import type {
	TicketingItemDTO,
	TicketingCampaignDTO,
	AddOnSiteParticipantRequest,
} from '@/types/api/ticketing';

vi.mock( '@/utils/safeFetch', () => ( {
	safeFetch: vi.fn(),
} ) );

import { safeFetch } from '@/utils/safeFetch';

describe( 'useTicketingStore - Gestion de la billetterie & pointage HelloAsso', () => {
	let app: ReturnType< typeof createApp >;

	beforeEach( () => {
		localStorage.clear();
		const pinia = createPinia();
		app = createApp( {} );
		app.use( pinia );
		app.use( VueQueryPlugin, { queryClient } );
		setActivePinia( pinia );
		queryClient.clear();
		vi.clearAllMocks();
	} );

	it( 'fetchCampaigns appelle correctement la route REST avec filtres et tri optionnels', async () => {
		await app.runWithContext( async () => {
			const store = useTicketingStore();

			const mockCampaigns: TicketingCampaignDTO[] = [
				{
					id: 1,
					form_slug: 'open-printemps',
					form_type: 'Event',
					title: 'Open Printemps',
					campaign_category: 'tournament',
					total_items: 20,
					checked_in_count: 15,
					total_amount_cents: 40000,
					tiers: { 'Open A': 20 },
				},
			];

			vi.mocked( safeFetch ).mockResolvedValueOnce( {
				ok: true,
				status: 200,
				json: async () => mockCampaigns,
			} as unknown as Response );

			const res = await store.fetchCampaigns( {
				form_type: 'Event',
				orderby: 'start_date',
				order: 'desc',
			} );

			expect( safeFetch ).toHaveBeenCalledWith(
				'/dame/v1/ticketing/campaigns?form_type=Event&orderby=start_date&order=desc',
				expect.objectContaining( {
					headers: { Accept: 'application/json' },
				} )
			);
			expect( res ).toEqual( mockCampaigns );
		} );
	} );

	it( 'fetchCampaignItems appelle correctement la route REST avec filtres', async () => {
		await app.runWithContext( async () => {
			const store = useTicketingStore();

			const mockItems: TicketingItemDTO[] = [
				{
					id: 101,
					campaign_id: 1,
					source: 'helloasso',
					status: 'Processed',
					participant_first_name: 'Maxime',
					participant_last_name: 'Vachier',
					participant_email: 'mv@example.com',
					payer_first_name: 'Maxime',
					payer_last_name: 'Vachier',
					payer_email: 'mv@example.com',
					tier_name: 'Open A',
					amount_cents: 2000,
					payment_method: 'HelloAsso',
					license_number: 'A00001',
					fide_id: '623539',
					elo: 2760,
					club_name: 'Clichy Échecs',
					phone: '',
					matched_adherent_id: 0,
					matched_pre_inscription_id: 0,
					matched_contact_id: 0,
					checked_in: true,
				},
			];

			vi.mocked( safeFetch ).mockResolvedValueOnce( {
				ok: true,
				status: 200,
				json: async () => mockItems,
			} as unknown as Response );

			const result = await store.fetchCampaignItems( 1, {
				checked_in: true,
				tier: 'Open A',
			} );

			expect( safeFetch ).toHaveBeenCalledWith(
				'/dame/v1/ticketing/campaigns/1/items?checked_in=1&tier=Open+A',
				expect.objectContaining( {
					headers: {
						Accept: 'application/json',
					},
				} )
			);
			expect( result ).toEqual( mockItems );
		} );
	} );

	it( 'checkinMutation effectue le pointage d’un billet', async () => {
		await app.runWithContext( async () => {
			const store = useTicketingStore();

			vi.mocked( safeFetch ).mockResolvedValueOnce( {
				ok: true,
				status: 200,
				json: async () => ( { success: true, item_id: 101 } ),
			} as unknown as Response );

			const res = await store.checkinMutation.mutateAsync( {
				itemId: 101,
				campaignId: 1,
				checkedIn: true,
			} );

			expect( safeFetch ).toHaveBeenCalledWith(
				'/dame/v1/ticketing/items/101/checkin',
				expect.objectContaining( {
					method: 'POST',
					body: JSON.stringify( { checked_in: true } ),
				} )
			);
			expect( res.success ).toBe( true );
		} );
	} );

	it( 'addOnSiteMutation ajoute un participant sur place', async () => {
		await app.runWithContext( async () => {
			const store = useTicketingStore();

			const newParticipant: AddOnSiteParticipantRequest = {
				participant_first_name: 'Sophie',
				participant_last_name: 'Bernard',
				license_number: 'M67890',
				club_name: 'Échecs Club',
				elo: 1580,
				tier_name: 'Open B',
				amount: 20,
				payment_method: 'Espèces',
			};

			vi.mocked( safeFetch ).mockResolvedValueOnce( {
				ok: true,
				status: 200,
				json: async () => ( { success: true, item_id: 105 } ),
			} as unknown as Response );

			const res = await store.addOnSiteMutation.mutateAsync( {
				campaignId: 1,
				data: newParticipant,
			} );

			expect( safeFetch ).toHaveBeenCalledWith(
				'/dame/v1/ticketing/campaigns/1/items',
				expect.objectContaining( {
					method: 'POST',
					body: JSON.stringify( newParticipant ),
				} )
			);
			expect( res.item_id ).toBe( 105 );
		} );
	} );
} );

