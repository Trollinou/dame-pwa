import { describe, it, expect } from 'vitest';
import { parseWpContent } from '@/utils/parsers/wpContentParser';
import type { EgMediaContext } from '@/types/egMedia';

describe( 'wpContentParser', () => {
	it( "devrait renvoyer un bloc HTML simple si aucune galerie eg-media n'est présente", () => {
		const raw = '<p>Un simple paragraphe.</p>';
		const blocks = parseWpContent( raw );
		expect( blocks ).toHaveLength( 1 );
		expect( blocks[ 0 ] ).toEqual( {
			type: 'html',
			content: '<p>Un simple paragraphe.</p>',
		} );
	} );

	it( 'devrait extraire le bloc eg-media et préserver le texte avant et après', () => {
		const raw = `
			<p>Introduction à l'article.</p>
			<div class="eg-viewer eg-viewer--layout-justified wp-block-eg-media-viewer" data-wp-interactive="eg-media/viewer" data-wp-context="{&quot;currentIndex&quot;:0,&quot;layout&quot;:&quot;justified&quot;,&quot;images&quot;:[{&quot;id&quot;:1,&quot;index&quot;:0,&quot;thumbSrc&quot;:&quot;thumb.jpg&quot;,&quot;fullSrc&quot;:&quot;full.jpg&quot;,&quot;alt&quot;:&quot;Photo 1&quot;,&quot;width&quot;:800,&quot;height&quot;:600}]}">
				<div class="eg-viewer__justified-grid"></div>
			</div>
			<p>Conclusion de l'article.</p>
		`;

		const blocks = parseWpContent( raw );
		expect( blocks ).toHaveLength( 3 );
		expect( blocks[ 0 ].type ).toBe( 'html' );
		expect( ( blocks[ 0 ] as { content: string } ).content ).toContain(
			"Introduction à l'article."
		);

		expect( blocks[ 1 ].type ).toBe( 'eg-media' );
		const mediaBlock = blocks[ 1 ] as {
			type: 'eg-media';
			context: EgMediaContext;
		};
		expect( mediaBlock.context.layout ).toBe( 'justified' );
		expect( mediaBlock.context.images ).toHaveLength( 1 );
		expect( mediaBlock.context.images[ 0 ].fullSrc ).toBe( 'full.jpg' );

		expect( blocks[ 2 ].type ).toBe( 'html' );
		expect( ( blocks[ 2 ] as { content: string } ).content ).toContain(
			"Conclusion de l'article."
		);
	} );

	it( 'devrait extraire le bloc eg-media au format data-images-json', () => {
		const raw = `
			<p>Tournoi Test.</p>
			<div class="eg-viewer eg-viewer--layout-justified wp-block-eg-media-viewer" data-slideshow="false" data-tempo="3000" data-layout="justified" data-limit="50" data-images-json="[{&quot;index&quot;:0,&quot;thumbSrc&quot;:&quot;thumb.jpg&quot;,&quot;fullSrc&quot;:&quot;full.jpg&quot;,&quot;alt&quot;:&quot;Test Photo&quot;,&quot;width&quot;:1008,&quot;height&quot;:670}]">
				<div class="eg-viewer__justified-grid"></div>
			</div>
		`;
		const blocks = parseWpContent( raw );
		expect( blocks ).toHaveLength( 2 );
		expect( blocks[ 1 ].type ).toBe( 'eg-media' );
		const mediaBlock = blocks[ 1 ] as {
			type: 'eg-media';
			context: EgMediaContext;
		};
		expect( mediaBlock.context.layout ).toBe( 'justified' );
		expect( mediaBlock.context.images ).toHaveLength( 1 );
		expect( mediaBlock.context.images[ 0 ].alt ).toBe( 'Test Photo' );
	} );
} );
