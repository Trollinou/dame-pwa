export interface AssociatedMember {
	firstname: string;
	name?: string;
	member_id: number;
	elo_standard?: number | string;
	elo_rapide?: number | string;
	elo_blitz?: number | string;
	already_registered?: boolean;
	has_pre_inscription?: boolean;
	pre_inscription_id?: number | null;
}

export interface Identity {
	id: string;
	name: string;
	type: 'member' | 'representative' | 'admin';
	member_id: number;
	firstname?: string;
	elo_standard?: number | string;
	elo_rapide?: number | string;
	elo_blitz?: number | string;
	associated_members?: AssociatedMember[];
	already_registered?: boolean;
	has_pre_inscription?: boolean;
	pre_inscription_id?: number | null;
}

export interface TokenExpiryInfo {
	isExpired: boolean;
	secondsLeft: number;
	expDate: string;
	payload: Record< string, unknown > | null;
}
