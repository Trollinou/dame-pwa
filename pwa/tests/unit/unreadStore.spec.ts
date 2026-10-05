import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import { useUnreadStore, isBenevolatExpired } from '@/stores/unread';
import { useNewsStore, type Post } from '@/stores/news';
import { useBenevolatStore } from '@/stores/benevolat';

describe( 'useUnreadStore - Unread badges & notifications', () => {
	let app: ReturnType< typeof createApp >;

	beforeEach( () => {
		localStorage.clear();
		const pinia = createPinia();
		app = createApp( {} );
		app.use( pinia );
		app.use( VueQueryPlugin, { queryClient } );
		setActivePinia( pinia );
		queryClient.clear();
		vi.clearAllMocks();
	} );

	it( 'cold start initializes count to 0 and ignores older items', async () => {
		await app.runWithContext( async () => {
			const initDate = '2026-10-01T12:00:00.000Z';
			const unreadStore = useUnreadStore();
			unreadStore.resetUnreadState( initDate );

			const newsStore = useNewsStore();
			// Post créé avant l'initialisation
			queryClient.setQueryData< Post[] >(
				[ 'news', 'list' ],
				[
					{
						id: 1,
						date: '2026-09-20T10:00:00',
						modified: '2026-09-25T10:00:00',
						title: { rendered: 'Article Ancien' },
						content: { rendered: '<p>Contenu</p>' },
						excerpt: { rendered: '' },
					},
				]
			);

			expect( newsStore.posts.length ).toBe( 1 );
			expect( unreadStore.newsUnreadCount ).toBe( 0 );
			expect( unreadStore.clubUnreadCount ).toBe( 0 );
		} );
	} );

	it( 'detects new/modified posts published after initializedAt', async () => {
		await app.runWithContext( async () => {
			const initDate = '2026-10-01T12:00:00.000Z';
			const unreadStore = useUnreadStore();
			unreadStore.resetUnreadState( initDate );

			const newsStore = useNewsStore();
			queryClient.setQueryData< Post[] >(
				[ 'news', 'list' ],
				[
					{
						id: 1,
						date: '2026-09-20T10:00:00',
						modified: '2026-09-25T10:00:00',
						title: { rendered: 'Ancien' },
						content: { rendered: '' },
						excerpt: { rendered: '' },
					},
					{
						id: 2,
						date: '2026-10-02T10:00:00',
						modified: '2026-10-02T10:00:00',
						title: { rendered: 'Nouveau' },
						content: { rendered: '' },
						excerpt: { rendered: '' },
					},
				]
			);

			expect( unreadStore.newsUnreadCount ).toBe( 1 );
			expect( unreadStore.isNewsUnread( newsStore.posts[ 0 ] ) ).toBe(
				false
			);
			expect( unreadStore.isNewsUnread( newsStore.posts[ 1 ] ) ).toBe(
				true
			);
			expect( unreadStore.clubUnreadCount ).toBe( 1 );

			// Marquer comme lu
			unreadStore.markNewsAsSeen( 2, '2026-10-02T10:00:00' );
			expect( unreadStore.newsUnreadCount ).toBe( 0 );
			expect( unreadStore.clubUnreadCount ).toBe( 0 );
		} );
	} );

	it( 're-marks post as unread if modified date is updated after last view', async () => {
		await app.runWithContext( async () => {
			const initDate = '2026-10-01T12:00:00.000Z';
			const unreadStore = useUnreadStore();
			unreadStore.resetUnreadState( initDate );

			queryClient.setQueryData< Post[] >(
				[ 'news', 'list' ],
				[
					{
						id: 2,
						date: '2026-10-02T10:00:00',
						modified: '2026-10-02T10:00:00',
						title: { rendered: 'Article' },
						content: { rendered: '' },
						excerpt: { rendered: '' },
					},
				]
			);

			// Vu le 02/10
			unreadStore.markNewsAsSeen( 2, '2026-10-02T10:00:00' );
			expect( unreadStore.newsUnreadCount ).toBe( 0 );

			// L'article est mis à jour le 04/10
			queryClient.setQueryData< Post[] >(
				[ 'news', 'list' ],
				[
					{
						id: 2,
						date: '2026-10-02T10:00:00',
						modified: '2026-10-04T15:00:00',
						title: { rendered: 'Article mis à jour' },
						content: { rendered: '' },
						excerpt: { rendered: '' },
					},
				]
			);

			expect( unreadStore.newsUnreadCount ).toBe( 1 );
			expect( unreadStore.clubUnreadCount ).toBe( 1 );
		} );
	} );

	it( 'calculates tournament and benevolat unread counts and excludes expired benevolats', async () => {
		await app.runWithContext( async () => {
			const initDate = '2026-10-01T12:00:00.000Z';
			const unreadStore = useUnreadStore();
			unreadStore.resetUnreadState( initDate );

			const benevolatStore = useBenevolatStore();

			// Menu tournois
			queryClient.setQueryData(
				[ 'tournament', 'menu' ],
				[
					{
						id: 10,
						title: 'Tournoi d Automne',
						object_id: 101,
						parent: 0,
						modified: '2026-10-03T10:00:00',
					},
				]
			);

			// Bénévolats : 1 futur (non expiré) et 1 passé (expiré)
			queryClient.setQueryData(
				[ 'benevolat', 'list', 'public' ],
				[
					{
						id: 201,
						modified: '2026-10-03T10:00:00',
						title: { rendered: 'Tournoi Jeunes' },
						dame_benevolat_data: [
							{ date: '2026-12-15', time_slots: [] },
						],
					},
					{
						id: 202,
						modified: '2026-10-03T10:00:00',
						title: { rendered: 'Ancien Tournoi' },
						dame_benevolat_data: [
							{ date: '2026-01-10', time_slots: [] },
						],
					},
				]
			);

			expect( isBenevolatExpired( benevolatStore.benevolats[ 1 ] ) ).toBe(
				true
			);
			expect( isBenevolatExpired( benevolatStore.benevolats[ 0 ] ) ).toBe(
				false
			);

			expect( unreadStore.tournamentsUnreadCount ).toBe( 1 );
			expect( unreadStore.benevolatsUnreadCount ).toBe( 1 ); // Seul le 201 non-expiré est compté
			expect( unreadStore.clubUnreadCount ).toBe( 2 );

			// Marquer tournoi comme vu
			unreadStore.markTournamentAsSeen( 101, '2026-10-03T10:00:00' );
			expect( unreadStore.tournamentsUnreadCount ).toBe( 0 );
			expect( unreadStore.clubUnreadCount ).toBe( 1 );

			// Marquer bénévolat comme vu
			unreadStore.markBenevolatAsSeen( 201, '2026-10-03T10:00:00' );
			expect( unreadStore.benevolatsUnreadCount ).toBe( 0 );
			expect( unreadStore.clubUnreadCount ).toBe( 0 );
		} );
	} );

	it( 'markAllAsSeen marks all unread items as seen across all segments', async () => {
		await app.runWithContext( async () => {
			const initDate = '2026-10-01T12:00:00.000Z';
			const unreadStore = useUnreadStore();
			unreadStore.resetUnreadState( initDate );

			queryClient.setQueryData< Post[] >(
				[ 'news', 'list' ],
				[
					{
						id: 1,
						date: '2026-10-02T10:00:00',
						modified: '2026-10-02T10:00:00',
						title: { rendered: 'Nouveau post' },
						content: { rendered: '' },
						excerpt: { rendered: '' },
					},
				]
			);

			queryClient.setQueryData(
				[ 'tournament', 'menu' ],
				[
					{
						id: 10,
						title: 'Tournoi',
						object_id: 101,
						parent: 0,
						modified: '2026-10-03T10:00:00',
					},
				]
			);

			queryClient.setQueryData(
				[ 'benevolat', 'list', 'public' ],
				[
					{
						id: 201,
						modified: '2026-10-03T10:00:00',
						title: { rendered: 'Aide Open' },
						dame_benevolat_data: [
							{ date: '2026-12-15', time_slots: [] },
						],
					},
				]
			);

			expect( unreadStore.clubUnreadCount ).toBe( 3 );

			// Tout marquer comme vu
			unreadStore.markAllAsSeen();

			expect( unreadStore.newsUnreadCount ).toBe( 0 );
			expect( unreadStore.tournamentsUnreadCount ).toBe( 0 );
			expect( unreadStore.benevolatsUnreadCount ).toBe( 0 );
			expect( unreadStore.clubUnreadCount ).toBe( 0 );
		} );
	} );
} );
