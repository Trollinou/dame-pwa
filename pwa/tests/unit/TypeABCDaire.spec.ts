import { describe, expect, test, vi, beforeEach } from 'vitest';
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypeABCDaire from '@/views/types/TypeABCDaire.vue';
import { EXERCISE_NAVIGATION_KEY } from '@/composables/useExerciseNavigation';

// Mock eg-chessboard
vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'EgChessboard',
		props: [
			'diagram',
			'boardConfig',
			'playerColor',
			'mode',
			'stockfishConfig',
			'pieceSet',
			'boardTheme',
		],
		emits: [ 'move', 'board-created', 'square-click' ],
		template: `
      <div class="mock-eg-chessboard">
        <span class="mock-fen">{{ diagram ? diagram.fen : '' }}</span>
        <button
          class="mock-move-btn"
          @click="$emit('move', { san: 'Qxg7#', from: 'h6', to: 'g7', lan: 'h6g7' })"
        >
          Play Qxg7#
        </button>
        <button
          class="mock-wrong-move-btn"
          @click="$emit('move', { san: 'Nf3', from: 'g1', to: 'f3', lan: 'g1f3' })"
        >
          Play Nf3
        </button>
      </div>
    `,
	},
} ) );

describe( 'TypeABCDaire.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	const sampleLichessPgn = `[Event "EA_Matérialité_TerminerUnePartie: EA_Niv1_M_TD-1_ABCDéaire Tactique"]
[Date "2023.07.24"]
[Result "*"]
[Variant "Standard"]
[ECO "?"]
[Opening "?"]
[StudyName "EA_Matérialité_TerminerUnePartie"]
[ChapterName "EA_Niv1_M_TD-1_ABCDéaire Tactique"]
[ChapterURL "https://lichess.org/study/LUloXCQ6/WHzyVbTh"]
[Annotator "https://lichess.org/@/EchiquierLedonien1"]
[FEN "r4rk1/ppp2ppp/3qpn1Q/3p4/3P4/3B2RP/PPP2PP1/R5K1 w - - 0 1"]
[SetUp "1"]
[UTCDate "2023.07.24"]
[UTCTime "13:36:41"]

{ [%csl Bh6,Bg7][%cal Rg7g8,Bh6g7,Gg3g7] }
1. Qxg7# *`;

	const sampleConfig = {
		consigne: 'Trouver le meilleur coup.',
		exercices: [
			{ pgn: sampleLichessPgn },
			{ pgn: sampleLichessPgn },
			{ pgn: sampleLichessPgn },
			{ pgn: sampleLichessPgn },
		],
		metaTitre: 'Exercice ABCDaire 1',
		metaTypeLabel: 'ABCDaire Tactique',
		metaChapitreNiveauLabel: 'Mat en 1 - Débutant',
	};

	test( 'affiche correctement l’en-tête et le badge Carte 1 / 4', () => {
		const wrapper = mount( TypeABCDaire, {
			props: {
				config: sampleConfig,
				id: 42,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Exercice ABCDaire 1' );
		expect( wrapper.text() ).toContain( 'Trouver le meilleur coup.' );
		expect( wrapper.text() ).toContain( 'Carte 1 / 4' );
	} );

	test( 'gère la validation d’un coup correct et le passage au mode récapitulatif', async () => {
		const wrapper = mount( TypeABCDaire, {
			props: {
				config: sampleConfig,
				id: 42,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		const moveBtn = wrapper.find( '.mock-move-btn' );
		expect( moveBtn.exists() ).toBe( true );

		// Déclencher le coup attendu (Qxg7#)
		await moveBtn.trigger( 'click' );

		// Vérifier la présence du feedback intermédiaire (coup correct mais PGN non terminé)
		expect( wrapper.text() ).toContain( 'Bravo ! Coup correct.' );

		// Le bouton "Carte suivante" est affiché mais DÉSACTIVÉ tant que le PGN n'a pas été lu jusqu'au bout
		const footer = wrapper.findComponent( { name: 'SeriesCardFooter' } );
		expect( footer.exists() ).toBe( true );
		expect( footer.props( 'disabled' ) ).toBe( true );

		// Simuler la fin de la lecture du PGN par le composant PgnViewer
		const pgnViewer = wrapper.findComponent( { name: 'PgnViewer' } );
		expect( pgnViewer.exists() ).toBe( true );
		pgnViewer.vm.$emit( 'finished' );
		await wrapper.vm.$nextTick();

		// Le footer n'est plus désactivé et le feedback indique la réussite
		expect( footer.props( 'disabled' ) ).toBe( false );
		expect( wrapper.text() ).toContain( 'Bravo ! Exercice réussi.' );

		// Vérifier que le bouton Fin n'est pas présent dans le PgnViewer du mode récapitulatif
		const finBtn = wrapper.find( 'ion-button[title="Fin"]' );
		expect( finBtn.exists() ).toBe( false );
	} );

	test( 'gère le format de rétrocompatibilité (fen + solution)', async () => {
		const legacyConfig = {
			fen: 'r4rk1/ppp2ppp/3qpn1Q/3p4/3P4/3B2RP/PPP2PP1/R5K1 w - - 0 1',
			solution: [ 'Qxg7#' ],
			couleur_joueur: 'white' as const,
			consigne: 'Trouver le meilleur coup.',
		};

		const wrapper = mount( TypeABCDaire, {
			props: {
				config: legacyConfig,
				id: 43,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		expect( wrapper.text() ).toContain( 'Trouver le meilleur coup.' );
		expect( wrapper.text() ).toContain( 'Carte 1 / 1' );
	} );

	test( 'sur la dernière carte, la victoire n’est fêtée qu’à la fin du PGN et pas dès le coup tactique', async () => {
		const singleCardConfig = {
			consigne: 'Trouver le meilleur coup.',
			exercices: [ { pgn: sampleLichessPgn } ],
			metaTitre: 'Exercice ABCDaire Final',
			metaTypeLabel: 'ABCDaire Tactique',
			metaChapitreNiveauLabel: 'Niveau 1',
		};

		const wrapper = mount( TypeABCDaire, {
			props: {
				config: singleCardConfig,
				id: 45,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
				provide: {
					[ EXERCISE_NAVIGATION_KEY as symbol ]: {
						hasNext: computed( () => false ),
						nextLabel: computed( () => 'Terminer le cours' ),
						hasCourse: computed( () => true ),
						courseUrl: computed( () => '/cours/1' ),
						onNext: vi.fn(),
						onCourse: vi.fn(),
					},
				},
			},
		} );

		// 1. Phase de jeu : jouer le bon coup
		const moveBtn = wrapper.find( '.mock-move-btn' );
		await moveBtn.trigger( 'click' );

		// VÉRIFICATION : le mode recap s'affiche mais la victoire N'EST PAS encore fêtée car le PGN n'est pas fini
		expect( wrapper.text() ).toContain( 'Bravo ! Coup correct.' );
		expect( wrapper.find( '.success-resolu-badge' ).exists() ).toBe(
			false
		);

		// 2. Finir le visionnage du PGN
		const pgnViewer = wrapper.findComponent( { name: 'PgnViewer' } );
		expect( pgnViewer.exists() ).toBe( true );
		pgnViewer.vm.$emit( 'finished' );
		await wrapper.vm.$nextTick();

		// VÉRIFICATION : maintenant la victoire est fêtée !
		expect( wrapper.find( '.success-resolu-badge' ).exists() ).toBe( true );
		expect( wrapper.find( '.success-resolu-badge' ).text() ).toContain(
			'🎉 Exercice réussi !'
		);
	} );
} );
