/**
 * Contrats de données TypeScript pour les Bénévolats (REST API v2)
 *
 * Spécification technique Liaison Agenda <-> Bénévolat.
 */

export interface LinkedAgendaSummary {
	/** ID numérique du post dame_agenda */
	id: number;
	/** Titre de l'événement */
	title: string;
	/** Date de début ISO (YYYY-MM-DD) */
	start_date: string;
	/** Date de fin ISO (YYYY-MM-DD) */
	end_date: string;
	/** Nom du lieu de l'événement si renseigné */
	location?: string;
	/** URL publique de l'événement */
	url: string;
}

export interface BenevolatTimeSlot {
	start: string;
	end: string;
	needed?: number;
	max_participants?: number;
}

export interface BenevolatDay {
	date: string;
	time_slots?: BenevolatTimeSlot[];
}

export interface Benevolat {
	id: number;
	modified: string;
	title: {
		rendered: string;
		raw?: string;
	};
	content?: {
		rendered: string;
	};
	dame_benevolat_data: BenevolatDay[];
	dame_benevolat_counts?: Record< string, number >;

	/** Événement agenda associé, ou null si aucun */
	linked_agenda?: LinkedAgendaSummary | null;

	meta?: {
		_dame_linked_agenda_id?: number | null;
		[ key: string ]: unknown;
	};
}

export interface BenevolatSlotStat {
	choice_key: string;
	date: string;
	start: string;
	end: string;
	needed: number;
	registered_count: number;
	is_fulfilled: boolean;
}

export interface BenevolatStatsResponse {
	id: number;
	total_distinct_voters: number;
	slots: BenevolatSlotStat[];
}

export interface BenevolatReponse {
	id: number;
	modified: string;
	title: {
		rendered: string;
		raw?: string;
	};
	benevolat_id: number;
	choices?: string[];
	meta?: {
		_dame_member_id?: number;
		[ key: string ]: unknown;
	};
}

