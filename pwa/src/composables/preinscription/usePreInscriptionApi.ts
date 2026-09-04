import { ref } from 'vue';
import {
	useAuthStore,
	type Identity,
	type AssociatedMember,
} from '@/stores/auth';
import type { PreInscriptionFormData } from './usePreInscriptionForm';

export interface RegistrationTarget {
	member_id: number;
	name: string;
	relation: string;
	has_pre_inscription?: boolean;
	pre_inscription_id?: number | null;
}

export interface PreInscriptionSuccessData {
	message: string;
	is_minor?: boolean;
	payment_url?: string;
	post_id?: number;
	download_token?: string;
	updated?: boolean;
	[ key: string ]: unknown;
}

export function usePreInscriptionApi() {
	const authStore = useAuthStore();

	const registrationTargets = ref< RegistrationTarget[] >( [] );
	const selectedTargetId = ref< number >( 0 );
	const completedMemberIds = ref< number[] >( [] );
	const hasLoadedIdentities = ref( false );

	const isExistingPreInscription = ref( false );
	const currentPreInscriptionId = ref< number | null >( null );

	const isSubmitting = ref( false );
	const errorMessage = ref( '' );
	const successData = ref< PreInscriptionSuccessData | null >( null );

	/**
	 * Charge les identités associées au compte utilisateur
	 * @param prefillCallback
	 */
	const loadIdentities = async (
		prefillCallback: ( _memberId: number ) => void
	) => {
		if ( ! authStore.isAuthenticated ) {
			return;
		}

		try {
			const identities = await authStore.fetchMyIdentities();
			const targets: RegistrationTarget[] = [];

			identities.forEach( ( identity: Identity ) => {
				if (
					identity.type === 'member' &&
					identity.member_id > 0 &&
					! identity.already_registered
				) {
					targets.push( {
						member_id: identity.member_id,
						name: identity.name,
						relation: 'Moi-même',
						has_pre_inscription: Boolean(
							identity.has_pre_inscription
						),
						pre_inscription_id: identity.pre_inscription_id || null,
					} );
				}
				if (
					identity.type === 'representative' &&
					identity.associated_members
				) {
					identity.associated_members.forEach(
						( child: AssociatedMember ) => {
							if (
								! child.already_registered &&
								! targets.some(
									( t ) =>
										( t.member_id > 0 &&
											t.member_id === child.member_id ) ||
										( Boolean( child.pre_inscription_id ) &&
											t.pre_inscription_id ===
												child.pre_inscription_id )
								)
							) {
								targets.push( {
									member_id: child.member_id,
									name: child.firstname || child.name || '',
									relation:
										child.member_id === 0
											? 'Enfant (Nouvelle inscription)'
											: 'Enfant/Associé',
									has_pre_inscription: Boolean(
										child.has_pre_inscription
									),
									pre_inscription_id:
										child.pre_inscription_id || null,
								} );
							}
						}
					);
				}
			} );

			registrationTargets.value = targets;
			hasLoadedIdentities.value = true;

			if ( targets.length === 1 ) {
				selectedTargetId.value = targets[ 0 ].member_id;
				prefillCallback( targets[ 0 ].member_id );
			} else if (
				targets.length > 1 &&
				authStore.selectedIdentity &&
				authStore.selectedIdentity.member_id > 0 &&
				! authStore.selectedIdentity.already_registered
			) {
				selectedTargetId.value = authStore.selectedIdentity.member_id;
				prefillCallback( authStore.selectedIdentity.member_id );
			}
		} catch ( err ) {
			console.error( 'Erreur lors du chargement des identités:', err );
		}
	};

	/**
	 * Pré-remplit les données d'un membre
	 * @param memberId
	 * @param form
	 * @param checkAge
	 */
	const prefillAdherent = async (
		memberId: number,
		form: PreInscriptionFormData,
		checkAge: () => void
	) => {
		errorMessage.value = '';
		isExistingPreInscription.value = false;
		currentPreInscriptionId.value = null;

		const makeRequest = async () => {
			return fetch(
				`${
					import.meta.env.VITE_API_BASE_URL
				}/dame/v1/adherent-details?adherent_id=${ memberId }`,
				{
					headers: { Authorization: `Bearer ${ authStore.token }` },
				}
			);
		};

		try {
			let response = await makeRequest();

			if ( response.status === 401 ) {
				console.warn(
					'Token expiré ou invalide (401), tentative de rafraîchissement...'
				);
				await authStore.validateSession();
				response = await makeRequest();
			}

			if ( response.ok ) {
				const data = await response.json();
				isExistingPreInscription.value = Boolean(
					data.is_pre_inscription
				);
				currentPreInscriptionId.value = data.pre_inscription_id || null;

				Object.keys( data ).forEach( ( key ) => {
					const formKey =
						`dame_${ key }` as keyof PreInscriptionFormData;
					if (
						formKey in form &&
						data[ key ] !== null &&
						data[ key ] !== undefined
					) {
						( form as unknown as Record< string, unknown > )[
							formKey
						] = data[ key ];
					}
				} );

				// Pre-fill questionnaire and communication preferences if provided
				if ( data.health_questionnaire ) {
					form.dame_health_questionnaire = data.health_questionnaire;
				}
				if ( data.refuses_comms !== undefined ) {
					form.dame_refuses_comms = Boolean( data.refuses_comms );
				}
				if ( data.legal_rep_1_refuses_comms !== undefined ) {
					form.dame_legal_rep_1_refuses_comms = Boolean(
						data.legal_rep_1_refuses_comms
					);
				}
				if ( data.legal_rep_2_refuses_comms !== undefined ) {
					form.dame_legal_rep_2_refuses_comms = Boolean(
						data.legal_rep_2_refuses_comms
					);
				}

				checkAge();
			} else if ( response.status === 401 ) {
				console.error( 'Session définitivement expirée.' );
				authStore.logout();
			}
		} catch ( err ) {
			console.error(
				'Erreur lors de la récupération des détails adhérent:',
				err
			);
		}
	};

	/**
	 * Soumet le formulaire de pré-inscription
	 * @param form
	 * @param consentCheckbox
	 */
	const submitForm = async (
		form: PreInscriptionFormData,
		consentCheckbox: boolean
	) => {
		errorMessage.value = '';
		isSubmitting.value = true;

		try {
			const headers: Record< string, string > = {
				'Content-Type': 'application/json',
			};
			if ( authStore.isAuthenticated ) {
				headers.Authorization = `Bearer ${ authStore.token }`;
			}

			const bodyData: Record< string, unknown > = {
				...form,
				dame_consent_checkbox: consentCheckbox ? '1' : '',
			};

			if ( selectedTargetId.value > 0 ) {
				bodyData.adherent_id = selectedTargetId.value;
			}
			if (
				currentPreInscriptionId.value &&
				currentPreInscriptionId.value > 0
			) {
				bodyData.pre_inscription_id = currentPreInscriptionId.value;
			}

			const response = await fetch(
				`${
					import.meta.env.VITE_API_BASE_URL
				}/dame/v1/pre-inscription`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify( bodyData ),
				}
			);

			const resData = await response.json();

			if ( ! response.ok ) {
				errorMessage.value =
					resData.message ||
					'Une erreur est survenue lors de la validation.';
				return;
			}

			successData.value = resData;
			if ( resData.post_id ) {
				currentPreInscriptionId.value = resData.post_id;
				isExistingPreInscription.value = true;
			}

			if ( selectedTargetId.value > 0 ) {
				completedMemberIds.value.push( selectedTargetId.value );
			}

			// Actualisation silencieuse des identités en arrière-plan
			authStore.fetchMyIdentities().catch( () => {} );
		} catch ( err ) {
			console.error( err );
			errorMessage.value = 'Erreur de connexion au serveur.';
		} finally {
			isSubmitting.value = false;
		}
	};

	/**
	 * Téléchargement de document PDF (Santé / Autorisation Parentale)
	 * @param type
	 * @param form
	 */
	const downloadPdf = async (
		type: 'health' | 'parental',
		form: PreInscriptionFormData
	) => {
		if ( ! successData.value ) {
			return;
		}
		const post_id = successData.value.post_id;
		const token = successData.value.download_token;

		try {
			const url = `${
				import.meta.env.VITE_API_BASE_URL
			}/dame/v1/pre-inscriptions/${ post_id }/pdf/${ type }?token=${ token }`;
			const headers: Record< string, string > = {};
			if ( authStore.isAuthenticated ) {
				headers.Authorization = `Bearer ${ authStore.token }`;
			}

			const response = await fetch( url, { headers } );
			if ( ! response.ok ) {
				throw new Error( 'Erreur de téléchargement' );
			}

			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL( blob );
			const link = document.createElement( 'a' );
			link.href = blobUrl;

			const lastName = ( form.dame_last_name || '' )
				.trim()
				.replace( /\s+/g, '_' )
				.toUpperCase();
			const firstName = ( form.dame_first_name || '' )
				.trim()
				.replace( /\s+/g, '_' );
			const nameSuffix =
				lastName && firstName ? `_${ lastName }_${ firstName }` : '';
			const baseName =
				type === 'health'
					? 'attestation_sante'
					: 'autorisation_parentale';

			link.download = `${ baseName }${ nameSuffix }.pdf`;
			document.body.appendChild( link );
			link.click();
			document.body.removeChild( link );
			window.URL.revokeObjectURL( blobUrl );
		} catch ( err ) {
			console.error( err );
			alert( 'Impossible de générer et télécharger le document PDF.' );
		}
	};

	return {
		registrationTargets,
		selectedTargetId,
		completedMemberIds,
		hasLoadedIdentities,
		isExistingPreInscription,
		currentPreInscriptionId,
		isSubmitting,
		errorMessage,
		successData,
		loadIdentities,
		prefillAdherent,
		submitForm,
		downloadPdf,
	};
}
