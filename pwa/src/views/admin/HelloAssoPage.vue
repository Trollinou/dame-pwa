<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>HelloAsso — Collectes & Billetterie</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="isCampaignsLoading" @click="handleRefresh">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <DataTable
          :data="campaigns"
          :columns="columns"
          :is-loading="isCampaignsLoading"
          search-placeholder="Rechercher une collecte, un tournoi..."
          :filters="filterConfigs"
          :export-config="exportConfig"
          empty-text="Aucune collecte HelloAsso trouvée."
          :on-row-click="goToDetail"
        >
          <!-- Slot mobile pour chaque campagne -->
          <template #mobile-item="{ row }">
            <ion-label>
              <h2>{{ row.title }}</h2>
              <p>
                <span>{{ formatCampaignDate(row) }}</span>
                <span v-if="row.last_sync_at"> • Sync: {{ formatDateFr(row.last_sync_at) }}</span>
              </p>
              <div class="helloasso-mobile-stats">
                <span class="stat-badge">
                  <strong>{{ row.checked_in_count }}</strong> / {{ row.total_items }} pointés
                </span>
                <span class="stat-amount">
                  {{ formatAmount(row.total_amount_cents) }}
                </span>
              </div>
            </ion-label>
            <div slot="end" class="helloasso-badges-wrapper">
              <ion-badge :color="getCategoryColor(row.campaign_category)">
                {{ getCategoryLabel(row.campaign_category) }}
              </ion-badge>
              <ion-badge v-if="getCampaignSeason(row)" color="light" class="season-badge">
                {{ getCampaignSeason(row) }}
              </ion-badge>
            </div>
          </template>
        </DataTable>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { h, computed, ref } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonIcon,
  IonLabel,
  IonBadge,
  onIonViewWillEnter
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useTicketingStore } from '@/stores/ticketing';
import type { TicketingCampaignDTO, CampaignCategory } from '@/types/api/ticketing';
import {
  DataTable,
  type CustomColumnDef,
  type DataTableFilterConfig,
  type DataTableExportConfig
} from '@/components/shared/DataTable';
import { getSeasonFromDate, getCurrentSeason, formatDateFr } from '@/utils/seasonUtils';

const router = useRouter();
const ticketingStore = useTicketingStore();
const { campaigns, isCampaignsLoading } = storeToRefs(ticketingStore);

const currentSeason = getCurrentSeason();
const selectedSeason = ref<string>(currentSeason);

const handleRefresh = async () => {
  await ticketingStore.refetchCampaigns();
};

const goToDetail = (row: TicketingCampaignDTO) => {
  router.push(`/admin/helloasso/${row.id}`);
};

const getCategoryLabel = (category: CampaignCategory): string => {
  switch (category) {
    case 'tournament':
      return 'Tournoi';
    case 'membership':
      return 'Adhésion';
    case 'stage':
      return 'Stage';
    case 'other':
    default:
      return 'Autre / Don';
  }
};

const getCategoryColor = (category: CampaignCategory): string => {
  switch (category) {
    case 'tournament':
      return 'primary';
    case 'membership':
      return 'success';
    case 'stage':
      return 'warning';
    case 'other':
    default:
      return 'tertiary';
  }
};

const getCampaignSeason = (campaign: TicketingCampaignDTO): string => {
  if (campaign.linked_season_id) {
    return `${campaign.linked_season_id}-${campaign.linked_season_id + 1}`;
  }
  return getSeasonFromDate(campaign.start_date) || '';
};

const formatAmount = (cents: number): string => {
  const euros = (cents || 0) / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(euros);
};

const formatCampaignDate = (campaign: TicketingCampaignDTO): string => {
  if (!campaign.start_date) {
    return 'Date non définie';
  }
  const start = formatDateFr(campaign.start_date);
  if (campaign.end_date && campaign.end_date !== campaign.start_date) {
    const end = formatDateFr(campaign.end_date);
    return `Du ${start} au ${end}`;
  }
  return start;
};

// Saisons disponibles calculées à partir des campagnes
const availableSeasons = computed(() => {
  const seasonsSet = new Set<string>();
  seasonsSet.add(currentSeason);
  for (const c of campaigns.value) {
    const s = getCampaignSeason(c);
    if (s) {
      seasonsSet.add(s);
    }
  }
  return Array.from(seasonsSet).sort().reverse();
});

// Colonnes DataTable
const columns: CustomColumnDef<TicketingCampaignDTO>[] = [
  {
    id: 'category',
    header: 'Type',
    accessorFn: (row) => getCategoryLabel(row.campaign_category),
    cell: ({ row }) =>
      h(
        IonBadge,
        { color: getCategoryColor(row.original.campaign_category) },
        () => getCategoryLabel(row.original.campaign_category)
      ),
    enableSorting: true
  },
  {
    id: 'title',
    header: 'Collecte / Événement',
    accessorFn: (row) => row.title,
    cell: ({ row }) =>
      h('div', { class: 'helloasso-campaign-cell' }, [
        h('strong', { class: 'helloasso-campaign-title' }, row.original.title),
        h(
          'span',
          { class: 'helloasso-campaign-dates' },
          formatCampaignDate(row.original)
        )
      ]),
    enableSorting: true
  },
  {
    id: 'items',
    header: 'Inscrits & Pointage',
    accessorFn: (row) => row.total_items,
    cell: ({ row }) => {
      const total = row.original.total_items;
      const checked = row.original.checked_in_count;
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
      return h('div', { class: 'helloasso-pointage-progress-cell' }, [
        h('span', { class: 'pointage-counts' }, `${checked} / ${total} (${pct}%)`),
        h('div', { class: 'pointage-bar' }, [
          h('div', {
            class: 'pointage-bar-fill',
            style: { width: `${pct}%` }
          })
        ])
      ]);
    },
    enableSorting: true
  },
  {
    id: 'amount',
    header: 'Total collecté',
    accessorFn: (row) => row.total_amount_cents,
    cell: ({ row }) => formatAmount(row.original.total_amount_cents),
    enableSorting: true
  },
  {
    id: 'season',
    header: 'Saison',
    accessorFn: (row) => getCampaignSeason(row),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === 'all') return true;
      const rowSeason = row.getValue(columnId) as string;
      return rowSeason === String(filterValue);
    },
    enableHiding: true
  },
  {
    id: 'campaignCategoryFilter',
    header: 'CatégorieFilter',
    accessorFn: (row) => row.campaign_category,
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === 'all') return true;
      const rowCat = row.getValue(columnId) as string;
      return rowCat === String(filterValue);
    },
    enableHiding: true
  }
];

// Configuration des filtres (Saison & Catégorie)
const filterConfigs = computed<DataTableFilterConfig[]>(() => [
  {
    id: 'season',
    label: 'Saison',
    defaultValue: selectedSeason.value,
    options: [
      { label: 'Toutes les saisons', value: 'all' },
      ...availableSeasons.value.map((s) => ({ label: s, value: s }))
    ]
  },
  {
    id: 'campaignCategoryFilter',
    label: 'Type de collecte',
    defaultValue: 'all',
    options: [
      { label: 'Tous les types', value: 'all' },
      { label: 'Tournois', value: 'tournament' },
      { label: 'Adhésions', value: 'membership' },
      { label: 'Stages', value: 'stage' },
      { label: 'Dons & Autres', value: 'other' }
    ]
  }
]);

// Configuration export CSV
const exportConfig: DataTableExportConfig<TicketingCampaignDTO> = {
  filename: 'helloasso_campagnes',
  columns: [
    { header: 'ID', accessor: (c) => c.id },
    { header: 'Titre', accessor: (c) => c.title },
    { header: 'Type', accessor: (c) => getCategoryLabel(c.campaign_category) },
    { header: 'Form Slug', accessor: (c) => c.form_slug },
    { header: 'Saison', accessor: (c) => getCampaignSeason(c) },
    { header: 'Date début', accessor: (c) => c.start_date || '' },
    { header: 'Date fin', accessor: (c) => c.end_date || '' },
    { header: 'Total Inscrits', accessor: (c) => c.total_items },
    { header: 'Pointés Présents', accessor: (c) => c.checked_in_count },
    {
      header: 'Montant collecté (€)',
      accessor: (c) => ((c.total_amount_cents || 0) / 100).toFixed(2)
    },
    { header: 'Dernière synchro', accessor: (c) => c.last_sync_at || '' }
  ]
};

onIonViewWillEnter(async () => {
  await ticketingStore.refetchCampaigns();
});
</script>

