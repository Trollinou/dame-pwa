import { ref } from 'vue';
import { safeFetch } from '@/utils/safeFetch';

export const useAppConfig = () => {
	const isRoiActive = ref(
		localStorage.getItem( 'dame_roi_active' ) !== 'false'
	);

	const currentSeason = ref(
		localStorage.getItem( 'dame_current_season' ) || ''
	);
	const apprentissageAllowedRoles = ref< string[] >(
		JSON.parse(
			localStorage.getItem( 'dame_apprentissage_allowed_roles' ) ||
				'["administrator", "staff", "entraineur", "editor"]'
		)
	);

	const fetchPwaConfig = async () => {
		try {
			const response = await safeFetch(
				`${ import.meta.env.VITE_API_BASE_URL }/dame/v1/pwa-config`
			);
			if ( response.ok ) {
				const data = await response.json();
				isRoiActive.value = !! data.roi_active;

				currentSeason.value = data.current_season || '';
				localStorage.setItem(
					'dame_roi_active',
					String( isRoiActive.value )
				);

				localStorage.setItem(
					'dame_current_season',
					currentSeason.value
				);

				if ( isRoiActive.value ) {
					try {
						const roiResponse = await safeFetch(
							`${
								import.meta.env.VITE_API_BASE_URL
							}/roi/v1/config`
						);
						if ( roiResponse.ok ) {
							const roiData = await roiResponse.json();
							if (
								Array.isArray(
									roiData.apprentissage_allowed_roles
								)
							) {
								apprentissageAllowedRoles.value =
									roiData.apprentissage_allowed_roles;
								localStorage.setItem(
									'dame_apprentissage_allowed_roles',
									JSON.stringify(
										roiData.apprentissage_allowed_roles
									)
								);
							}
						}
					} catch ( roiError ) {
						console.warn(
							'Impossible de charger la configuration de ROI, utilisation de la configuration par défaut :',
							roiError
						);
					}
				}
			}
		} catch ( error ) {
			console.warn(
				'Erreur chargement pwa-config, utilisation du cache :',
				error
			);
		}
	};

	return {
		isRoiActive,
		currentSeason,
		apprentissageAllowedRoles,
		fetchPwaConfig,
	};
};
