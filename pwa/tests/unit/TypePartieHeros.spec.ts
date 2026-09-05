import { describe, expect, test, vi, beforeEach } from 'vitest';
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypePartieHeros from '@/views/types/TypePartieHeros.vue';
import { EXERCISE_NAVIGATION_KEY } from '@/composables/useExerciseNavigation';

const fireCelebrationMock = vi.fn();
vi.mock( '@/composables/useCelebration', () => ( {
	fireExerciseCelebration: () => fireCelebrationMock(),
} ) );

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
      </div>
    `,
	},
} ) );

describe( 'TypePartieHeros.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		fireCelebrationMock.mockClear();
	} );

	const samplePgn = `[Event "Partie Héros Demo"]
[FEN "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"]
[SetUp "1"]

{ Position de départ }
1. Bb5 a6 (1... Nf6 2. O-O { Berlin }) 2. Ba4 Nf6 *`;

	const sampleConfig = {
		consigne: 'Revivez la partie du héros et trouvez le bon coup.',
		pgn: samplePgn,
		metaTitre: 'Partie Héros Test',
		metaTypeLabel: 'Partie du Héros',
		metaChapitreNiveauLabel: 'Niveau 1',
	};

	test( 'affiche les contrôles de navigation PGN sans le bouton Fin', () => {
		const wrapper = mount( TypePartieHeros, {
			props: {
				config: sampleConfig,
				id: 44,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		// Vérifie l'en-tête
		expect( wrapper.text() ).toContain( 'Partie Héros Test' );

		// Vérifie la présence des boutons Début, Précédent, Suivant
		const debutBtn = wrapper.find( 'ion-button[title="Début"]' );
		const prevBtn = wrapper.find( 'ion-button[title="Précédent"]' );
		const nextBtn = wrapper.find( 'ion-button[title="Suivant"]' );
		const finBtn = wrapper.find( 'ion-button[title="Fin"]' );

		expect( debutBtn.exists() ).toBe( true );
		expect( prevBtn.exists() ).toBe( true );
		expect( nextBtn.exists() ).toBe( true );
		expect( finBtn.exists() ).toBe( false );
	} );

	test( 'le PGN final ne passe pas en réussi dès la fin du QCM mais à la fin du PGN', async () => {
		const wrapper = mount( TypePartieHeros, {
			props: {
				config: sampleConfig,
				id: 44,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
				provide: {
					[ EXERCISE_NAVIGATION_KEY as symbol ]: {
						hasNext: computed( () => true ),
						nextLabel: computed( () => 'Exercice suivant' ),
						hasCourse: computed( () => true ),
						courseUrl: computed( () => '/cours/1' ),
						onNext: vi.fn(),
						onCourse: vi.fn(),
					},
				},
			},
		} );

		// Étape 1 : PGN (1. Bb5)
		expect( wrapper.text() ).toContain( 'Étape 1 / 3' );
		const footer = wrapper.findComponent( { name: 'SeriesCardFooter' } );
		expect( footer.exists() ).toBe( true );
		expect( footer.props( 'isSolved' ) ).toBe( false );

		// Visionner le coup 1. Bb5
		const nextPgnBtn = wrapper.find( 'ion-button[title="Suivant"]' );
		await nextPgnBtn.trigger( 'click' );
		expect( footer.props( 'isSolved' ) ).toBe( true );
		expect( fireCelebrationMock ).not.toHaveBeenCalled();

		// Passer à l'étape suivante (QCM)
		const nextStageBtn = wrapper.find( '.next-card-btn' );
		await nextStageBtn.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// Étape 2 : QCM (choix entre a6 et Cf6)
		expect( wrapper.text() ).toContain( 'Étape 2 / 3' );
		const qcmFooter = wrapper.findComponent( { name: 'SeriesCardFooter' } );
		expect( qcmFooter.props( 'isSolved' ) ).toBe( false );

		// Sélectionner le bon coup (a6)
		const choiceBtns = wrapper.findAll( '.choice-btn' );
		expect( choiceBtns.length ).toBeGreaterThanOrEqual( 2 );
		const correctBtn = choiceBtns.find(
			( btn ) => btn.text().trim() === 'a6'
		);
		expect( correctBtn ).toBeDefined();
		await correctBtn!.trigger( 'click' );
		expect( qcmFooter.props( 'isSolved' ) ).toBe( true );
		// Pas de célébration lors du succès du QCM
		expect( fireCelebrationMock ).not.toHaveBeenCalled();

		// Passer à l'étape suivante (PGN final)
		const toPgnFinalBtn = wrapper.find( '.next-card-btn' );
		await toPgnFinalBtn.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// Étape 3 : PGN final
		expect( wrapper.text() ).toContain( 'Étape 3 / 3' );
		const finalPgnFooter = wrapper.findComponent( {
			name: 'SeriesCardFooter',
		} );
		// VÉRIFICATION CLÉ : Le PGN final N'EST PAS résolu à son arrivée
		expect( finalPgnFooter.props( 'isSolved' ) ).toBe( false );
		expect( wrapper.text() ).not.toContain( '🎉 Exercice réussi !' );
		// VÉRIFICATION CLÉ : Aucune célébration n'a été déclenchée à l'arrivée sur le PGN final !
		expect( fireCelebrationMock ).not.toHaveBeenCalled();

		// Visionner les coups du PGN final (2. Fa4 puis 2... Cf6)
		const nextBtnFinal = wrapper.find( 'ion-button[title="Suivant"]' );
		await nextBtnFinal.trigger( 'click' ); // coup 1 du stage final
		expect( finalPgnFooter.props( 'isSolved' ) ).toBe( false );
		expect( fireCelebrationMock ).not.toHaveBeenCalled();

		await nextBtnFinal.trigger( 'click' ); // coup 2 (dernier coup du stage final)
		// Maintenant que tous les coups du PGN ont été visionnés, l'étape est résolue !
		expect( finalPgnFooter.props( 'isSolved' ) ).toBe( true );
		// VÉRIFICATION CLÉ : La célébration n'a eu lieu qu'une seule et unique fois, au terme du PGN !
		expect( fireCelebrationMock ).toHaveBeenCalledTimes( 1 );
	} );
} );
