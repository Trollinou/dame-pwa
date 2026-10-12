<?php
/**
 * Frontend Assets Management for DAME PWA.
 *
 * @package DAME_PWA
 */

declare(strict_types=1);

namespace DAME_PWA\Assets;

/**
 * Handles asset enqueuing for the DAME PWA plugin on the frontend.
 */
class FrontendAssets {

	/**
	 * Initializes the frontend assets hooks.
	 */
	public function init(): void {
		// Enregistrement précoce des assets (priorité 5).
		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ), 5 );

		// Mise en file d'attente contextuelle (priorité 10).
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_contextual_assets' ), 10 );

		// Enregistrement d'un shortcode pour chargement à la demande dans les pages / blocs.
		add_shortcode( 'dame_pwa_installer', array( $this, 'render_installer_shortcode' ) );
	}

	/**
	 * Registers PWA installer styles and scripts (Register vs Enqueue separation).
	 */
	public function register_assets(): void {
		wp_register_style(
			'dame-pwa-public-installer',
			\DAME_PWA_PLUGIN_URL . 'assets/css/public-pwa-installer.css',
			array(),
			\DAME_PWA_VERSION
		);

		// Stratégie moderne de chargement asynchrone / différé (WordPress 6.3+).
		wp_register_script(
			'dame-pwa-public-installer',
			\DAME_PWA_PLUGIN_URL . 'assets/js/public-pwa-installer.js',
			array(),
			\DAME_PWA_VERSION,
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);

		$site_icon_192 = get_site_icon_url( 192 );
		$icon_192_url  = ! empty( $site_icon_192 ) ? $site_icon_192 : \DAME_PWA_PLUGIN_URL . 'pwa/dist/assets/icon/icon-192.png';

		wp_localize_script(
			'dame-pwa-public-installer',
			'damePwaInstaller',
			array(
				'swUrl'    => \DAME_PWA_PLUGIN_URL . 'pwa/dist/sw.js',
				'pwaScope' => \DAME_PWA_PLUGIN_URL . 'pwa/dist/',
				'siteName' => get_bloginfo( 'name' ),
				'siteIcon' => $icon_192_url,
				'pwaUrl'   => home_url( '/pwa' ),
			)
		);
	}

	/**
	 * Enqueues PWA installer assets conditionally on the front end.
	 */
	public function enqueue_contextual_assets(): void {
		// Exclusion des contextes non pertinents : administration, flux RSS, embed, aperçus, requêtes REST / AJAX.
		if ( is_admin() || is_feed() || is_embed() || is_preview() || wp_is_json_request() ) {
			return;
		}

		/**
		 * Filtre permettant d'activer ou de restreindre le chargement de la bannière d'installation PWA.
		 *
		 * @param bool $should_enqueue Vrai si les assets doivent être chargés, faux sinon.
		 */
		$should_enqueue = (bool) apply_filters( 'dame_pwa_should_enqueue_installer', true );

		if ( $should_enqueue ) {
			wp_enqueue_style( 'dame-pwa-public-installer' );
			wp_enqueue_script( 'dame-pwa-public-installer' );
		}
	}

	/**
	 * Shortcode callback to render/enqueue the PWA installer on demand.
	 *
	 * Usage: [dame_pwa_installer]
	 *
	 * @return string
	 */
	public function render_installer_shortcode(): string {
		wp_enqueue_style( 'dame-pwa-public-installer' );
		wp_enqueue_script( 'dame-pwa-public-installer' );

		return '<div class="dame-pwa-installer-container" data-dame-pwa-installer="true"></div>';
	}
}
