<?php
/**
 * Plugin Name: DAME - PWA
 * Description: Interface Progressive Web App pour le gestionnaire d'adhérents et l'apprentissage.
 * Version: 1.0.0
 * Author: Étienne Gagnon
 * Text Domain: dame-pwa
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'DAME_PWA_VERSION', '1.0.0' );
define( 'DAME_PWA_PLUGIN_FILE', __FILE__ );
define( 'DAME_PWA_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'DAME_PWA_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Autoloader SPL pour le namespace DAME_PWA\
 */
spl_autoload_register( function ( string $class ): void {
	$prefix   = 'DAME_PWA\\';
	$base_dir = DAME_PWA_PLUGIN_DIR . 'includes/';

	$len = strlen( $prefix );
	if ( 0 !== strncmp( $prefix, $class, $len ) ) {
		return;
	}

	$relative_class = substr( $class, $len );
	$file           = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

	if ( file_exists( $file ) ) {
		require_once $file;
	}
} );

// Inclusion de Composer si disponible
if ( file_exists( DAME_PWA_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
	require_once DAME_PWA_PLUGIN_DIR . 'vendor/autoload.php';
}

/**
 * Initialisation du plugin
 */
function dame_pwa_run(): void {
	\DAME_PWA\Core\Plugin::get_instance()->run();
}
add_action( 'plugins_loaded', 'dame_pwa_run' );