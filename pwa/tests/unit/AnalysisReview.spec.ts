import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AnalysisPage from '@/views/learning/AnalysisPage.vue';
import type { GameReviewReport } from 'eg-chessboard';

interface AnalysisPageVm {
	gameReviewReport: GameReviewReport | null;
	viewPly: ( _ply: number ) => void;
	selectPlyForReview: ( _ply: number ) => void;
	toggleBeforeAfter: ( _before: boolean ) => void;
	activePly: number;
	isViewingBeforeMove: boolean;
}

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

// Mock Ionic Vue
vi.mock( '@ionic/vue', async () => {
	const actual = await vi.importActual( '@ionic/vue' );
	return {
		...actual,
		IonPage: { template: '<div><slot /></div>' },
		IonHeader: { template: '<div><slot /></div>' },
		IonToolbar: { template: '<div><slot /></div>' },
		IonTitle: { template: '<div><slot /></div>' },
		IonContent: { template: '<div><slot /></div>' },
		IonButtons: { template: '<div><slot /></div>' },
		IonBackButton: { template: '<button><slot /></button>' },
		IonGrid: { template: '<div><slot /></div>' },
		IonRow: { template: '<div><slot /></div>' },
		IonCol: { template: '<div><slot /></div>' },
		IonButton: {
			template: '<button @click="$emit(\'click\')"><slot /></button>',
		},
		IonIcon: { template: '<i />' },
		IonProgressBar: { template: '<div />' },
		onIonViewWillLeave: vi.fn(),
	};
} );

describe( 'AnalysisPage - Revue de partie (Bilan et analyse de coup)', () => {
	const createMockBoardApi = () => ( {
		loadPgn: vi.fn(),
		getHistory: vi.fn( () => [ 'e4', 'e6', 'd4', 'Nf6' ] ),
		getHistoryViewerState: vi.fn( () => ( {
			isEnabled: true,
			plyViewing: 4,
		} ) ),
		viewStart: vi.fn(),
		viewHistory: vi.fn(),
		viewPrevious: vi.fn(),
		viewNext: vi.fn(),
		hideMoves: vi.fn(),
		setShapes: vi.fn(),
		drawMove: vi.fn(),
		redraw: vi.fn(),
		reviewGame: vi.fn(),
		cancelReview: vi.fn(),
		startLiveAnalysis: vi.fn(),
		stopLiveAnalysis: vi.fn(),
		requestHint: vi.fn(),
		getIsGameOver: vi.fn( () => false ),
		getTurnColor: vi.fn( () => 'white' ),
	} );

	const mockReviewReport: GameReviewReport = {
		accuracy: { white: 95, black: 80 },
		summary: {
			white: {
				brilliant: 0,
				best: 2,
				excellent: 0,
				good: 0,
				inaccuracy: 0,
				mistake: 0,
				blunder: 0,
				missed_win: 0,
			},
			black: {
				brilliant: 0,
				best: 0,
				excellent: 1,
				good: 0,
				inaccuracy: 1,
				mistake: 0,
				blunder: 0,
				missed_win: 0,
			},
		},
		moves: [
			{
				ply: 1,
				san: 'e4',
				uci: 'e2e4',
				color: 'white',
				judgement: 'best',
				playedMoveScore: 20,
				bestMoveScore: 20,
				diffPercentage: 0,
				bestMoveUci: 'e2e4',
				bestMoveSan: 'e4',
			},
			{
				ply: 2,
				san: 'e6',
				uci: 'e7e6',
				color: 'black',
				judgement: 'excellent',
				playedMoveScore: -20,
				bestMoveScore: -15,
				diffPercentage: 5,
				bestMoveUci: 'c7c5',
				bestMoveSan: 'c5',
			},
			{
				ply: 3,
				san: 'd4',
				uci: 'd2d4',
				color: 'white',
				judgement: 'best',
				playedMoveScore: 30,
				bestMoveScore: 30,
				diffPercentage: 0,
				bestMoveUci: 'd2d4',
				bestMoveSan: 'd4',
			},
			{
				ply: 4,
				san: 'Nf6',
				uci: 'g8f6',
				color: 'black',
				judgement: 'inaccuracy',
				playedMoveScore: -120,
				bestMoveScore: -20,
				diffPercentage: 100,
				bestMoveUci: 'd7d5',
				bestMoveSan: 'd5',
			},
		],
		evalGraph: [],
	};

	it( 'affiche la carte de coup analysé et positionne l’échiquier avant le coup en mode Bilan', async () => {
		setActivePinia( createPinia() );
		const mockBoard = createMockBoardApi();

		const wrapper = mount( AnalysisPage, {
			global: {
				directives: {
					'safe-html': ( el, binding ) => {
						el.innerHTML = binding.value;
					},
				},
				stubs: {
					Chessboard: {
						template: '<div class="chessboard-stub" />',
						emits: [ 'board-created' ],
						mounted() {
							this.$emit( 'board-created', mockBoard );
						},
					},
				},
			},
		} );

		await wrapper.vm.$nextTick();

		const vm = wrapper.vm as unknown as AnalysisPageVm;

		// Injection directe du bilan pour tester l'interaction
		vm.gameReviewReport = mockReviewReport;

		// L'utilisateur clique sur le ply 4 (Nf6 ?!)
		vm.viewPly( 4 );

		expect( vm.activePly ).toBe( 4 );
		// Vérification clé : l'échiquier est positionné sur le ply précédent (ply 3) pour voir la position de départ
		expect( mockBoard.viewHistory ).toHaveBeenCalledWith( 3 );

		// Vérification des flèches : coup joué (g8f6 en jaune) et meilleur coup (d7d5 en vert)
		expect( mockBoard.setShapes ).toHaveBeenCalledWith( [
			{ orig: 'g8', dest: 'f6', brush: 'yellow' },
			{ orig: 'd7', dest: 'd5', brush: 'green' },
		] );

		// La carte du coup sélectionné est affichée avec les bons libellés
		await wrapper.vm.$nextTick();
		const moveCard = wrapper.find( '.analysis-move-card' );
		expect( moveCard.exists() ).toBe( true );
		expect( moveCard.text() ).toContain( '2... Nf6' );
		expect( moveCard.text() ).toContain( 'Imprécision' );
		expect( moveCard.text() ).toContain( 'd5' );
	} );

	it( 'permet de basculer entre la position avant coup et après coup', async () => {
		setActivePinia( createPinia() );
		const mockBoard = createMockBoardApi();

		const wrapper = mount( AnalysisPage, {
			global: {
				directives: {
					'safe-html': ( el, binding ) => {
						el.innerHTML = binding.value;
					},
				},
				stubs: {
					Chessboard: {
						template: '<div class="chessboard-stub" />',
						emits: [ 'board-created' ],
						mounted() {
							this.$emit( 'board-created', mockBoard );
						},
					},
				},
			},
		} );

		await wrapper.vm.$nextTick();

		const vm = wrapper.vm as unknown as AnalysisPageVm;
		vm.gameReviewReport = mockReviewReport;
		vm.selectPlyForReview( 4 );

		// Basculer vers "Après le coup"
		vm.toggleBeforeAfter( false );
		expect( mockBoard.viewHistory ).toHaveBeenCalledWith( 4 );
		expect( vm.isViewingBeforeMove ).toBe( false );

		// Revenir "Avant le coup"
		vm.toggleBeforeAfter( true );
		expect( mockBoard.viewHistory ).toHaveBeenCalledWith( 3 );
		expect( vm.isViewingBeforeMove ).toBe( true );
	} );
} );
