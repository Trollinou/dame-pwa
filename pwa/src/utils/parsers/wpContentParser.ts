/**
 * Parseur pour le contenu des articles et pages WordPress.
 * Gère les formulaires de bénévolat, HelloAsso, et extrait les blocs de visionneuse eg-media.
 */

import type { ContentBlock, EgMediaContext } from '@/types/egMedia';
import { transformHelloAssoContent } from '@/utils/helloAsso';

/**
 * Analyse une chaîne HTML WordPress et la sépare en segments typés (HTML et galeries eg-media).
 *
 * @param rawHtml Contenu HTML brut fourni par l'API REST WordPress.
 * @return Tableau ordonné de blocs de contenu.
 */
export function parseWpContent( rawHtml: string ): ContentBlock[] {
	if ( ! rawHtml || typeof rawHtml !== 'string' ) {
		return [];
	}

	// 1. Transformation des formulaires HelloAsso
	let html = transformHelloAssoContent( rawHtml );

	// 2. Transformation des formulaires de bénévolat
	const surveyRegex =
		/<form[^>]+id="dame-benevolat-form-(\d+)"[^>]*>[\s\S]*?<\/form>/gi;
	html = html.replace( surveyRegex, ( _match: string, surveyId: string ) => {
		return `
      <div class="survey-action-container ion-padding ion-margin-vertical">
        <h3 class="survey-action-title">Bénévolat disponible</h3>
        <p class="survey-action-desc">Proposez votre aide directement depuis l'application.</p>
        <ion-button expand="block" color="secondary" class="internal-benevolat-btn" data-path="/tabs/benevolat/participation/${ surveyId }">
          Proposer mon aide
        </ion-button>
      </div>
    `;
	} );

	// Si pas d'environnement DOM disponible (fallback défensif)
	if ( typeof window === 'undefined' || typeof DOMParser === 'undefined' ) {
		return [ { type: 'html', content: html } ];
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString( html, 'text/html' );

	const viewers = Array.from(
		doc.querySelectorAll< HTMLElement >(
			'.wp-block-eg-media-viewer, .eg-viewer'
		)
	);

	if ( viewers.length === 0 ) {
		return [ { type: 'html', content: html } ];
	}

	const contexts: EgMediaContext[] = [];

	viewers.forEach( ( viewerEl, index ) => {
		let context: EgMediaContext | null = null;
		const contextAttr = viewerEl.getAttribute( 'data-wp-context' );
		const imagesJsonAttr = viewerEl.getAttribute( 'data-images-json' );

		if ( contextAttr ) {
			try {
				context = JSON.parse( contextAttr ) as EgMediaContext;
			} catch ( e ) {
				console.warn(
					'Erreur lors du parsing du data-wp-context eg-media:',
					e
				);
			}
		} else if ( imagesJsonAttr ) {
			try {
				const rawImages = JSON.parse( imagesJsonAttr );
				const layoutAttr = viewerEl.getAttribute( 'data-layout' );
				const layout = layoutAttr === 'viewer' ? 'viewer' : 'justified';
				const tempo = parseInt(
					viewerEl.getAttribute( 'data-tempo' ) || '3000',
					10
				);
				const slideshow =
					viewerEl.getAttribute( 'data-slideshow' ) === 'true';
				const limit = parseInt(
					viewerEl.getAttribute( 'data-limit' ) || '50',
					10
				);

				context = {
					currentIndex: 0,
					layout,
					tempo,
					slideshow,
					limit,
					images: ( rawImages as Record< string, unknown >[] ).map(
						( img, idx ) => ( {
							id: Number( img.id ?? idx ),
							index: Number( img.index ?? idx ),
							thumbSrc: String( img.thumbSrc || '' ),
							fullSrc: String(
								img.fullSrc || img.thumbSrc || ''
							),
							alt: String( img.alt || '' ),
							width: Number( img.width || 1008 ),
							height: Number( img.height || 670 ),
						} )
					),
				};
			} catch ( e ) {
				console.warn(
					'Erreur lors du parsing du data-images-json eg-media:',
					e
				);
			}
		}

		if ( context ) {
			contexts.push( context );
			const marker = doc.createElement( 'div' );
			marker.setAttribute( 'data-eg-media-marker', String( index ) );
			viewerEl.parentNode?.replaceChild( marker, viewerEl );
		}
	} );

	const modifiedHtml = doc.body.innerHTML;
	const markerRegex = /<div[^>]*data-eg-media-marker="(\d+)"[^>]*><\/div>/gi;

	const blocks: ContentBlock[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ( ( match = markerRegex.exec( modifiedHtml ) ) !== null ) {
		const textBefore = modifiedHtml
			.substring( lastIndex, match.index )
			.trim();
		if ( textBefore ) {
			blocks.push( { type: 'html', content: textBefore } );
		}

		const markerIdx = parseInt( match[ 1 ], 10 );
		if ( contexts[ markerIdx ] ) {
			blocks.push( { type: 'eg-media', context: contexts[ markerIdx ] } );
		}

		lastIndex = markerRegex.lastIndex;
	}

	const remainingText = modifiedHtml.substring( lastIndex ).trim();
	if ( remainingText ) {
		blocks.push( { type: 'html', content: remainingText } );
	}

	return blocks;
}
