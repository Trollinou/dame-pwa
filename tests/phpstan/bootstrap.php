<?php
// Bootstrap file for PHPStan to define WordPress constants during static analysis.
if ( ! defined( 'DAME_PWA_PLUGIN_URL' ) ) {
	define( 'DAME_PWA_PLUGIN_URL', 'https://example.com/wp-content/plugins/dame-pwa/' );
}
if ( ! defined( 'DAME_PWA_PLUGIN_DIR' ) ) {
	define( 'DAME_PWA_PLUGIN_DIR', __DIR__ . '/../../' );
}
