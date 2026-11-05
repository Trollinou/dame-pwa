/**
 * Contrats de données TypeScript pour l'Agenda (REST API v2)
 *
 * Spécification technique Liaison Agenda <-> Bénévolat.
 */

export interface LinkedBenevolatSummary {
	/** ID numérique du post benevolat */
	id: number;
	/** Titre public de l'appel */
	title: string;
	/** Slug de l'appel pour le routage */
	slug: string;
	/** URL publique de repli */
	url: string;
	/** Indique si l'appel est publié et actif */
	is_active: boolean;
}

export interface AgendaEventCategory {
	id: number;
	name: string;
	slug: string;
	color: string;
}

export interface AgendaEventMeta {
	_dame_start_date: string;
	_dame_end_date: string;
	_dame_start_time?: string;
	_dame_end_time?: string;
	_dame_all_day?: number | boolean;
	_dame_location_name?: string;
	_dame_address?: string;
	_dame_address_1?: string;
	_dame_postal_code?: string;
	_dame_city?: string;
	_dame_latitude?: number | string;
	_dame_longitude?: number | string;
	_dame_competition_type?: string;
	_dame_competition_level?: string;
	_dame_level?: string;
	_dame_color?: string;
	_dame_recurrence_group_id?: string;
	_dame_agenda_description?: string;
	_dame_linked_benevolat_id?: number | null;
	_dame_linked_ha_campaign_id?: number | null;
	[ key: string ]: unknown;
}

export interface AgendaEvent {
	id: number;
	modified?: string;
	title: {
		rendered: string;
		raw?: string;
	};
	content?: {
		rendered: string;
		raw?: string;
	};
	_dame_agenda_description_html?: string;
	categories_data?: AgendaEventCategory[];
	dame_agenda_category?: number[];

	/** Objet bénévole associé, ou null si aucun appel lié */
	linked_benevolat?: LinkedBenevolatSummary | null;

	meta: AgendaEventMeta;
}

