import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useNewsStore, type Post } from './news';
import { useTournamentStore, type MenuItem } from './tournament';
import { useBenevolatStore, type Benevolat } from './benevolat';

export interface UnreadStorageData {
	initializedAt: string;
	seenNews: Record< number, string >;
	seenTournaments: Record< number, string >;
	seenBenevolats: Record< number, string >;
}

const STORAGE_KEY = 'dame_unread_state';

export const isBenevolatExpired = ( benevolat: Benevolat ): boolean => {
	const data = benevolat.dame_benevolat_data;
	if ( Array.isArray( data ) && data.length > 0 ) {
		const dates = data.map( ( d ) => d.date ).filter( Boolean );
		if ( dates.length === 0 ) {
			return false;
		}
		const now = new Date();
		const year = now.getFullYear();
		const month = String( now.getMonth() + 1 ).padStart( 2, '0' );
		const day = String( now.getDate() ).padStart( 2, '0' );
		const todayStr = `${ year }-${ month }-${ day }`;
		const maxDate = dates.reduce(
			( max, d ) => ( d > max ? d : max ),
			dates[ 0 ]
		);
		return maxDate < todayStr;
	}
	return false;
};

export const useUnreadStore = defineStore( 'unread', () => {
	const newsStore = useNewsStore();
	const tournamentStore = useTournamentStore();
	const benevolatStore = useBenevolatStore();

	const initializedAt = ref< string >( '' );
	const seenNews = ref< Record< number, string > >( {} );
	const seenTournaments = ref< Record< number, string > >( {} );
	const seenBenevolats = ref< Record< number, string > >( {} );

	const loadState = () => {
		try {
			const raw = localStorage.getItem( STORAGE_KEY );
			if ( raw ) {
				const parsed = JSON.parse(
					raw
				) as Partial< UnreadStorageData >;
				initializedAt.value =
					parsed.initializedAt || new Date().toISOString();
				seenNews.value = parsed.seenNews || {};
				seenTournaments.value = parsed.seenTournaments || {};
				seenBenevolats.value = parsed.seenBenevolats || {};
				return;
			}
		} catch ( err ) {
			console.warn( 'Erreur lecture dame_unread_state:', err );
		}

		// Initialisation à froid (premier lancement)
		initializedAt.value = new Date().toISOString();
		seenNews.value = {};
		seenTournaments.value = {};
		seenBenevolats.value = {};
		saveState();
	};

	const saveState = () => {
		try {
			const data: UnreadStorageData = {
				initializedAt: initializedAt.value,
				seenNews: seenNews.value,
				seenTournaments: seenTournaments.value,
				seenBenevolats: seenBenevolats.value,
			};
			localStorage.setItem( STORAGE_KEY, JSON.stringify( data ) );
		} catch ( err ) {
			console.warn( 'Erreur sauvegarde dame_unread_state:', err );
		}
	};

	// Charge l'état initial
	loadState();

	// --- Détection des éléments non lus ---

	const isNewsUnread = ( post: Post ): boolean => {
		const itemDateStr = post.modified || post.date;
		if ( ! itemDateStr ) {
			return false;
		}

		const itemTimestamp = new Date( itemDateStr ).getTime();
		const initTimestamp = new Date( initializedAt.value ).getTime();

		// Élément paru ou modifié avant l'installation / initialisation -> considéré comme historique / lu
		if ( itemTimestamp <= initTimestamp ) {
			return false;
		}

		// Déjà vu depuis sa dernière modification ?
		const lastSeenDateStr = seenNews.value[ post.id ];
		if ( lastSeenDateStr ) {
			const lastSeenTimestamp = new Date( lastSeenDateStr ).getTime();
			return itemTimestamp > lastSeenTimestamp;
		}

		return true;
	};

	const isTournamentUnread = (
		item: MenuItem,
		pageModified?: string
	): boolean => {
		const itemDateStr = pageModified || item.modified;
		if ( ! itemDateStr ) {
			return false;
		}

		const itemTimestamp = new Date( itemDateStr ).getTime();
		const initTimestamp = new Date( initializedAt.value ).getTime();

		if ( itemTimestamp <= initTimestamp ) {
			return false;
		}

		const lastSeenDateStr = seenTournaments.value[ item.object_id ];
		if ( lastSeenDateStr ) {
			const lastSeenTimestamp = new Date( lastSeenDateStr ).getTime();
			return itemTimestamp > lastSeenTimestamp;
		}

		return true;
	};

	const isBenevolatUnread = ( benevolat: Benevolat ): boolean => {
		// Les appels terminés ne génèrent jamais de badge
		if ( isBenevolatExpired( benevolat ) ) {
			return false;
		}

		const itemDateStr = benevolat.modified;
		if ( ! itemDateStr ) {
			return false;
		}

		const itemTimestamp = new Date( itemDateStr ).getTime();
		const initTimestamp = new Date( initializedAt.value ).getTime();

		if ( itemTimestamp <= initTimestamp ) {
			return false;
		}

		const lastSeenDateStr = seenBenevolats.value[ benevolat.id ];
		if ( lastSeenDateStr ) {
			const lastSeenTimestamp = new Date( lastSeenDateStr ).getTime();
			return itemTimestamp > lastSeenTimestamp;
		}

		return true;
	};

	// --- Compteurs calculés ---

	const newsUnreadCount = computed( () => {
		return newsStore.posts.filter( isNewsUnread ).length;
	} );

	const tournamentsUnreadCount = computed( () => {
		const topLevel = tournamentStore.menuItems.filter(
			( item ) => String( item.parent ) === '0'
		);
		return topLevel.filter( ( item ) => isTournamentUnread( item ) ).length;
	} );

	const benevolatsUnreadCount = computed( () => {
		return benevolatStore.benevolats.filter( isBenevolatUnread ).length;
	} );

	const clubUnreadCount = computed( () => {
		return (
			newsUnreadCount.value +
			tournamentsUnreadCount.value +
			benevolatsUnreadCount.value
		);
	} );

	// --- Actions de marquage individuel ---

	const markNewsAsSeen = ( id: number, modified?: string ) => {
		const now = new Date().toISOString();
		seenNews.value[ id ] = modified || now;
		saveState();
	};

	const markTournamentAsSeen = ( objectId: number, modified?: string ) => {
		const now = new Date().toISOString();
		seenTournaments.value[ objectId ] = modified || now;
		saveState();
	};

	const markBenevolatAsSeen = ( id: number, modified?: string ) => {
		const now = new Date().toISOString();
		seenBenevolats.value[ id ] = modified || now;
		saveState();
	};

	// --- Actions "Tout marquer comme lu" ---

	const markAllNewsAsSeen = () => {
		const now = new Date().toISOString();
		newsStore.posts.forEach( ( post ) => {
			seenNews.value[ post.id ] = post.modified || post.date || now;
		} );
		saveState();
	};

	const markAllTournamentsAsSeen = () => {
		const now = new Date().toISOString();
		tournamentStore.menuItems.forEach( ( item ) => {
			if ( item.object_id ) {
				seenTournaments.value[ item.object_id ] = item.modified || now;
			}
		} );
		saveState();
	};

	const markAllBenevolatsAsSeen = () => {
		const now = new Date().toISOString();
		benevolatStore.benevolats.forEach( ( benevolat ) => {
			seenBenevolats.value[ benevolat.id ] = benevolat.modified || now;
		} );
		saveState();
	};

	const markAllAsSeen = ( segment?: string ) => {
		if ( segment === 'actualites' ) {
			markAllNewsAsSeen();
		} else if ( segment === 'tournois' ) {
			markAllTournamentsAsSeen();
		} else if ( segment === 'benevolat' ) {
			markAllBenevolatsAsSeen();
		} else {
			markAllNewsAsSeen();
			markAllTournamentsAsSeen();
			markAllBenevolatsAsSeen();
		}
	};

	const resetUnreadState = ( newInitDate?: string ) => {
		initializedAt.value = newInitDate || new Date().toISOString();
		seenNews.value = {};
		seenTournaments.value = {};
		seenBenevolats.value = {};
		saveState();
	};

	return {
		initializedAt,
		seenNews,
		seenTournaments,
		seenBenevolats,
		isNewsUnread,
		isTournamentUnread,
		isBenevolatUnread,
		newsUnreadCount,
		tournamentsUnreadCount,
		benevolatsUnreadCount,
		clubUnreadCount,
		markNewsAsSeen,
		markTournamentAsSeen,
		markBenevolatAsSeen,
		markAllNewsAsSeen,
		markAllTournamentsAsSeen,
		markAllBenevolatsAsSeen,
		markAllAsSeen,
		resetUnreadState,
		loadState,
	};
} );
