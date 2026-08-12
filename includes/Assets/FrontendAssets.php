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
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_pwa_installer_assets' ) );
	}

	/**
	 * Enqueues PWA installer scripts and styles on the front end.
	 */
	public function enqueue_pwa_installer_assets(): void {
		// Do not enqueue on admin pages or if running in standalone mode request
		if ( is_admin() ) {
			return;
		}

		wp_enqueue_style(
			'dame-pwa-public-installer',
			\DAME_PWA_PLUGIN_URL . 'assets/css/public-pwa-installer.css',
			array(),
			\DAME_PWA_VERSION
		);

		wp_enqueue_script(
			'dame-pwa-public-installer',
			\DAME_PWA_PLUGIN_URL . 'assets/js/public-pwa-installer.js',
			array(),
			\DAME_PWA_VERSION,
			true
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
}
