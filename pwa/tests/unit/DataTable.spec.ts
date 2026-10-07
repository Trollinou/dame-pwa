import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import DataTable from '@/components/shared/DataTable/DataTable.vue';
import type {
	CustomColumnDef,
	DataTableFilterConfig,
} from '@/components/shared/DataTable/types';

interface TestMember {
	id: number;
	name: string;
	seasons: number[];
}

describe( 'DataTable filter behavior', () => {
	const columns: CustomColumnDef< TestMember >[] = [
		{
			id: 'name',
			header: 'Nom',
			accessorFn: ( row ) => row.name,
		},
		{
			id: 'seasons',
			header: 'Saisons',
			accessorFn: ( row ) => row.seasons,
			filterFn: ( row, columnId, filterValue ) => {
				if ( ! filterValue || filterValue === 'all' ) {
					return true;
				}
				const seasonsList = row.getValue( columnId ) as number[];
				return (
					Array.isArray( seasonsList ) &&
					seasonsList.includes( Number( filterValue ) )
				);
			},
		},
	];

	const sampleData: TestMember[] = [
		{ id: 1, name: 'Alice', seasons: [ 10, 9 ] },
		{ id: 2, name: 'Bob', seasons: [ 9 ] },
		{ id: 3, name: 'Charlie', seasons: [ 10 ] },
	];

	test( 'initializes column filter with defaultValue and filters rows accordingly', async () => {
		const filters: DataTableFilterConfig[] = [
			{
				id: 'seasons',
				label: 'Saison',
				defaultValue: 10,
				options: [
					{ label: 'Toutes les saisons', value: 'all' },
					{ label: 'Saison 2026/2027', value: 10 },
					{ label: 'Saison 2025/2026', value: 9 },
				],
			},
		];

		const wrapper = mount( DataTable, {
			props: {
				data: sampleData,
				columns,
				filters,
			},
		} );

		await nextTick();

		// Alice (10, 9) and Charlie (10) are in season 10; Bob (9) is not.
		const text = wrapper.text();
		expect( text ).toContain( 'Alice' );
		expect( text ).toContain( 'Charlie' );
		expect( text ).not.toContain( 'Bob' );
	} );

	test( 'allows switching to "all" and shows all rows without reverting back', async () => {
		const filters = ref< DataTableFilterConfig[] >( [
			{
				id: 'seasons',
				label: 'Saison',
				defaultValue: 10,
				options: [
					{ label: 'Toutes les saisons', value: 'all' },
					{ label: 'Saison 2026/2027', value: 10 },
					{ label: 'Saison 2025/2026', value: 9 },
				],
			},
		] );

		const wrapper = mount( DataTable, {
			props: {
				data: sampleData,
				columns,
				filters: filters.value,
			},
		} );

		await nextTick();

		// Initial filtered check
		expect( wrapper.text() ).not.toContain( 'Bob' );

		// Simulate selecting "all" on ion-select
		const select = wrapper.findComponent( { name: 'IonSelect' } );
		expect( select.exists() ).toBe( true );

		await select.vm.$emit( 'ionChange', {
			detail: { value: 'all' },
		} );

		await nextTick();

		// All 3 members must now be visible
		expect( wrapper.text() ).toContain( 'Alice' );
		expect( wrapper.text() ).toContain( 'Bob' );
		expect( wrapper.text() ).toContain( 'Charlie' );

		// ion-select value prop must remain 'all'
		expect( select.props( 'value' ) ).toBe( 'all' );
	} );
} );
