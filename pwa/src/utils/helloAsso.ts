/**
 * Transforme les iframes et shortcodes HelloAsso en boutons d'action Ionic natifs.
 *
 * @param html Contenu HTML brut issu de WordPress.
 * @return Contenu HTML transformé contenant les boutons d'inscription.
 */
export function transformHelloAssoContent( html: string ): string {
	if ( ! html ) {
		return '';
	}

	// 1. Détection des iframes HelloAsso (générées côté serveur par l'extension WordPress HelloAsso)
	const iframeRegex =
		/<iframe[^>]*\bsrc=["']?(https?:\/\/(?:www\.)?helloasso\.com\/[^"'\s>]+)["']?[^>]*>[\s\S]*?<\/iframe>/gi;
	let processed = html.replace( iframeRegex, ( _match, url: string ) => {
		const cleanUrl = url.replace(
			/\/(widget-bouton|widget-vignette|widget)\/?$/i,
			'/'
		);
		return `<ion-button expand="block" class="ion-margin-top ion-margin-bottom" href="${ cleanUrl }" target="_blank">S'inscrire à l'événement</ion-button>`;
	} );

	// 2. Détection des shortcodes HelloAsso (au cas où le shortcode n'a pas été compilé par WP)
	const shortcodeRegex =
		/\[helloasso(?:\s+(?:campaign|url|link)=)?(?:&nbsp;|\s)*(?:&quot;|[»"“'«])*(https?:\/\/[^\s"&'»”\]]+)(?:&quot;|[»"”'»])?[^\]]*\]/gi;
	processed = processed.replace( shortcodeRegex, ( _match, url: string ) => {
		const cleanUrl = url.replace(
			/\/(widget-bouton|widget-vignette|widget)\/?$/i,
			'/'
		);
		return `<ion-button expand="block" class="ion-margin-top ion-margin-bottom" href="${ cleanUrl }" target="_blank">S'inscrire à l'événement</ion-button>`;
	} );

	return processed;
}
