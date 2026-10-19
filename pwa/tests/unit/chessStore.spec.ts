import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useChessStore } from '@/stores/chess';
import { useAuthStore } from '@/stores/auth';
import { safeFetch } from '@/utils/safeFetch';
import type { Identity } from '@/stores/auth/types';

vi.mock( '@/utils/safeFetch', () => ( {
	safeFetch: vi.fn(),
} ) );

vi.mock( '@tanstack/vue-query', async ( importOriginal ) => {
	const actual =
		await importOriginal< typeof import('@tanstack/vue-query') >();
	return {
		...actual,
		useQueryClient: () => ( {
			invalidateQueries: vi.fn(),
			clear: vi.fn(),
		} ),
	};
} );

vi.mock( '@/stores/auth/identitiesService', () => ( {
	useIdentitiesService: () => ( {
		identities: { value: [] },
		refetchIdentities: vi.fn(),
		isIdentitiesLoading: { value: false },
		selectIdentity: vi.fn(),
	} ),
} ) );

describe( 'chessStore - saveCompletedGame & syncPendingGames', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		localStorage.clear();
		vi.clearAllMocks();
		Object.defineProperty( navigator, 'onLine', {
			value: true,
			writable: true,
		} );
	} );

	afterEach( () => {
		localStorage.clear();
	} );

	it( 'does not save game if user is not authenticated', async () => {
		const authStore = useAuthStore();
		authStore.token = '';
		authStore.user = null;
		authStore.selectedIdentity = null;

		const chessStore = useChessStore();
		await chessStore.saveCompletedGame( 60, '1. e4 e5' );

		expect( safeFetch ).not.toHaveBeenCalled();
		expect( localStorage.getItem( 'dame_pending_games' ) ).toBeNull();
	} );

	it( 'does not save game if selected identity is a legal representative', async () => {
		const authStore = useAuthStore();
		authStore.token = 'dummy_valid_jwt_token';
		authStore.selectedIdentity = {
			id: 'rep_1',
			name: 'Parent Name',
			type: 'representative',
			member_id: 10,
		} as unknown as Identity;

		const chessStore = useChessStore();
		await chessStore.saveCompletedGame( 60, '1. e4 e5' );

		expect( safeFetch ).not.toHaveBeenCalled();
		expect( localStorage.getItem( 'dame_pending_games' ) ).toBeNull();
	} );

	it( 'transmits game to ROI with X-Selected-Identity for a member with member_id > 0', async () => {
		const authStore = useAuthStore();
		authStore.token = 'dummy_valid_jwt_token';
		authStore.selectedIdentity = {
			id: 'member_42',
			name: 'Adhérent Joueur',
			type: 'member',
			member_id: 42,
		} as unknown as Identity;

		const chessStore = useChessStore();
		chessStore.engineElo = 1500;
		chessStore.helpCount = 2;
		chessStore.oupsCount = 1;

		vi.mocked( safeFetch ).mockResolvedValueOnce( {
			ok: true,
			json: async () => ( { success: true } ),
		} as unknown as Response );

		await chessStore.saveCompletedGame( 125, '1. e4 e5 2. Nf3 Nc6' );

		expect( safeFetch ).toHaveBeenCalledTimes( 1 );
		expect( safeFetch ).toHaveBeenCalledWith(
			expect.stringContaining( '/roi/v1/games' ),
			expect.objectContaining( {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Selected-Identity': 'member_42',
				},
				body: expect.stringContaining( '"member_id":42' ),
			} )
		);

		const requestBody = JSON.parse(
			vi.mocked( safeFetch ).mock.calls[ 0 ][ 1 ]?.body as string
		);
		expect( requestBody.duration ).toBe( 125 );
		expect( requestBody.difficulty_level ).toBe( 1500 );
		expect( requestBody.hints_count ).toBe( 2 );
		expect( requestBody.takebacks_count ).toBe( 1 );
		expect( requestBody.pgn ).toBe( '1. e4 e5 2. Nf3 Nc6' );
	} );

	it( 'transmits game to ROI for an admin with member_id = 0 and wp_virtual identity', async () => {
		const authStore = useAuthStore();
		authStore.token = 'dummy_valid_jwt_token';
		authStore.selectedIdentity = {
			id: 'wp_virtual',
			name: 'Admin Principal',
			type: 'admin',
			member_id: 0,
		} as unknown as Identity;

		const chessStore = useChessStore();

		vi.mocked( safeFetch ).mockResolvedValueOnce( {
			ok: true,
			json: async () => ( { success: true } ),
		} as unknown as Response );

		await chessStore.saveCompletedGame( 300, '1. d4 d5 2. c4' );

		expect( safeFetch ).toHaveBeenCalledTimes( 1 );
		expect( safeFetch ).toHaveBeenCalledWith(
			expect.stringContaining( '/roi/v1/games' ),
			expect.objectContaining( {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Selected-Identity': 'wp_virtual',
				},
				body: expect.stringContaining( '"member_id":0' ),
			} )
		);
	} );

	it( 'queues game offline when navigator is offline', async () => {
		Object.defineProperty( navigator, 'onLine', {
			value: false,
			writable: true,
		} );

		const authStore = useAuthStore();
		authStore.token = 'dummy_valid_jwt_token';
		authStore.selectedIdentity = {
			id: 'member_42',
			name: 'Adhérent Joueur',
			type: 'member',
			member_id: 42,
		} as unknown as Identity;

		const chessStore = useChessStore();
		await chessStore.saveCompletedGame( 90, '1. e4 e5' );

		expect( safeFetch ).not.toHaveBeenCalled();
		const stored = localStorage.getItem( 'dame_pending_games' );
		expect( stored ).not.toBeNull();
		const parsed = JSON.parse( stored! );
		expect( parsed ).toHaveLength( 1 );
		expect( parsed[ 0 ].member_id ).toBe( 42 );
		expect( parsed[ 0 ].duration ).toBe( 90 );
	} );

	it( 'syncPendingGames flushes offline queue with X-Selected-Identity', async () => {
		const authStore = useAuthStore();
		authStore.token = 'dummy_valid_jwt_token';
		authStore.selectedIdentity = {
			id: 'member_42',
			name: 'Adhérent Joueur',
			type: 'member',
			member_id: 42,
		} as unknown as Identity;

		localStorage.setItem(
			'dame_pending_games',
			JSON.stringify( [
				{
					member_id: 42,
					difficulty_level: 1200,
					hints_count: 0,
					takebacks_count: 0,
					pgn: '1. e4 e5',
					duration: 80,
					game_date: new Date().toISOString(),
				},
			] )
		);

		vi.mocked( safeFetch ).mockResolvedValueOnce( {
			ok: true,
			json: async () => ( { success: true } ),
		} as unknown as Response );

		const chessStore = useChessStore();
		await chessStore.syncPendingGames();

		expect( safeFetch ).toHaveBeenCalledTimes( 1 );
		expect( safeFetch ).toHaveBeenCalledWith(
			expect.stringContaining( '/roi/v1/games' ),
			expect.objectContaining( {
				headers: expect.objectContaining( {
					'X-Selected-Identity': 'member_42',
				} ),
			} )
		);
		expect( localStorage.getItem( 'dame_pending_games' ) ).toBe( '[]' );
	} );
} );
