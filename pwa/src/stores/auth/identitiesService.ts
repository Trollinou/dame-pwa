import { computed, type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { safeFetch } from '@/utils/safeFetch';
import type { Router } from 'vue-router';
import type { Identity } from './types';
import { useAgendaStore } from '../agenda';

export const useIdentitiesService = (
	token: Ref< string >,
	selectedIdentity: Ref< Identity | null >,
	router: Router
) => {
	const {
		data: queryIdentities,
		refetch: refetchIdentities,
		isLoading: isIdentitiesLoading,
	} = useQuery< Identity[] >( {
		queryKey: [ 'identities', token ],
		enabled: computed( () => !! token.value ),
		queryFn: async () => {
			if ( ! token.value ) {
				return [];
			}
			const response = await safeFetch(
				`${ import.meta.env.VITE_API_BASE_URL }/dame/v1/my-identities`,
				{
					headers: { Authorization: `Bearer ${ token.value }` },
				}
			);
			if ( ! response.ok ) {
				throw new Error( 'Impossible de charger les identités.' );
			}
			return response.json();
		},
	} );

	const myIdentities = computed( () => queryIdentities.value || [] );

	const selectIdentity = ( identity: Identity ) => {
		selectedIdentity.value = identity;
		localStorage.setItem(
			'dame_selected_identity',
			JSON.stringify( identity )
		);
		// Purge du cache agenda pour recharger avec les droits de la nouvelle identité
		useAgendaStore().clearData();
	};

	const fetchMyIdentities = async (): Promise< Identity[] > => {
		const res = await refetchIdentities();
		return res.data || [];
	};

	const checkIdentities = async () => {
		try {
			const identities = await fetchMyIdentities();

			if ( identities.length === 1 ) {
				selectIdentity( identities[ 0 ] );
				router.push( '/tabs/profil' );
			} else {
				router.push( '/select-person' );
			}
		} catch {
			router.push( '/select-person' );
		}
	};

	return {
		myIdentities,
		isIdentitiesLoading,
		selectIdentity,
		fetchMyIdentities,
		checkIdentities,
	};
};
