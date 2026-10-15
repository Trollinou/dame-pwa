<?php

declare(strict_types=1);

namespace DAME_PWA\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Tests unitaires basiques du plugin DAME-PWA.
 */
final class PluginTest extends TestCase {
	public function test_plugin_constants(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
		}

		require_once dirname( __DIR__, 2 ) . '/dame-pwa.php';

		$this->assertTrue( defined( 'DAME_PWA_VERSION' ) );
		$this->assertNotEmpty( DAME_PWA_VERSION );
		$this->assertTrue( defined( 'DAME_PWA_PLUGIN_DIR' ) );
		$this->assertTrue( defined( 'DAME_PWA_PLUGIN_FILE' ) );
		$this->assertTrue( defined( 'DAME_PWA_PLUGIN_URL' ) );
	}
}
