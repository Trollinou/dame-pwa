<template>
  <div class="dame-datatable-container">
    <!-- Barre d'outils (Recherche, filtres, export CSV) -->
    <DataTableToolbar
      v-if="enableToolbar"
      :table="table"
      :enable-search="enableSearch"
      :search-placeholder="searchPlaceholder"
      :filters="filters"
      :export-config="exportConfig"
    />

    <!-- État de chargement -->
    <div v-if="isLoading" class="ion-text-center ion-padding loading-wrapper">
      <ion-spinner name="crescent" color="primary" />
      <p class="loading-text">Chargement des données...</p>
    </div>

    <!-- Contenu (Grille Desktop / Liste Mobile) -->
    <template v-else>
      <div v-if="table.getFilteredRowModel().rows.length > 0" class="table-content-wrapper">
        <!-- VUE DESKTOP / TABLETTE PAYSAGE (> 768px) -->
        <div class="desktop-grid-view">
          <div class="table-responsive">
            <table class="dame-table">
              <thead>
                <tr
                  v-for="headerGroup in table.getHeaderGroups()"
                  :key="headerGroup.id"
                >
                  <th
                    v-for="header in headerGroup.headers"
                    :key="header.id"
                    :class="{
                      'sortable': header.column.getCanSort(),
                      'sorted-asc': header.column.getIsSorted() === 'asc',
                      'sorted-desc': header.column.getIsSorted() === 'desc'
                    }"
                    @click="header.column.getToggleSortingHandler()?.($event)"
                  >
                    <div class="header-cell-content">
                      <FlexRender
                        v-if="!header.isPlaceholder"
                        :render="header.column.columnDef.header"
                        :props="header.getContext()"
                      />
                      <span v-if="header.column.getCanSort()" class="sort-indicator">
                        <ion-icon
                          v-if="header.column.getIsSorted() === 'asc'"
                          :icon="chevronUpOutline"
                        />
                        <ion-icon
                          v-else-if="header.column.getIsSorted() === 'desc'"
                          :icon="chevronDownOutline"
                        />
                        <ion-icon
                          v-else
                          :icon="swapVerticalOutline"
                          class="sort-idle"
                        />
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in table.getRowModel().rows"
                  :key="row.id"
                  class="table-row"
                  :class="{ 'clickable': Boolean(onRowClick) }"
                  @click="handleRowClick(row.original)"
                >
                  <td
                    v-for="cell in row.getVisibleCells()"
                    :key="cell.id"
                  >
                    <FlexRender
                      :render="cell.column.columnDef.cell"
                      :props="cell.getContext()"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- VUE MOBILE (<= 768px) -->
        <div class="mobile-list-view">
          <ion-list class="mobile-ion-list">
            <ion-item
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              button
              class="mobile-list-item"
              @click="handleRowClick(row.original)"
            >
              <slot name="mobile-item" :row="row.original" :cells="row.getVisibleCells()">
                <!-- Rendu mobile par défaut si aucun slot mobile n'est fourni -->
                <ion-label>
                  <h2>
                    <FlexRender
                      :render="row.getVisibleCells()[0]?.column.columnDef.cell"
                      :props="row.getVisibleCells()[0]?.getContext()"
                    />
                  </h2>
                </ion-label>
              </slot>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <!-- État Vide -->
      <div v-else class="ion-text-center ion-padding empty-state">
        <ion-icon :icon="searchOutline" size="large" color="medium" />
        <p>{{ emptyText }}</p>
      </div>

      <!-- Pagination -->
      <DataTablePagination
        v-if="enablePagination && table.getFilteredRowModel().rows.length > 0"
        :table="table"
      />
    </template>
  </div>
</template>

<script setup lang="ts" generic="TData">
import { ref } from 'vue';
import {
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonIcon
} from '@ionic/vue';
import {
  chevronUpOutline,
  chevronDownOutline,
  swapVerticalOutline,
  searchOutline
} from 'ionicons/icons';
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  FlexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type FilterFn
} from '@tanstack/vue-table';
import DataTableToolbar from './DataTableToolbar.vue';
import DataTablePagination from './DataTablePagination.vue';
import type { DataTableFilterConfig, DataTableExportConfig } from './types';
import { watch } from 'vue';
import { removeAccents } from '../../../utils/stringUtils';

const props = withDefaults(
  defineProps<{
    data: TData[];
    columns: ColumnDef<TData, unknown>[];
    isLoading?: boolean;
    enableToolbar?: boolean;
    enableSearch?: boolean;
    searchPlaceholder?: string;
    filters?: DataTableFilterConfig[];
    exportConfig?: DataTableExportConfig<TData>;
    columnVisibility?: VisibilityState;
    enablePagination?: boolean;
    pageSize?: number;
    emptyText?: string;
    onRowClick?: (row: TData) => void;
  }>(),
  {
    isLoading: false,
    enableToolbar: true,
    enableSearch: true,
    searchPlaceholder: 'Rechercher...',
    filters: () => [],
    exportConfig: undefined,
    columnVisibility: () => ({}),
    enablePagination: true,
    pageSize: 25,
    emptyText: 'Aucune donnée trouvée.',
    onRowClick: undefined
  }
);

const sorting = ref<SortingState>([]);
const columnFilters = ref<ColumnFiltersState>([]);
const globalFilter = ref<string>('');
const columnVisibility = ref<VisibilityState>(props.columnVisibility || {});

watch(
  () => props.columnVisibility,
  (newVal) => {
    if (newVal) {
      columnVisibility.value = { ...newVal };
    }
  },
  { deep: true, immediate: true }
);

watch(
  () => props.filters,
  (newFilters) => {
    if (newFilters && newFilters.length > 0) {
      newFilters.forEach((f) => {
        if (f.defaultValue !== undefined && f.defaultValue !== 'all' && f.defaultValue !== '') {
          const existing = columnFilters.value.find((cf) => cf.id === f.id);
          if (!existing) {
            columnFilters.value = [...columnFilters.value, { id: f.id, value: f.defaultValue }];
          }
        }
      });
    }
  },
  { deep: true, immediate: true }
);

/**
 * Fonction de recherche globale personnalisée insensible aux accents.
 */
const customGlobalFilterFn: FilterFn<TData> = (row, columnId, filterValue) => {
  if (!filterValue) return true;
  const searchVal = removeAccents(String(filterValue).toLowerCase().trim());
  const cellValue = row.getValue(columnId);
  if (cellValue === null || cellValue === undefined) return false;
  const targetStr = removeAccents(String(cellValue).toLowerCase());
  return targetStr.includes(searchVal);
};

const table = useVueTable({
  get data() {
    return props.data;
  },
  get columns() {
    return props.columns;
  },
  state: {
    get sorting() {
      return sorting.value;
    },
    get columnFilters() {
      return columnFilters.value;
    },
    get globalFilter() {
      return globalFilter.value;
    },
    get columnVisibility() {
      return columnVisibility.value;
    }
  },
  onSortingChange: (updaterOrValue) => {
    sorting.value = typeof updaterOrValue === 'function' ? updaterOrValue(sorting.value) : updaterOrValue;
  },
  onColumnFiltersChange: (updaterOrValue) => {
    columnFilters.value = typeof updaterOrValue === 'function' ? updaterOrValue(columnFilters.value) : updaterOrValue;
  },
  onGlobalFilterChange: (updaterOrValue) => {
    globalFilter.value = typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter.value) : updaterOrValue;
  },
  onColumnVisibilityChange: (updaterOrValue) => {
    columnVisibility.value = typeof updaterOrValue === 'function' ? updaterOrValue(columnVisibility.value) : updaterOrValue;
  },
  globalFilterFn: customGlobalFilterFn,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: {
    pagination: {
      pageSize: props.pageSize
    }
  }
});

const handleRowClick = (row: TData) => {
  if (props.onRowClick) {
    props.onRowClick(row);
  }
};

const initializedFilterIds = ref<Set<string>>(new Set());

watch(
  () => props.filters,
  (newFilters) => {
    if (!newFilters) return;
    for (const filter of newFilters) {
      if (
        !initializedFilterIds.value.has(filter.id) &&
        filter.defaultValue !== undefined &&
        filter.defaultValue !== 'all'
      ) {
        initializedFilterIds.value.add(filter.id);
        const col = table.getColumn(filter.id);
        if (col && col.getFilterValue() === undefined) {
          col.setFilterValue(filter.defaultValue);
        }
      }
    }
  },
  { immediate: true, deep: true }
);
</script>
