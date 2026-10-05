<template>
  <div class="datatable-toolbar">
    <!-- Barre de recherche -->
    <div v-if="enableSearch" class="toolbar-search">
      <ion-searchbar
        :value="globalFilter"
        :placeholder="searchPlaceholder"
        animated
        class="custom-searchbar"
        @ionInput="onSearchInput"
      />
    </div>

    <!-- Filtres et Actions -->
    <div class="toolbar-actions">
      <!-- Filtres personnalisés -->
      <div v-if="filters && filters.length > 0" class="toolbar-filters">
        <ion-grid class="ion-no-padding">
          <ion-row>
            <ion-col
              v-for="filter in filters"
              :key="filter.id"
              size="12"
              size-sm="6"
              size-md="auto"
            >
              <ion-item lines="none" class="filter-item">
                <ion-select
                  :value="getFilterValue(filter.id, filter.defaultValue)"
                  interface="action-sheet"
                  :label="filter.label"
                  label-placement="stacked"
                  class="custom-select"
                  @ionChange="(e) => onFilterChange(filter.id, e.detail.value)"
                >
                  <ion-select-option
                    v-for="opt in filter.options"
                    :key="String(opt.value)"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>

      <!-- Boutons d'export et d'outils -->
      <div class="toolbar-buttons">
        <ion-button
          v-if="exportConfig"
          fill="outline"
          size="small"
          class="export-btn"
          @click="handleExport"
        >
          <ion-icon slot="start" :icon="downloadOutline" />
          Exporter CSV
        </ion-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TData">
import { computed } from 'vue';
import {
  IonSearchbar,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon
} from '@ionic/vue';
import { downloadOutline } from 'ionicons/icons';
import type { Table } from '@tanstack/vue-table';
import type { DataTableFilterConfig, DataTableExportConfig } from './types';
import { exportToCsv } from '../../../utils/csvExport';

const props = withDefaults(
  defineProps<{
    table: Table<TData>;
    enableSearch?: boolean;
    searchPlaceholder?: string;
    filters?: DataTableFilterConfig[];
    exportConfig?: DataTableExportConfig<TData>;
  }>(),
  {
    enableSearch: true,
    searchPlaceholder: 'Rechercher...',
    filters: () => [],
    exportConfig: undefined
  }
);

const globalFilter = computed(() => (props.table.getState().globalFilter as string) || '');

const onSearchInput = (e: CustomEvent) => {
  const val = e.detail.value || '';
  props.table.setGlobalFilter(val);
};

const getFilterValue = (filterId: string, defaultValue?: string | number) => {
  const column = props.table.getColumn(filterId);
  if (!column) return defaultValue ?? 'all';
  const val = column.getFilterValue();
  return val !== undefined ? (val as string | number) : defaultValue ?? 'all';
};

const onFilterChange = (filterId: string, value: unknown) => {
  const column = props.table.getColumn(filterId);
  if (!column) return;
  if (value === 'all' || value === '' || value === null) {
    column.setFilterValue(undefined);
  } else {
    column.setFilterValue(value);
  }
};

const handleExport = () => {
  if (!props.exportConfig) return;
  // Exporter les données filtrées actuelles de la table
  const filteredRows = props.table.getFilteredRowModel().rows.map(r => r.original);
  exportToCsv(props.exportConfig.filename, props.exportConfig.columns, filteredRows);
};
</script>
