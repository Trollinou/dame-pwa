export interface WpFeaturedMedia {
	source_url: string;
	alt_text?: string;
}

export interface WpPage {
	id: number;
	date?: string;
	modified?: string;
	slug?: string;
	title: {
		rendered: string;
	};
	content: {
		rendered: string;
	};
	excerpt?: {
		rendered: string;
	};
	_embedded?: {
		'wp:featuredmedia'?: WpFeaturedMedia[];
	};
}

export interface WpUser {
	id?: number;
	user_email?: string;
	user_nicename?: string;
	user_display_name?: string;
	display_name?: string;
	roles?: string[] | Record< string, string >;
	[ key: string ]: unknown;
}
