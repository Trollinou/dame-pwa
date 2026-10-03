import type { AssociatedMember, MemberIdentity as Identity } from 'dame-types';

export type { AssociatedMember, Identity };

export interface TokenExpiryInfo {
	isExpired: boolean;
	secondsLeft: number;
	expDate: string;
	payload: Record< string, unknown > | null;
}
