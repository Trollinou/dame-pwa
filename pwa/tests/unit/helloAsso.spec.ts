import { describe, it, expect } from 'vitest';
import { transformHelloAssoContent } from '@/utils/helloAsso';

describe( 'transformHelloAssoContent', () => {
	it( 'returns empty string when input is empty or null', () => {
		expect( transformHelloAssoContent( '' ) ).toBe( '' );
		expect( transformHelloAssoContent( null as unknown as string ) ).toBe(
			''
		);
	} );

	it( 'transforms HelloAsso iframes from WordPress plugin into ion-button and strips /widget-bouton', () => {
		const input = `
<div class="wp-block-brad-border-box">			<iframe
				id="idIframe"
				src="https://www.helloasso.com/associations/echiquier-ledonien/evenements/stage-octobre-2026/widget-bouton"
				height=70px"				width=200px"				frameborder="0"
				loading="lazy"
				allowtransparency="true"
				onload="resizeIframeMessage()"></iframe>
</div>`;

		const result = transformHelloAssoContent( input );
		expect( result ).not.toContain( '<iframe' );
		expect( result ).toContain( '<ion-button' );
		expect( result ).toContain(
			'href="https://www.helloasso.com/associations/echiquier-ledonien/evenements/stage-octobre-2026/"'
		);
		expect( result ).toContain( "S'inscrire à l'événement" );
	} );

	it( 'transforms HelloAsso shortcodes with regular quotes', () => {
		const input =
			'[helloasso campaign="https://www.helloasso.com/associations/echiquier-ledonien/evenements/tournoi-2026/" type="widget-bouton" height="70px"]';
		const result = transformHelloAssoContent( input );
		expect( result ).toContain( '<ion-button' );
		expect( result ).toContain(
			'href="https://www.helloasso.com/associations/echiquier-ledonien/evenements/tournoi-2026/"'
		);
	} );

	it( 'transforms HelloAsso shortcodes with html entities and curly quotes', () => {
		const inputEntity =
			'[helloasso campaign=&quot;https://www.helloasso.com/associations/test/evenements/stage/&quot;]';
		expect( transformHelloAssoContent( inputEntity ) ).toContain(
			'href="https://www.helloasso.com/associations/test/evenements/stage/"'
		);

		const inputCurly =
			'[helloasso campaign=“https://www.helloasso.com/associations/test/evenements/stage/”]';
		expect( transformHelloAssoContent( inputCurly ) ).toContain(
			'href="https://www.helloasso.com/associations/test/evenements/stage/"'
		);
	} );

	it( 'preserves standard HTML when no HelloAsso tags are present', () => {
		const html = '<p>Bienvenue sur notre site de tournois !</p>';
		expect( transformHelloAssoContent( html ) ).toBe( html );
	} );
} );
