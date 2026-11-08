import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoachLegendModal from '@/components/learning/play/CoachLegendModal.vue';

describe( 'CoachLegendModal.vue', () => {
	it( 'renders all move judgements and tactical glyphs when open', () => {
		const wrapper = mount( CoachLegendModal, {
			props: {
				isOpen: true,
			},
			global: {
				stubs: {
					'ion-modal': {
						template: '<div class="ion-modal-stub"><slot /></div>',
					},
					'ion-header': {
						template: '<header><slot /></header>',
					},
					'ion-toolbar': {
						template: '<div><slot /><slot name="end" /></div>',
					},
					'ion-title': {
						template: '<h1><slot /></h1>',
					},
					'ion-buttons': {
						template: '<div class="buttons"><slot /></div>',
					},
					'ion-button': {
						template: '<button @click="$emit(\'click\')"><slot /></button>',
					},
					'ion-content': {
						template: '<main><slot /></main>',
					},
					'ion-list': {
						template: '<ul><slot /></ul>',
					},
					'ion-item': {
						template: '<li><slot name="start" /><slot /></li>',
					},
					'ion-label': {
						template: '<div><slot /></div>',
					},
				},
			},
		} );

		const text = wrapper.text();
		expect( text ).toContain( 'Légende du Coach' );
		expect( text ).toContain( 'Évaluation des coups' );
		expect( text ).toContain( 'Alertes & Motifs tactiques' );

		// Vérification des 7 niveaux de coups
		expect( text ).toContain( 'Coup brillant' );
		expect( text ).toContain( 'Bon coup / Coup validé' );
		expect( text ).toContain( 'Coup intéressant' );
		expect( text ).toContain( 'Imprécision' );
		expect( text ).toContain( 'Erreur' );
		expect( text ).toContain( 'Gaffe / Coup risqué' );
		expect( text ).toContain( 'Coup forcé' );

		// Vérification des motifs tactiques
		expect( text ).toContain( 'Clouage' );
		expect( text ).toContain( 'Pièce non défendue / En prise' );
		expect( text ).toContain( 'Menace d\'échec' );
		expect( text ).toContain( 'Pièce piégée' );

		// Vérification de la présence des SVG
		const svgs = wrapper.findAll( 'svg.coach-legend-svg' );
		expect( svgs.length ).toBe( 11 ); // 7 judgements + 4 tactics
	} );

	it( 'emits update:isOpen with false when close button is clicked', async () => {
		const wrapper = mount( CoachLegendModal, {
			props: {
				isOpen: true,
			},
			global: {
				stubs: {
					'ion-modal': {
						template: '<div><slot /></div>',
					},
					'ion-header': {
						template: '<header><slot /></header>',
					},
					'ion-toolbar': {
						template: '<div><slot /><slot name="end" /></div>',
					},
					'ion-title': {
						template: '<h1><slot /></h1>',
					},
					'ion-buttons': {
						template: '<div><slot /></div>',
					},
					'ion-button': {
						template: '<button class="close-btn" @click="$emit(\'click\')"><slot /></button>',
					},
					'ion-content': {
						template: '<main><slot /></main>',
					},
					'ion-list': {
						template: '<ul><slot /></ul>',
					},
					'ion-item': {
						template: '<li><slot name="start" /><slot /></li>',
					},
					'ion-label': {
						template: '<div><slot /></div>',
					},
				},
			},
		} );

		const closeBtn = wrapper.find( '.close-btn' );
		expect( closeBtn.exists() ).toBe( true );
		await closeBtn.trigger( 'click' );

		expect( wrapper.emitted( 'update:isOpen' ) ).toBeTruthy();
		expect( wrapper.emitted( 'update:isOpen' )?.[0] ).toEqual( [ false ] );
	} );
} );
