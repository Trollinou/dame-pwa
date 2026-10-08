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
 * Formate une date YYYY-MM-DD en format français DD/MM/YYYY.
 * @param dateStr
 */
export function formatDateFr( dateStr?: string | null ): string {
	if ( ! dateStr || typeof dateStr !== 'string' ) {
		return '-';
	}
	const cleanDate = dateStr.split( 'T' )[ 0 ];
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
 * @param event
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
