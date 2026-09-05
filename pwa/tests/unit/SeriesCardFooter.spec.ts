import { describe, expect, test, vi } from 'vitest';
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import SeriesCardFooter from '@/components/shared/SeriesCardFooter.vue';
import { EXERCISE_NAVIGATION_KEY } from '@/composables/useExerciseNavigation';

vi.mock( '@/composables/useCelebration', () => ( {
	fireExerciseCelebration: vi.fn(),
} ) );

describe( 'SeriesCardFooter.vue', () => {
	test( 'affiche le badge avec badgePrefix personnalisé', () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 2,
				totalCards: 4,
				isSolved: false,
				badgePrefix: 'Étape',
			},
		} );

		expect( wrapper.find( '.card-badge' ).text() ).toBe( 'Étape 2 / 4' );
	} );

	test( 'affiche le pendingHint lorsque isSolved est false', () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 1,
				totalCards: 3,
				isSolved: false,
				pendingHint: 'Trouvez la solution',
			},
		} );

		expect( wrapper.find( '.pending-hint' ).text() ).toBe(
			'Trouvez la solution'
		);
		expect( wrapper.find( '.next-card-btn' ).exists() ).toBe( false );
	} );

	test( 'affiche le bouton actif et émet next au clic lorsque isSolved est true et disabled est false', async () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 1,
				totalCards: 3,
				isSolved: true,
				disabled: false,
			},
		} );

		const btn = wrapper.find( '.next-card-btn' );
		expect( btn.exists() ).toBe( true );

		await btn.trigger( 'click' );
		expect( wrapper.emitted( 'next' ) ).toBeTruthy();
		expect( wrapper.emitted( 'next' )?.length ).toBe( 1 );
	} );

	test( 'n’émet pas next au clic lorsque disabled est true', async () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 1,
				totalCards: 3,
				isSolved: true,
				disabled: true,
			},
		} );

		const btn = wrapper.find( '.next-card-btn' );
		expect( btn.exists() ).toBe( true );

		await btn.trigger( 'click' );
		expect( wrapper.emitted( 'next' ) ).toBeFalsy();
	} );

	test( 'affiche le finishText sur la dernière carte quand exerciseNavigation n’est pas injecté', () => {
		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 3,
				totalCards: 3,
				isSolved: true,
				finishText: 'Terminer le défi',
			},
		} );

		expect( wrapper.find( '.card-badge' ).text() ).toBe( 'Carte 3 / 3' );
		expect( wrapper.find( '.next-card-btn' ).text() ).toBe(
			'Terminer le défi'
		);
		expect( wrapper.find( '.footer-course-btn' ).exists() ).toBe( false );
	} );

	test( 'affiche les boutons de fin d’exercice et navigue quand exerciseNavigation est injecté', async () => {
		vi.useFakeTimers();
		const onNextMock = vi.fn();
		const onCourseMock = vi.fn();

		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 3,
				totalCards: 3,
				isSolved: true,
			},
			global: {
				provide: {
					[ EXERCISE_NAVIGATION_KEY as symbol ]: {
						hasNext: computed( () => true ),
						nextLabel: computed( () => 'Exercice suivant' ),
						hasCourse: computed( () => true ),
						courseUrl: computed( () => '/cours/42' ),
						onNext: onNextMock,
						onCourse: onCourseMock,
					},
				},
			},
		} );

		// Vérification du feedback de succès par défaut
		expect( wrapper.find( '.feedback-message' ).text() ).toBe(
			'🎉 Exercice réussi !'
		);

		// Pendant la temporisation : le badge immédiat est présent
		expect( wrapper.find( '.success-resolu-badge' ).text() ).toContain(
			'🎉 Exercice réussi !'
		);
		expect( wrapper.find( '.footer-course-btn' ).exists() ).toBe( false );

		// Avance de la temporisation de 2,2 secondes
		vi.advanceTimersByTime( 2200 );
		await wrapper.vm.$nextTick();

		// Bouton Retour au cours
		const courseBtn = wrapper.find( '.footer-course-btn' );
		expect( courseBtn.exists() ).toBe( true );
		await courseBtn.trigger( 'click' );
		expect( onCourseMock ).toHaveBeenCalledTimes( 1 );

		// Bouton Exercice suivant
		const nextBtn = wrapper.find( '.next-exercise-btn' );
		expect( nextBtn.exists() ).toBe( true );
		expect( nextBtn.text() ).toContain( 'Exercice suivant' );

		await nextBtn.trigger( 'click' );
		expect( onNextMock ).toHaveBeenCalledTimes( 1 );
		expect( wrapper.emitted( 'next' ) ).toBeTruthy();

		vi.useRealTimers();
	} );

	test( 'n’active pas la complétion finale (Exercice réussi) si disabled est true sur la dernière carte', async () => {
		const onNextMock = vi.fn();
		const onCourseMock = vi.fn();

		const wrapper = mount( SeriesCardFooter, {
			props: {
				currentCard: 3,
				totalCards: 3,
				isSolved: true,
				disabled: true,
				disabledHint: 'Visionnez tous les coups pour continuer',
			},
			global: {
				provide: {
					[ EXERCISE_NAVIGATION_KEY as symbol ]: {
						hasNext: computed( () => true ),
						nextLabel: computed( () => 'Exercice suivant' ),
						hasCourse: computed( () => true ),
						courseUrl: computed( () => '/cours/42' ),
						onNext: onNextMock,
						onCourse: onCourseMock,
					},
				},
			},
		} );

		// Pas de badge de célébration immédiate
		expect( wrapper.find( '.success-resolu-badge' ).exists() ).toBe(
			false
		);

		// Le bouton reste en mode standard désactivé
		const nextBtn = wrapper.findComponent( { name: 'IonButton' } );
		expect( nextBtn.exists() ).toBe( true );
		expect( nextBtn.props( 'disabled' ) ).toBe( true );

		await nextBtn.trigger( 'click' );
		expect( wrapper.emitted( 'next' ) ).toBeFalsy();

		// Passage de disabled à false
		await wrapper.setProps( { disabled: false } );

		// Maintenant le badge de succès est actif
		expect( wrapper.find( '.success-resolu-badge' ).exists() ).toBe( true );
		expect( wrapper.find( '.success-resolu-badge' ).text() ).toContain(
			'🎉 Exercice réussi !'
		);
	} );

	test( 'se téléporte dans exerciseFooterPortal lorsqu’il est fourni via provide', async () => {
		const targetDiv = document.createElement( 'div' );
		targetDiv.id = 'test-portal-target';
		document.body.appendChild( targetDiv );

		const portalRef = computed( () => targetDiv );

		mount( SeriesCardFooter, {
			props: {
				currentCard: 1,
				totalCards: 2,
				isSolved: false,
			},
			global: {
				provide: {
					exerciseFooterPortal: portalRef,
				},
			},
		} );

		expect(
			targetDiv.querySelector( '.series-card-footer-container' )
		).not.toBeNull();
		expect(
			targetDiv.querySelector( '.card-badge' )?.textContent
		).toContain( 'Carte 1 / 2' );

		document.body.removeChild( targetDiv );
	} );
} );
