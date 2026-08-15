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
		// Enregistre les assets frontend (bannière d'installation PWA)
		( new \DAME_PWA\Assets\FrontendAssets() )->init();

		// Enregistre l'URL de la PWA auprès du plugin principal DAME
		add_filter( 'dame_pwa_url', array( $this, 'get_pwa_url' ) );

		// Intercepte les requêtes pour servir la PWA ou le manifest
		add_action( 'template_redirect', array( $this, 'handle_pwa_routing' ) );

		// Assure que les fichiers .wasm sont servis avec le bon Content-Type si interceptés
		add_action( 'init', array( $this, 'handle_wasm_mime_type' ) );

		// Injecte la balise du manifest dans le <head> de WordPress
		add_action( 'wp_head', array( $this, 'inject_pwa_manifest_link' ) );

		// Notice d'administration si le plugin parent DAME n'est pas présent/actif
		add_action( 'admin_notices', array( $this, 'check_parent_plugin_notice' ) );
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
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Déclencheur public en lecture seule via paramètre GET.
		if ( isset( $_GET['dame-manifest'] ) ) {
			$this->serve_dynamic_manifest();
		}

		$raw_request_uri = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

		$home_path   = trim( (string) wp_parse_url( home_url(), PHP_URL_PATH ), '/' );
		$request_uri = trim( (string) wp_parse_url( $raw_request_uri, PHP_URL_PATH ), '/' );

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

		$site_icon_192 = get_site_icon_url( 192 );
		$site_icon_512 = get_site_icon_url( 512 );

		$icon_192_url = ! empty( $site_icon_192 ) ? $site_icon_192 : \DAME_PWA_PLUGIN_URL . 'pwa/dist/assets/icon/icon-192.png';
		$icon_512_url = ! empty( $site_icon_512 ) ? $site_icon_512 : \DAME_PWA_PLUGIN_URL . 'pwa/dist/assets/icon/icon-512.png';

		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		echo wp_json_encode(
			array(
				'name'             => get_bloginfo( 'name' ),
				'short_name'       => get_bloginfo( 'name' ),
				'start_url'        => home_url( '/pwa' ),
				'display'          => 'standalone',
				'background_color' => '#ffffff',
				'theme_color'      => '#ffffff',
				'icons'            => array(
					array(
						'src'     => $icon_192_url,
						'sizes'   => '192x192',
						'type'    => 'image/png',
						'purpose' => 'any maskable',
					),
					array(
						'src'     => $icon_512_url,
						'sizes'   => '512x512',
						'type'    => 'image/png',
						'purpose' => 'any maskable',
					),
				),
			)
		);
		exit;
	}

	/**
	 * Ensures .wasm static files are served with the proper Content-Type application/wasm
	 * if requested through WordPress URL rewrites.
	 */
	public function handle_wasm_mime_type(): void {
		$raw_uri = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
		$path    = (string) wp_parse_url( $raw_uri, PHP_URL_PATH );

		if ( str_ends_with( $path, 'stockfish.wasm' ) ) {
			$file_path = \DAME_PWA_PLUGIN_DIR . 'pwa/dist/stockfish/stockfish.wasm';
			if ( file_exists( $file_path ) ) {
				if ( ob_get_length() ) {
					ob_clean();
				}
				header( 'Content-Type: application/wasm' );
				header( 'Content-Length: ' . filesize( $file_path ) );
				header( 'Cache-Control: public, max-age=2592000' );
				readfile( $file_path );
				exit;
			}
		}
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
