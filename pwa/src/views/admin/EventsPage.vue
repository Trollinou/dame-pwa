<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Événements</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <DataTable
          :data="adminEvents"
          :columns="columns"
          :is-loading="isAdminEventsLoading"
          search-placeholder="Rechercher un événement..."
          :filters="filterConfigs"
          :export-config="exportConfig"
          :column-visibility="{ season: false }"
          empty-text="Aucun événement trouvé."
          :on-row-click="goToDetail"
        >
          <!-- Slot mobile pour chaque événement -->
          <template #mobile-item="{ row }">
            <ion-label>
              <h2 v-safe-html="row.title.rendered"></h2>
              <p>
                {{ formatDateFr(row.meta?._dame_start_date) }}
                <span v-if="formatEventSchedule(row) !== '-'"> • {{ formatEventSchedule(row) }}</span>
              </p>
              <p v-if="formatEventLocation(row) !== '-'">
                {{ formatEventLocation(row) }}
              </p>
            </ion-label>
            <template v-if="row.categories_data && row.categories_data.length > 0">
              <ion-badge
                slot="end"
                class="admin-event-category-badge"
                :style="row.categories_data[0].color ? { '--event-cat-color': row.categories_data[0].color } : undefined"
              >
                {{ row.categories_data[0].name }}
              </ion-badge>
            </template>
          </template>
        </DataTable>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { h, ref, computed } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBadge,
  IonLabel,
  IonButtons,
  IonMenuButton,
  onIonViewWillEnter
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useAgendaStore, type AgendaEvent } from '@/stores/agenda';
import { storeToRefs } from 'pinia';
import {
  DataTable,
  type CustomColumnDef,
  type DataTableFilterConfig,
  type DataTableExportConfig
} from '@/components/shared/DataTable';
import {
  getSeasonFromDate,
  getCurrentSeason,
  formatDateFr,
  formatEventSchedule,
  formatEventLocation
} from '@/utils/seasonUtils';

const router = useRouter();
const agendaStore = useAgendaStore();
const { adminEvents, availableSeasons, isAdminEventsLoading } = storeToRefs(agendaStore);

const currentSeason = getCurrentSeason();
const selectedSeason = ref<string>(currentSeason);

const goToDetail = (row: AgendaEvent) => {
  router.push('/admin/agenda/' + row.id);
};

// Configuration des colonnes TanStack Table pour les Événements Admin
const columns: CustomColumnDef<AgendaEvent>[] = [
  {
    id: 'startDate',
    header: 'Date',
    accessorFn: (row) => row.meta?._dame_start_date || '',
    cell: ({ row }) => formatDateFr(row.original.meta?._dame_start_date),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.original.meta?._dame_start_date || '';
      const dateB = rowB.original.meta?._dame_start_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = rowA.original.meta?._dame_start_time || '';
      const timeB = rowB.original.meta?._dame_start_time || '';
      return timeA.localeCompare(timeB);
    }
  },
  {
    id: 'schedule',
    header: 'Plage / Horaires',
    accessorFn: (row) => formatEventSchedule(row),
    cell: ({ row }) => formatEventSchedule(row.original),
    enableSorting: true
  },
  {
    id: 'title',
    header: 'Titre',
    accessorFn: (row) => row.title?.raw || row.title?.rendered || '',
    cell: ({ row }) => h('span', { innerHTML: row.original.title.rendered }),
    enableSorting: true
  },
  {
    id: 'category',
    header: 'Catégorie',
    accessorFn: (row) => row.categories_data?.map((c) => c.name).join(', ') || '',
    cell: ({ row }) => {
      const cats = row.original.categories_data;
      if (!cats || cats.length === 0) return '-';
      return h(
        'div',
        { class: 'admin-event-categories' },
        cats.map((cat) =>
          h(
            IonBadge,
            {
              class: 'admin-event-category-badge',
              style: cat.color ? { '--event-cat-color': cat.color } : undefined
            },
            () => cat.name
          )
        )
      );
    },
    enableSorting: true
  },
  {
    id: 'location',
    header: 'Lieu',
    accessorFn: (row) => formatEventLocation(row),
    cell: ({ row }) => formatEventLocation(row.original),
    enableSorting: true
  },
  {
    id: 'season',
    header: 'Saison',
    accessorFn: (row) => getSeasonFromDate(row.meta?._dame_start_date) || '',
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === 'all') return true;
      const rowSeason = row.getValue(columnId) as string;
      return rowSeason === String(filterValue);
    },
    enableHiding: true
  }
];

// Configuration des filtres (filtre par saison par ordre décroissant, défaut sur saison courante)
const filterConfigs = computed<DataTableFilterConfig[]>(() => [
  {
    id: 'season',
    label: 'Saison',
    defaultValue: selectedSeason.value,
    options: [
      { label: 'Toutes les saisons', value: 'all' },
      ...availableSeasons.value.map((s) => ({ label: s, value: s }))
    ]
  }
]);

// Configuration de l'export Excel / CSV avec toutes les métadonnées disponibles
const exportConfig: DataTableExportConfig<AgendaEvent> = {
  filename: 'evenements',
  columns: [
    { header: 'ID', accessor: (e) => e.id },
    { header: 'Titre', accessor: (e) => e.title?.raw || e.title?.rendered || '' },
    { header: 'Date de début', accessor: (e) => formatDateFr(e.meta?._dame_start_date) },
    { header: 'Date de fin', accessor: (e) => formatDateFr(e.meta?._dame_end_date) },
    { header: 'Plage / Horaires', accessor: (e) => formatEventSchedule(e) },
    { header: 'Heure de début', accessor: (e) => e.meta?._dame_start_time || '' },
    { header: 'Heure de fin', accessor: (e) => e.meta?._dame_end_time || '' },
    {
      header: 'Journée entière',
      accessor: (e) => (e.meta?._dame_all_day === 1 || e.meta?._dame_all_day === true ? 'Oui' : 'Non')
    },
    {
      header: 'Catégorie',
      accessor: (e) => e.categories_data?.map((c) => c.name).join(', ') || ''
    },
    {
      header: 'Code couleur catégorie',
      accessor: (e) => e.categories_data?.[0]?.color || e.meta?._dame_color || ''
    },
    {
      header: 'Saison',
      accessor: (e) => getSeasonFromDate(e.meta?._dame_start_date) || ''
    },
    { header: 'Lieu', accessor: (e) => e.meta?._dame_location_name || '' },
    {
      header: 'Adresse',
      accessor: (e) => [e.meta?._dame_address, e.meta?._dame_address_1].filter(Boolean).join(' ') || ''
    },
    { header: 'Code postal', accessor: (e) => e.meta?._dame_postal_code || '' },
    { header: 'Ville', accessor: (e) => e.meta?._dame_city || '' },
    { header: 'Type de compétition', accessor: (e) => e.meta?._dame_competition_type || '' },
    {
      header: 'Niveau de compétition',
      accessor: (e) => e.meta?._dame_competition_level || e.meta?._dame_level || ''
    },
    { header: 'Description', accessor: (e) => e.meta?._dame_agenda_description || '' }
  ]
};

onIonViewWillEnter(async () => {
  await agendaStore.fetchAdminEvents();
});
</script>
