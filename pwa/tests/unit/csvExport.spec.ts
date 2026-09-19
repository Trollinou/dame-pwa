import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { exportToCsv, type ExportColumn } from '@/utils/csvExport';

describe( 'csvExport utility', () => {
	beforeEach( () => {
		vi.restoreAllMocks();
	} );

	afterEach( () => {
		vi.restoreAllMocks();
	} );

	test( 'does nothing if data array is empty or undefined', () => {
		const createObjectUrlSpy = vi.spyOn( URL, 'createObjectURL' );

		exportToCsv(
			'test.csv',
			[ { header: 'Nom', accessor: ( r: { name?: string } ) => r.name } ],
			[]
		);
		expect( createObjectUrlSpy ).not.toHaveBeenCalled();

		exportToCsv(
			'test.csv',
			[ { header: 'Nom', accessor: ( r: { name?: string } ) => r.name } ],
			null as unknown as { name: string }[]
		);
		expect( createObjectUrlSpy ).not.toHaveBeenCalled();
	} );

	test( 'generates valid UTF-8 BOM CSV with escaped quotes and handles download trigger', async () => {
		const mockData = [
			{ name: 'Élève "A"', elo: 1500, active: true },
			{ name: 'Membre B', elo: null, active: false },
		];

		const columns: ExportColumn< ( typeof mockData )[ 0 ] >[] = [
			{ header: 'Nom & Prénom', accessor: ( r ) => r.name },
			{ header: 'Elo', accessor: ( r ) => r.elo },
			{ header: 'Actif', accessor: ( r ) => r.active },
		];

		let createdBlob: Blob | null = null;
		vi.spyOn( URL, 'createObjectURL' ).mockImplementation(
			( blob: Blob | MediaSource ) => {
				if ( blob instanceof Blob ) {
					createdBlob = blob;
				}
				return 'blob:mock-url';
			}
		);
		vi.spyOn( URL, 'revokeObjectURL' ).mockImplementation( () => {} );

		const appendChildSpy = vi
			.spyOn( document.body, 'appendChild' )
			.mockImplementation( ( node ) => node );
		const removeChildSpy = vi
			.spyOn( document.body, 'removeChild' )
			.mockImplementation( ( node ) => node );

		exportToCsv( 'adherents', columns, mockData );

		expect( URL.createObjectURL ).toHaveBeenCalledTimes( 1 );
		expect( appendChildSpy ).toHaveBeenCalled();
		expect( removeChildSpy ).toHaveBeenCalled();

		expect( createdBlob ).not.toBeNull();
		if ( createdBlob ) {
			const buffer = await ( createdBlob as Blob ).arrayBuffer();
			const bytes = new Uint8Array( buffer );
			// Verify UTF-8 BOM bytes 0xEF 0xBB 0xBF
			expect( bytes[ 0 ] ).toBe( 0xef );
			expect( bytes[ 1 ] ).toBe( 0xbb );
			expect( bytes[ 2 ] ).toBe( 0xbf );

			const text = await ( createdBlob as Blob ).text();
			// Verify formatted CSV lines
			expect( text ).toContain( '"Nom & Prénom";"Elo";"Actif"' );
			expect( text ).toContain( '"Élève ""A""";"1500";"true"' );
			expect( text ).toContain( '"Membre B";"";"false"' );
		}
	} );
} );
