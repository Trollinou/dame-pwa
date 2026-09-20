import { describe, expect, test, vi, beforeEach } from 'vitest';
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/queryClient';
import TypePosiPlan from '@/views/types/TypePosiPlan.vue';
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

describe( 'TypePosiPlan.vue', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		fireCelebrationMock.mockClear();
	} );

	const samplePgn = `[Event "EA_Activité_CavalierAuCentre: EA_Niv1_A_PA_Posi’plan"]
[FEN "r5k1/2qr1ppp/3p1b2/1p2p3/pPp1P3/P4P2/2P2QPP/2NRR1K1 w - - 0 12"]
[SetUp "1"]

{ [%cal Gc2c3,Rd1d5,Yc1e2] }
12. Ne2 { Le Bon coup ! } (12. Rd5 { Variante Tour } 12... Bd8 13. Red1 Qc6) (12. c3 { Variante Pion } 12... d5) 12... Rad8 13. Nc3 (13. Ng3 { Mauvaise case }) 13... Qc6 14. Nd5 { Bravo pour le plan ! } *`;

	const sampleConfig = {
		consigne: 'Évaluez la position et choisissez le meilleur plan.',
		pgn: samplePgn,
		metaTitre: 'PosiPlan Test',
		metaTypeLabel: "Posi'Plan",
		metaChapitreNiveauLabel: 'Niveau 1',
	};

	test( 'affiche ContentHeader et SeriesCardFooter avec le choix initial à 3 branches', () => {
		const wrapper = mount( TypePosiPlan, {
			props: {
				config: sampleConfig,
				id: 55,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		// Vérifie l'en-tête ContentHeader
		expect( wrapper.text() ).toContain( 'PosiPlan Test' );
		expect( wrapper.text() ).toContain( 'Étape 1 / 4' );

		// Vérifie la présence des 3 boutons de choix initial
		const choiceBtns = wrapper.findAll( '.choice-btn' );
		expect( choiceBtns ).toHaveLength( 3 );

		// Vérifie SeriesCardFooter
		const footer = wrapper.findComponent( { name: 'SeriesCardFooter' } );
		expect( footer.exists() ).toBe( true );
		expect( footer.props( 'isSolved' ) ).toBe( false );
	} );

	test( 'permet d’explorer une variante puis de revenir au choix initial', async () => {
		const wrapper = mount( TypePosiPlan, {
			props: {
				config: sampleConfig,
				id: 55,
			},
			global: {
				plugins: [ createPinia(), [ VueQueryPlugin, { queryClient } ] ],
			},
		} );

		// Clic sur la variante Rd5 (Td5 en français)
		const choiceBtns = wrapper.findAll( '.choice-btn' );
		const variantBtn = choiceBtns.find(
			( b ) => b.text().includes( 'Td5' ) || b.text().includes( 'Rd5' )
		);
		expect( variantBtn ).toBeDefined();

		await variantBtn!.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// On est maintenant en mode variante
		expect( wrapper.text() ).toContain( 'Variante alternative' );
		const prevBtn = wrapper.find( 'ion-button[title="Précédent"]' );
		const nextBtn = wrapper.find( 'ion-button[title="Suivant"]' );
		expect( prevBtn.exists() ).toBe( true );
		expect( nextBtn.exists() ).toBe( true );

		// Clic sur le bouton de retour au choix initial
		const returnBtn = wrapper.find( '.return-btn' );
		expect( returnBtn.exists() ).toBe( true );
		await returnBtn.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// On est revenu au choix initial
		expect( wrapper.text() ).toContain( 'Trouve le bon plan' );
		expect( wrapper.findAll( '.choice-btn' ) ).toHaveLength( 3 );
	} );

	test( 'sélectionner le bon plan valide le choix initial et permet d’avancer sur la branche principale', async () => {
		const wrapper = mount( TypePosiPlan, {
			props: {
				config: sampleConfig,
				id: 55,
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

		// Clic sur le bon coup initial (Ce2 en français)
		const choiceBtns = wrapper.findAll( '.choice-btn' );
		const correctBtn = choiceBtns.find(
			( b ) => b.text().includes( 'Ce2' ) || b.text().includes( 'Ne2' )
		);
		expect( correctBtn ).toBeDefined();

		await correctBtn!.trigger( 'click' );
		await wrapper.vm.$nextTick();

		// SeriesCardFooter doit être résolu
		const footer = wrapper.findComponent( { name: 'SeriesCardFooter' } );
		expect( footer.props( 'isSolved' ) ).toBe( true );
		expect( footer.props( 'feedback' )?.type ).toBe( 'success' );

		// Avancer vers l'étape suivante (PGN de réponse adverse 12... Rad8)
		const nextCardBtn = wrapper.find( '.next-card-btn' );
		await nextCardBtn.trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( wrapper.text() ).toContain( 'Étape 2 / 4' );
	} );

	test( 'parcours complet de l’exercice avec validation successive et émission de success à la fin', async () => {
		const wrapper = mount( TypePosiPlan, {
			props: {
				config: sampleConfig,
				id: 55,
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

		// 1. Choix initial (Ce2)
		const correctInitialBtn = wrapper
			.findAll( '.choice-btn' )
			.find(
				( b ) =>
					b.text().includes( 'Ce2' ) || b.text().includes( 'Ne2' )
			);
		await correctInitialBtn!.trigger( 'click' );
		await wrapper.vm.$nextTick();

		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		// 2. Étape 2 : PGN (12... Rad8)
		expect( wrapper.text() ).toContain( 'Étape 2 / 4' );
		const nextPgnBtn = wrapper.find( 'ion-button[title="Suivant"]' );
		await nextPgnBtn.trigger( 'click' );
		await wrapper.vm.$nextTick();

		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		// 3. Étape 3 : QCM coup 13 (Nc3 / Cc3)
		expect( wrapper.text() ).toContain( 'Étape 3 / 4' );
		const qcmBtns = wrapper.findAll( '.choice-btn' );
		const wrongBtn = qcmBtns.find(
			( b ) => b.text().includes( 'Cg3' ) || b.text().includes( 'Ng3' )
		);
		if ( wrongBtn ) {
			await wrongBtn.trigger( 'click' );
			await wrapper.vm.$nextTick();
			const footer = wrapper.findComponent( {
				name: 'SeriesCardFooter',
			} );
			expect( footer.props( 'feedback' )?.type ).toBe( 'danger' );
		}

		const correctQcmBtn = wrapper
			.findAll( '.choice-btn' )
			.find(
				( b ) =>
					b.text().includes( 'Cc3' ) || b.text().includes( 'Nc3' )
			);
		await correctQcmBtn!.trigger( 'click' );
		await wrapper.vm.$nextTick();

		await wrapper.find( '.next-card-btn' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		// 4. Étape 4 : PGN (13... Qc6 et 14. Nd5)
		expect( wrapper.text() ).toContain( 'Étape 4 / 4' );
		const nextBtnFinal1 = wrapper.find( 'ion-button[title="Suivant"]' );
		await nextBtnFinal1.trigger( 'click' ); // Coup 1 : 13... Qc6
		await wrapper.vm.$nextTick();

		const nextBtnFinal2 = wrapper.find( 'ion-button[title="Suivant"]' );
		await nextBtnFinal2.trigger( 'click' ); // Coup 2 : 14. Nd5 (fin du PGN)
		await wrapper.vm.$nextTick();

		// Validation finale
		expect( wrapper.emitted( 'success' ) ).toBeTruthy();
	} );
} );
