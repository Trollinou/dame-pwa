import type { AgendaEvent } from 'dame-types';

/**
 * Détermine la saison (format "YYYY-YYYY") d'une date donnée.
 * Une saison sportive s'étend du 1er septembre de l'année X au 31 août de l'année X+1.
 *
 * @param dateStr Date au format YYYY-MM-DD ou ISO
 * @return Chaîne de la saison (ex: "2025-2026") ou null si la date est invalide
 */
export function getSeasonFromDate( dateStr?: string | null ): string | null {
	if ( ! dateStr || typeof dateStr !== 'string' ) {
		return null;
	}

	const parts = dateStr.trim().split( /[-/T ]/ );
	if ( parts.length < 2 ) {
		return null;
	}

	const year = parseInt( parts[ 0 ], 10 );
	const month = parseInt( parts[ 1 ], 10 );

	if ( isNaN( year ) || isNaN( month ) || month < 1 || month > 12 ) {
		return null;
	}

	const startYear = month >= 9 ? year : year - 1;
	const endYear = startYear + 1;

	return `${ startYear }-${ endYear }`;
}

/**
 * Retourne la saison courante selon la date du jour.
 *
 * @param refDate Date de référence optionnelle (par défaut new Date())
 * @return Chaîne de la saison (ex: "2025-2026")
 */
export function getCurrentSeason( refDate: Date = new Date() ): string {
	const year = refDate.getFullYear();
	const month = refDate.getMonth() + 1; // 1-indexed

	const startYear = month >= 9 ? year : year - 1;
	const endYear = startYear + 1;

	return `${ startYear }-${ endYear }`;
}

/**
 * Formate une date YYYY-MM-DD ou datetime MySQL / ISO en format français DD/MM/YYYY.
 *
 * @param dateStr Chaîne de date à formater.
 * @return Date formatée ou '-' si invalide.
 */
export function formatDateFr( dateStr?: string | null ): string {
	if ( ! dateStr || typeof dateStr !== 'string' ) {
		return '-';
	}
	const cleanDate = dateStr.trim().split( /[T ]/ )[ 0 ];
	const parts = cleanDate.split( '-' );
	if ( parts.length === 3 ) {
		return `${ parts[ 2 ] }/${ parts[ 1 ] }/${ parts[ 0 ] }`;
	}
	return dateStr;
}

/**
 * Formate la plage horaire ou calendaire d'un événement.
 * @param event
 */
export function formatEventSchedule( event?: AgendaEvent | null ): string {
	if ( ! event?.meta ) {
		return '-';
	}

	const {
		_dame_start_date: startDate,
		_dame_end_date: endDate,
		_dame_start_time: startTime,
		_dame_end_time: endTime,
		_dame_all_day: allDay,
	} = event.meta;

	// Événement multi-jours
	if ( startDate && endDate && startDate !== endDate ) {
		return `Du ${ formatDateFr( startDate ) } au ${ formatDateFr(
			endDate
		) }`;
	}

	// Événement sur une seule journée
	const isAllDay = allDay === 1 || allDay === true;
	if ( isAllDay ) {
		return 'Toute la journée';
	}

	if ( startTime && endTime ) {
		return `${ startTime } - ${ endTime }`;
	}

	if ( startTime ) {
		return `À partir de ${ startTime }`;
	}

	return '-';
}

/**
 * Formate le lieu d'un événement.
 *
 * @param event Événement d'agenda.
 * @return Chaîne décrivant le lieu.
 */
export function formatEventLocation( event?: AgendaEvent | null ): string {
	if ( ! event?.meta ) {
		return '-';
	}

	const parts = [
		event.meta._dame_location_name,
		event.meta._dame_city,
	].filter( Boolean );

	return parts.length > 0 ? parts.join( ', ' ) : '-';
}

/**
 * Extrait l'heure formatée en 'HHhMM' d'une chaîne datetime MySQL ou ISO.
 * Ignore les heures de journée entière / minuit (00:00:00 ou 23:59:59).
 *
 * @param dateStr Chaîne datetime au format YYYY-MM-DD HH:MM:SS ou ISO.
 * @return Heure formatée (ex: '14h30') ou null si absent ou journée entière.
 */
export function extractTimeFormatted(
	dateStr?: string | null
): string | null {
	if ( ! dateStr || typeof dateStr !== 'string' ) {
		return null;
	}
	const parts = dateStr.trim().split( /[T ]/ );
	if ( parts.length >= 2 ) {
		const timeParts = parts[ 1 ].split( ':' );
		if ( timeParts.length >= 2 ) {
			const h = timeParts[ 0 ].padStart( 2, '0' );
			const m = timeParts[ 1 ].padStart( 2, '0' );
			if ( ( h !== '00' || m !== '00' ) && ( h !== '23' || m !== '59' ) ) {
				return `${ h }h${ m }`;
			}
		}
	}
	return null;
}

/**
 * Formate la plage calendaire d'une collecte ou d'un événement HelloAsso.
 *
 * @param startStr Date de début (YYYY-MM-DD HH:MM:SS ou ISO).
 * @param endStr   Date de fin (YYYY-MM-DD HH:MM:SS ou ISO).
 * @return Libellé complet de la période.
 */
export function formatCampaignSchedule(
	startStr?: string | null,
	endStr?: string | null
): string {
	if ( ! startStr && ! endStr ) {
		return 'Formulaire permanent';
	}
	if ( ! startStr && endStr ) {
		return `Jusqu'au ${ formatDateFr( endStr ) }`;
	}
	if ( startStr && ! endStr ) {
		const start = formatDateFr( startStr );
		const startTime = extractTimeFormatted( startStr );
		return startTime ? `${ start } (à ${ startTime })` : start;
	}

	const startDateFr = formatDateFr( startStr );
	const endDateFr = formatDateFr( endStr );

	// Même jour (ou dates identiques)
	if ( startDateFr === endDateFr ) {
		const startTime = extractTimeFormatted( startStr );
		const endTime = extractTimeFormatted( endStr );
		if ( startTime && endTime ) {
			return `${ startDateFr } (${ startTime } à ${ endTime })`;
		}
		if ( startTime ) {
			return `${ startDateFr } (à ${ startTime })`;
		}
		return startDateFr;
	}

	// Événement multi-jours
	return `Du ${ startDateFr } au ${ endDateFr }`;
}

/**
 * Détermine la saison sportive d'une collecte HelloAsso.
 * Priorise linked_season_id, puis end_date, puis start_date.
 *
 * @param campaign Données partielles de la campagne.
 * @return Chaîne de la saison (ex: '2026-2027') ou chaîne vide si permanente.
 */
export function getCampaignSeason( campaign?: {
	linked_season_id?: number | null;
	start_date?: string | null;
	end_date?: string | null;
} | null ): string {
	if ( ! campaign ) {
		return '';
	}
	if ( campaign.linked_season_id ) {
		return `${ campaign.linked_season_id }-${ campaign.linked_season_id + 1 }`;
	}
	if ( campaign.end_date ) {
		const s = getSeasonFromDate( campaign.end_date );
		if ( s ) {
			return s;
		}
	}
	if ( campaign.start_date ) {
		const s = getSeasonFromDate( campaign.start_date );
		if ( s ) {
			return s;
		}
	}
	return '';
}

