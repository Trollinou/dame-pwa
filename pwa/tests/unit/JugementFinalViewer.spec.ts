import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import JugementFinalViewer from '@/components/learning/viewers/JugementFinalViewer.vue';

vi.mock('@/composables/core/useFeedback', () => ({
  useFeedback: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}));

vi.mock('@/composables/learning/useExerciseHeader', () => ({
  useExerciseHeader: () => ({
    setHeaderState: vi.fn()
  })
}));

describe('JugementFinalViewer.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('synchronise le démarrage et les boucles de tous les scénarios même avec un nombre de coups différent', async () => {
    const spyApis: Array<{ move: ReturnType<typeof vi.fn>; setPosition: ReturnType<typeof vi.fn> }> = [];

    const ChessboardStub = defineComponent({
      name: 'Chessboard',
      emits: ['board-created'],
      mounted() {
        const api = {
          move: vi.fn(),
          setPosition: vi.fn()
        };
        spyApis.push(api);
        this.$emit('board-created', api);
      },
      template: '<div class="mock-chessboard"></div>'
    });

    const wrapper = mount(JugementFinalViewer, {
      props: {
        fenDepart: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        couleurJoueur: 'white',
        scenarios: [
          { pgn: '1. e4', is_correct: false },
          { pgn: '1. d4 d5 2. c4', is_correct: true },
          { pgn: '1. Nf3 Nf6', is_correct: false }
        ]
      },
      global: {
        stubs: {
          Chessboard: ChessboardStub,
          PgnViewer: true,
          SeriesCardFooter: true
        }
      }
    });

    await flushPromises();

    // 1 échiquier principal + 3 échiquiers scénarios
    expect(spyApis).toHaveLength(4);
    const [, plan1, plan2, plan3] = spyApis;

    // À t = 0 : chaque scénario a reçu sa position initiale (1 appel à mount + 1 reset synchrone)
    const initialSetPos1 = plan1.setPosition.mock.calls.length;
    const initialSetPos2 = plan2.setPosition.mock.calls.length;
    const initialSetPos3 = plan3.setPosition.mock.calls.length;

    // t = 1000ms : les 3 échiquiers jouent leur 1er coup ensemble
    await vi.advanceTimersByTimeAsync(1000);
    expect(plan1.move).toHaveBeenCalledTimes(1);
    expect(plan1.move).toHaveBeenLastCalledWith('e4');
    expect(plan2.move).toHaveBeenCalledTimes(1);
    expect(plan2.move).toHaveBeenLastCalledWith('d4');
    expect(plan3.move).toHaveBeenCalledTimes(1);
    expect(plan3.move).toHaveBeenLastCalledWith('Nf3');

    // t = 2000ms : Plan 1 (1 coup) attend ; Plan 2 et Plan 3 jouent leur 2e coup
    await vi.advanceTimersByTimeAsync(1000);
    expect(plan1.move).toHaveBeenCalledTimes(1);
    expect(plan2.move).toHaveBeenCalledTimes(2);
    expect(plan2.move).toHaveBeenLastCalledWith('d5');
    expect(plan3.move).toHaveBeenCalledTimes(2);
    expect(plan3.move).toHaveBeenLastCalledWith('Nf6');

    // t = 3000ms : Plan 1 et Plan 3 attendent ; Plan 2 joue son 3e coup
    await vi.advanceTimersByTimeAsync(1000);
    expect(plan1.move).toHaveBeenCalledTimes(1);
    expect(plan2.move).toHaveBeenCalledTimes(3);
    expect(plan2.move).toHaveBeenLastCalledWith('c4');
    expect(plan3.move).toHaveBeenCalledTimes(2);

    // Pendant la pause de 2500ms (ex. +2000ms -> t = 5000ms), aucun échiquier ne redémarre
    await vi.advanceTimersByTimeAsync(2000);
    expect(plan1.setPosition).toHaveBeenCalledTimes(initialSetPos1);
    expect(plan2.setPosition).toHaveBeenCalledTimes(initialSetPos2);
    expect(plan3.setPosition).toHaveBeenCalledTimes(initialSetPos3);

    // À t = 5500ms (+500ms) : tous les échiquiers se réinitialisent simultanément
    await vi.advanceTimersByTimeAsync(500);
    expect(plan1.setPosition).toHaveBeenCalledTimes(initialSetPos1 + 1);
    expect(plan2.setPosition).toHaveBeenCalledTimes(initialSetPos2 + 1);
    expect(plan3.setPosition).toHaveBeenCalledTimes(initialSetPos3 + 1);

    // À t = 6500ms (+1000ms) : les 3 échiquiers rejouent leur 1er coup de la 2e itération en même temps
    await vi.advanceTimersByTimeAsync(1000);
    expect(plan1.move).toHaveBeenCalledTimes(2);
    expect(plan1.move).toHaveBeenLastCalledWith('e4');
    expect(plan2.move).toHaveBeenCalledTimes(4);
    expect(plan2.move).toHaveBeenLastCalledWith('d4');
    expect(plan3.move).toHaveBeenCalledTimes(3);
    expect(plan3.move).toHaveBeenLastCalledWith('Nf3');

    wrapper.unmount();
  });

  test('verrouille la validation et les fireworks jusqu’à la fin de la visualisation du PGN', async () => {
    const ChessboardStub = defineComponent({
      name: 'Chessboard',
      emits: ['board-created'],
      mounted() {
        this.$emit('board-created', { move: vi.fn(), setPosition: vi.fn() });
      },
      template: '<div class="mock-chessboard"></div>'
    });

    const PgnViewerStub = defineComponent({
      name: 'PgnViewer',
      emits: ['finished'],
      template: '<div class="mock-pgn-viewer"></div>'
    });

    const SeriesCardFooterStub = defineComponent({
      name: 'SeriesCardFooter',
      props: ['currentCard', 'totalCards', 'isSolved', 'disabled'],
      emits: ['next'],
      template: '<div class="mock-footer"></div>'
    });

    const wrapper = mount(JugementFinalViewer, {
      props: {
        fenDepart: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        couleurJoueur: 'white',
        pgnExplication: '1. d4 d5 2. c4',
        scenarios: [
          { pgn: '1. e4', is_correct: false },
          { pgn: '1. d4 d5 2. c4', is_correct: true },
          { pgn: '1. Nf3 Nf6', is_correct: false }
        ]
      },
      global: {
        stubs: {
          Chessboard: ChessboardStub,
          PgnViewer: PgnViewerStub,
          SeriesCardFooter: SeriesCardFooterStub
        }
      }
    });

    await flushPromises();

    // Avant le choix du bon plan : étape 1, non résolu
    const footerBefore = wrapper.findComponent(SeriesCardFooterStub);
    expect(footerBefore.props('currentCard')).toBe(1);
    expect(footerBefore.props('isSolved')).toBe(false);

    // Clic sur le bon scénario (Plan 2)
    const cards = wrapper.findAll('.scenario-card');
    await cards[1].trigger('click');
    await flushPromises();

    // En phase explication : le PGN n'est pas encore terminé -> footer désactivé, pas de succès émis
    const pgnViewer = wrapper.findComponent(PgnViewerStub);
    expect(pgnViewer.exists()).toBe(true);
    expect(footerBefore.props('currentCard')).toBe(2);
    expect(footerBefore.props('isSolved')).toBe(true);
    expect(footerBefore.props('disabled')).toBe(true);
    expect(wrapper.emitted('success')).toBeUndefined();

    // Fin de visualisation du PGN -> débloque le footer (validation + fireworks)
    pgnViewer.vm.$emit('finished');
    await flushPromises();

    expect(footerBefore.props('disabled')).toBe(false);
    expect(wrapper.emitted('success')).toBeUndefined();

    wrapper.unmount();
  });
});
