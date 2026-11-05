import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import router from '@/router';

describe( 'Routage Shortcode Bénévolat dans un article', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'résout la route /tabs/benevolat/participation/:id', () => {
		const resolved = router.resolve( '/tabs/benevolat/participation/18045' );
		expect( resolved.matched.length ).toBeGreaterThan( 0 );
		expect( resolved.fullPath ).toContain( '18045' );
	} );

	it( 'résout la route standard /benevolat/participation/:id', () => {
		const resolved = router.resolve( '/benevolat/participation/18045' );
		expect( resolved.matched.length ).toBeGreaterThan( 0 );
		expect( resolved.name ).toBe( 'BenevolatVote' );
	} );
} );

