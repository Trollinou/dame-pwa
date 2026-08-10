<?php
/**
 * DAME PWA Core Plugin Class.
 *
 * @package DAME_PWA
 */

declare(strict_types=1);

namespace DAME_PWA\Core;

/**
 * Class Plugin
 */
class Plugin {

	/**
	 * Unique instance of the plugin.
	 *
	 * @var ?Plugin
	 */
	private static ?Plugin $instance = null;

	/**
	 * Gets the unique instance.
	 *
	 * @return Plugin
	 */
	public static function get_instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Private constructor for Singleton pattern.
	 */
	private function __construct() {}

	/**
	 * Run the plugin logic.
	 */
	public function run(): void {
		// Enregistre l'URL de la PWA auprès du plugin principal DAME
		add_filter( 'dame_pwa_url', [ $this, 'get_pwa_url' ] );

		// Intercepte les requêtes pour servir la PWA ou le manifest
		add_action( 'template_redirect', [ $this, 'handle_pwa_routing' ] );

		// Injecte la balise du manifest dans le <head> de WordPress
		add_action( 'wp_head', [ $this, 'inject_pwa_manifest_link' ] );

		// Notice d'administration si le plugin parent DAME n'est pas présent/actif
		add_action( 'admin_notices', [ $this, 'check_parent_plugin_notice' ] );
	}

	/**
	 * Returns the entrypoint URL of the PWA.
	 *
	 * @return string
	 */
	public function get_pwa_url(): string {
		return \DAME_PWA_PLUGIN_URL . 'pwa/dist/index.html';
	}

	/**
	 * Handles PWA routes and dynamic manifest output.
	 */
	public function handle_pwa_routing(): void {
		if ( isset( $_GET['dame-manifest'] ) ) {
			$this->serve_dynamic_manifest();
		}

		$home_path   = trim( (string) parse_url( home_url(), PHP_URL_PATH ), '/' );
		$request_uri = trim( (string) parse_url( (string) $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' );

		if ( ! empty( $home_path ) && 0 === strpos( $request_uri, $home_path ) ) {
			$request_uri = trim( substr( $request_uri, strlen( $home_path ) ), '/' );
		}

		// 1. Redirection vers l'index.html de la PWA
		if ( 'pwa' === $request_uri ) {
			$pwa_url = $this->get_pwa_url();
			wp_safe_redirect( $pwa_url, 301 );
			exit;
		}

		// 2. Génération dynamique du Manifest
		if ( 'dame-manifest.json' === $request_uri || 'dame-manifest' === $request_uri ) {
			$this->serve_dynamic_manifest();
		}
	}

	/**
	 * Outputs the dynamic JSON web manifest.
	 */
	private function serve_dynamic_manifest(): void {
		if ( ob_get_length() ) {
			ob_clean();
		}
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		echo wp_json_encode( [
			'name'             => get_bloginfo( 'name' ),
			'short_name'       => get_bloginfo( 'name' ),
			'start_url'        => home_url( '/pwa' ),
			'display'          => 'standalone',
			'background_color' => '#ffffff',
			'theme_color'      => '#ffffff',
			'icons'            => [
				[
					'src'     => get_site_icon_url( 192 ) ?: \DAME_PWA_PLUGIN_URL . 'pwa/dist/assets/icon/icon-192.png',
					'sizes'   => '192x192',
					'type'    => 'image/png',
					'purpose' => 'any maskable',
				],
				[
					'src'     => get_site_icon_url( 512 ) ?: \DAME_PWA_PLUGIN_URL . 'pwa/dist/assets/icon/icon-512.png',
					'sizes'   => '512x512',
					'type'    => 'image/png',
					'purpose' => 'any maskable',
				],
			],
		] );
		exit;
	}

	/**
	 * Injects the PWA manifest link in the HTML head.
	 */
	public function inject_pwa_manifest_link(): void {
		if ( ! is_admin() ) {
			$manifest_url = add_query_arg( 'dame-manifest', '1', home_url( '/' ) );
			echo '<link rel="manifest" href="' . esc_url( $manifest_url ) . '">' . "\n";
		}
	}

	/**
	 * Displays an admin notice if DAME main plugin is missing.
	 */
	public function check_parent_plugin_notice(): void {
		if ( ! defined( 'DAME_VERSION' ) && current_user_can( 'activate_plugins' ) ) {
			echo '<div class="notice notice-warning"><p>';
			echo esc_html__( 'Le plugin DAME - PWA nécessite que le plugin principal DAME soit activé.', 'dame-pwa' );
			echo '</p></div>';
		}
	}
}
