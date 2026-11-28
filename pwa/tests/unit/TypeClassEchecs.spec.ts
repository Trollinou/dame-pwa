import { describe, expect, test, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TypeClassEchecs from '@/views/learning/types/TypeClassEchecs.vue';
import { EXERCISE_HEADER_KEY, type ExerciseHeaderState } from '@/composables/learning/useExerciseHeader';
import type { ExerciseType11Config } from '@/types/roi';

const fireCelebrationMock = vi.fn();
vi.mock('@/composables/learning/useCelebration', () => ({
	fireExerciseCelebration: () => fireCelebrationMock(),
}));

// Mock deterministic shuffle: reverse order
vi.mock('@/utils/chess/chessNotation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/utils/chess/chessNotation')>();
	return {
		...actual,
		shuffleArray: <T,>(arr: T[]) => [...arr].reverse(),
		shuffleNonSorted: <T,>(arr: T[]) => [...arr].reverse(),
	};
});

// Mock DiagramViewer to inspect fen, orientation, shapes
vi.mock('@/components/learning/viewers/DiagramViewer.vue', () => ({
	default: {
		name: 'DiagramViewer',
		props: ['fen', 'orientation', 'shapes', 'zoomable'],
		template: `
			<div class="mock-diagram-viewer" :data-fen="fen" :data-orientation="orientation" :data-shapes-count="shapes ? shapes.length : 0">
				{{ fen }}
			</div>
		`,
	},
}));

const sampleConfig: ExerciseType11Config = {
	type: 11,
	consigne: 'Classez ces positions de la plus forte (1) à la moins forte (3).',
	positions: [
		{
			fen: 'r3k1nr/pbp1bppp/1pnp1q2/4p3/2B1P3/2NPBN2/PPP2PPP/R2Q1RK1 w kq - 0 1',
			couleur_joueur: 'black',
			shapes: [{ orig: 'c3', dest: 'd5', brush: 'green' }],
			commentaire: '1 : La Dame en f6 est mal placée.',
		},
		{
			fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
			couleur_joueur: 'white',
			shapes: [],
			commentaire: '2 : Position équilibrée.',
		},
		{
			fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
			couleur_joueur: 'black',
			shapes: [],
			commentaire: '',
		},
	],
};

describe('TypeClassEchecs.vue', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		fireCelebrationMock.mockClear();
	});

	const mountComponent = (config: ExerciseType11Config = sampleConfig) => {
		const headerState = ref<ExerciseHeaderState>({});
		return mount(TypeClassEchecs, {
			props: {
				config,
				id: 11,
			},
			global: {
				stubs: {
					Teleport: true,
				},
				provide: {
					[EXERCISE_HEADER_KEY as symbol]: {
						setHeaderState: (state: ExerciseHeaderState) => {
							headerState.value = state;
						},
					},
				},
			},
		});
	};

	const dragTile = async (wrapper: ReturnType<typeof mountComponent>, fromIdx: number, toIdx: number) => {
		const cards = wrapper.findAll('.learning-board-card--draggable');
		const targetEl = cards[toIdx].element;
		const originalElementFromPoint = document.elementFromPoint;
		document.elementFromPoint = vi.fn().mockReturnValue(targetEl);

		cards[fromIdx].element.dispatchEvent(
			new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 })
		);
		window.dispatchEvent(
			new MouseEvent('pointermove', { bubbles: true, clientX: 50, clientY: 50 })
		);
		await wrapper.vm.$nextTick();
		window.dispatchEvent(
			new MouseEvent('pointerup', { bubbles: true, clientX: 50, clientY: 50 })
		);
		await wrapper.vm.$nextTick();
		document.elementFromPoint = originalElementFromPoint;
	};

	test('affiche la grille 2 colonnes en mode Drag & Drop, masque les commentaires et respecte couleur_joueur', () => {
		const wrapper = mountComponent();

		expect(wrapper.find('.learning-board-grid-2col').exists()).toBe(true);
		expect(wrapper.findAll('.learning-board-card--draggable')).toHaveLength(3);
		expect(wrapper.find('.order-validated-list').exists()).toBe(false);
		expect(wrapper.find('.order-comment-box').exists()).toBe(false);

		const diagrams = wrapper.findAll('.mock-diagram-viewer');
		expect(diagrams).toHaveLength(3);

		// Avec shuffleArray inversé, l'index 0 affiché correspond à la position 2 (couleur_joueur: black)
		expect(diagrams[0].attributes('data-orientation')).toBe('black');
		// La position 0 (maintenant en dernier, index 2) garde ses shapes et son orientation 'black' même si trait aux Blancs
		expect(diagrams[2].attributes('data-orientation')).toBe('black');
		expect(diagrams[2].attributes('data-shapes-count')).toBe('1');
	});

	test('permet de classer les cartes par glisser-déposer, valide en temps réel et affiche les commentaires correspondants', async () => {
		const wrapper = mountComponent();

		const cards = wrapper.findAll('.learning-board-card--draggable');
		expect(cards).toHaveLength(3);

		// L'ordre initial inversé est [2, 1, 0].
		// Glisser index 2 (pos 0) en position 0 -> [0, 2, 1]
		await dragTile(wrapper, 2, 0);
		expect(wrapper.find('.order-validated-list').exists()).toBe(false);

		// Glisser index 2 (pos 1) en position 1 -> [0, 1, 2]
		await dragTile(wrapper, 2, 1);

		// Validation temps-réel immédiate : bascule vers .order-validated-list
		expect(wrapper.find('.order-validated-list').exists()).toBe(true);
		const rows = wrapper.findAll('.order-validated-row');
		expect(rows).toHaveLength(3);

		// Vérifier que les commentaires sont bien associés aux bonnes positions
		expect(rows[0].find('.order-comment-box').text()).toBe('1 : La Dame en f6 est mal placée.');
		expect(rows[1].find('.order-comment-box').text()).toBe('2 : Position équilibrée.');
		// La 3e position a un commentaire vide : pas de boîte de commentaire
		expect(rows[2].find('.order-comment-box').exists()).toBe(false);

		// Vérifier que le clic sur le bouton de fin émet 'success'
		const nextBtn = wrapper.find('.next-card-btn');
		expect(nextBtn.exists()).toBe(true);
		await nextBtn.trigger('click');
		expect(wrapper.emitted('success')).toBeTruthy();
	});

	test('garde la grille verrouillée sans zone de commentaire si aucun commentaire n’est défini', async () => {
		const configNoComments: ExerciseType11Config = {
			type: 11,
			positions: [
				{ fen: sampleConfig.positions[0].fen, couleur_joueur: 'white', shapes: [] },
				{ fen: sampleConfig.positions[1].fen, couleur_joueur: 'black', shapes: [] },
			],
		};
		const wrapper = mountComponent(configNoComments);

		// Ordre inversé [1, 0] -> glisser index 1 en position 0 -> [0, 1]
		await dragTile(wrapper, 1, 0);

		expect(wrapper.find('.order-validated-list').exists()).toBe(false);
		expect(wrapper.find('.learning-board-grid-2col').exists()).toBe(true);
		const cards = wrapper.findAll('.learning-board-card');
		expect(cards[0].classes()).toContain('is-valid');
		expect(cards[0].classes()).toContain('is-disabled');
	});
});
