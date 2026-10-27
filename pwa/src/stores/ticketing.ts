import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { safeFetch } from '@/utils/safeFetch';
import { useAuthStore } from './auth';
import type {
	TicketingCampaignDTO,
	TicketingItemDTO,
	AddOnSiteParticipantRequest,
} from '@/types/api/ticketing';

export const useTicketingStore = defineStore( 'ticketing', () => {
	const authStore = useAuthStore();
	const queryClient = useQueryClient();

	// 1. Liste des campagnes de billetterie HelloAsso
	const {
		data: rawCampaigns,
		isLoading: isCampaignsLoading,
		refetch: refetchCampaigns,
	} = useQuery< TicketingCampaignDTO[] >( {
		queryKey: [ 'ticketing', 'campaigns' ],
		queryFn: async () => {
			const res = await safeFetch( '/dame/v1/ticketing/campaigns', {
				headers: {
					Accept: 'application/json',
				},
			} );
			if ( ! res.ok ) {
				throw new Error( `Erreur récupération campagnes (${ res.status })` );
			}
			return res.json();
		},
		enabled: computed( () => authStore.isAdmin ),
		staleTime: 1000 * 60 * 2, // 2 minutes
	} );

	const campaigns = computed( () => rawCampaigns.value || [] );

	/**
	 * Récupère une campagne par son ID.
	 *
	 * @param campaignId Identifiant de la campagne.
	 * @return Propriété calculée de la campagne correspondante.
	 */
	const getCampaignById = ( campaignId: number ) => {
		return computed( () =>
			campaigns.value.find( ( c ) => c.id === campaignId )
		);
	};

	/**
	 * Récupère les inscrits d'une campagne.
	 *
	 * @param campaignId         Identifiant de la campagne.
	 * @param filters            Filtres optionnels sur le pointage ou le tarif.
	 * @param filters.checked_in Filtre sur le statut de pointage.
	 * @param filters.tier       Filtre sur le nom de la formule ou tarif.
	 * @return Liste des participants inscrits.
	 */
	const fetchCampaignItems = async (
		campaignId: number,
		filters?: { checked_in?: boolean; tier?: string }
	): Promise< TicketingItemDTO[] > => {
		const params = new URLSearchParams();
		if ( filters?.checked_in !== undefined ) {
			params.set( 'checked_in', filters.checked_in ? '1' : '0' );
		}
		if ( filters?.tier ) {
			params.set( 'tier', filters.tier );
		}
		const qs = params.toString() ? `?${ params.toString() }` : '';
		const res = await safeFetch(
			`/dame/v1/ticketing/campaigns/${ campaignId }/items${ qs }`,
			{
				headers: {
					Accept: 'application/json',
				},
			}
		);
		if ( ! res.ok ) {
			throw new Error( `Erreur récupération inscrits (${ res.status })` );
		}
		return res.json();
	};

	/**
	 * Mutation pour basculer le pointage (checkin) d'un participant avec mise à jour optimiste
	 */
	const checkinMutation = useMutation<
		{ success: boolean; item_id: number },
		Error,
		{ itemId: number; campaignId: number; checkedIn?: boolean }
	>( {
		mutationFn: async ( { itemId, checkedIn } ) => {
			const body =
				checkedIn !== undefined
					? JSON.stringify( { checked_in: checkedIn } )
					: undefined;

			const res = await safeFetch(
				`/dame/v1/ticketing/items/${ itemId }/checkin`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body,
				}
			);
			if ( ! res.ok ) {
				throw new Error( `Erreur pointage billet #${ itemId } (${ res.status })` );
			}
			return res.json();
		},
		onMutate: async ( { itemId, campaignId, checkedIn } ) => {
			const queryKey = [ 'ticketing', 'campaign', campaignId, 'items' ];
			await queryClient.cancelQueries( { queryKey } );

			const previousItems = queryClient.getQueryData< TicketingItemDTO[] >( queryKey );

			if ( previousItems ) {
				const nowIso = new Date().toISOString();
				queryClient.setQueryData< TicketingItemDTO[] >(
					queryKey,
					previousItems.map( ( item ) => {
						if ( item.id === itemId ) {
							const newStatus =
								checkedIn !== undefined ? checkedIn : ! item.checked_in;
							return {
								...item,
								checked_in: newStatus,
								checked_in_at: newStatus ? nowIso : null,
							};
						}
						return item;
					} )
				);
			}

			return { previousItems, queryKey };
		},
		onError: ( _err, _variables, context: unknown ) => {
			const ctx = context as
				| { previousItems?: TicketingItemDTO[]; queryKey: unknown[] }
				| undefined;
			if ( ctx?.previousItems && ctx.queryKey ) {
				queryClient.setQueryData( ctx.queryKey, ctx.previousItems );
			}
		},
		onSettled: ( _data, _error, { campaignId } ) => {
			queryClient.invalidateQueries( {
				queryKey: [ 'ticketing', 'campaign', campaignId, 'items' ],
			} );
			queryClient.invalidateQueries( {
				queryKey: [ 'ticketing', 'campaigns' ],
			} );
		},
	} );

	/**
	 * Mutation pour ajouter un participant sur place
	 */
	const addOnSiteMutation = useMutation<
		{ success: boolean; item_id: number },
		Error,
		{ campaignId: number; data: AddOnSiteParticipantRequest }
	>( {
		mutationFn: async ( { campaignId, data } ) => {
			const res = await safeFetch(
				`/dame/v1/ticketing/campaigns/${ campaignId }/items`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify( data ),
				}
			);
			if ( ! res.ok ) {
				throw new Error(
					`Erreur ajout inscription sur place (${ res.status })`
				);
			}
			return res.json();
		},
		onSuccess: ( _data, { campaignId } ) => {
			queryClient.invalidateQueries( {
				queryKey: [ 'ticketing', 'campaign', campaignId, 'items' ],
			} );
			queryClient.invalidateQueries( {
				queryKey: [ 'ticketing', 'campaigns' ],
			} );
		},
	} );

	return {
		campaigns,
		isCampaignsLoading,
		refetchCampaigns,
		getCampaignById,
		fetchCampaignItems,
		checkinMutation,
		addOnSiteMutation,
	};
} );
