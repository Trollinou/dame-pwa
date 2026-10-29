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
              <ion-badge :color="getFormTypeColor(row.form_type)">
                {{ getFormTypeLabel(row.form_type, row.campaign_category) }}
              </ion-badge>
              <ion-badge v-if="getCampaignSeason(row)" color="light" class="season-badge">
                {{ getCampaignSeason(row) }}
              </ion-badge>
              <ion-badge v-else color="light" class="season-badge">
                Permanente
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

const getFormTypeLabel = (formType?: string | null, fallbackCategory?: CampaignCategory): string => {
  if (formType) {
    switch (formType) {
      case 'Event':
        return 'Événements';
      case 'Membership':
        return 'Adhésions';
      case 'Donation':
        return 'Dons';
      case 'Shop':
        return 'Boutique';
      case 'Checkout':
        return 'Paiement direct';
      default:
        return formType;
    }
  }
  return fallbackCategory ? getCategoryLabel(fallbackCategory) : 'Autre';
};

const getFormTypeColor = (formType?: string | null): string => {
  switch (formType) {
    case 'Event':
      return 'primary';
    case 'Membership':
      return 'success';
    case 'Donation':
      return 'tertiary';
    case 'Shop':
      return 'warning';
    case 'Checkout':
      return 'secondary';
    default:
      return 'medium';
  }
};

const getCampaignSeason = (campaign: TicketingCampaignDTO): string => {
  if (campaign.linked_season_id) {
    return `${campaign.linked_season_id}-${campaign.linked_season_id + 1}`;
  }
  if (campaign.end_date) {
    const s = getSeasonFromDate(campaign.end_date);
    if (s) return s;
  }
  if (campaign.start_date) {
    const s = getSeasonFromDate(campaign.start_date);
    if (s) return s;
  }
  return '';
};

const formatAmount = (cents: number): string => {
  const euros = (cents || 0) / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(euros);
};

const extractTimeFormatted = (dateStr?: string | null): string | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split(/[T ]/);
  if (parts.length >= 2) {
    const timeParts = parts[1].split(':');
    if (timeParts.length >= 2) {
      const h = timeParts[0].padStart(2, '0');
      const m = timeParts[1].padStart(2, '0');
      if (h !== '00' || m !== '00') {
        return `${h}h${m}`;
      }
    }
  }
  return null;
};

const formatCampaignDate = (campaign: TicketingCampaignDTO): string => {
  if (!campaign.start_date && !campaign.end_date) {
    return 'Formulaire permanent';
  }
  if (!campaign.start_date && campaign.end_date) {
    return `Jusqu'au ${formatDateFr(campaign.end_date)}`;
  }
  if (campaign.start_date && !campaign.end_date) {
    const start = formatDateFr(campaign.start_date);
    const startTime = extractTimeFormatted(campaign.start_date);
    return startTime ? `${start} (à ${startTime})` : start;
  }

  const startDateFr = formatDateFr(campaign.start_date);
  const endDateFr = formatDateFr(campaign.end_date);

  // Même jour
  if (startDateFr === endDateFr) {
    const startTime = extractTimeFormatted(campaign.start_date);
    const endTime = extractTimeFormatted(campaign.end_date);
    if (startTime && endTime) {
      return `${startDateFr} (${startTime} à ${endTime})`;
    }
    if (startTime) {
      return `${startDateFr} (à ${startTime})`;
    }
    return startDateFr;
  }

  // Événement multi-jours
  return `Du ${startDateFr} au ${endDateFr}`;
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
    id: 'formTypeFilter',
    header: 'Type',
    accessorFn: (row) => getFormTypeLabel(row.form_type, row.campaign_category),
    cell: ({ row }) =>
      h(
        IonBadge,
        { color: getFormTypeColor(row.original.form_type) },
        () => getFormTypeLabel(row.original.form_type, row.original.campaign_category)
      ),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === 'all') return true;
      const rowType = String(row.original.form_type || '').toLowerCase();
      return rowType === String(filterValue).toLowerCase();
    },
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
      // Les collectes permanentes / sans date restent visibles quelle que soit la saison
      if (!rowSeason) return true;
      return rowSeason === String(filterValue);
    },
    enableHiding: true
  }
];

// Configuration des filtres (Saison & Type de collecte)
const filterConfigs = computed<DataTableFilterConfig[]>(() => {
  const total = campaigns.value.length;

  const categoryOptions = [
    { label: `Tous (${total})`, value: 'all' },
    { label: 'Événements', value: 'Event' },
    { label: 'Adhésions', value: 'Membership' },
    { label: 'Dons', value: 'Donation' },
    { label: 'Boutique', value: 'Shop' }
  ];

  // Et Paiement direct (Checkout) si présent
  const hasCheckout = campaigns.value.some(
    (c) => (c.form_type || '').toLowerCase() === 'checkout'
  );
  if (hasCheckout) {
    categoryOptions.push({ label: 'Paiement direct', value: 'Checkout' });
  }

  return [
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
      id: 'formTypeFilter',
      label: 'Type de collecte',
      defaultValue: 'all',
      options: categoryOptions
    }
  ];
});

// Configuration export CSV
const exportConfig: DataTableExportConfig<TicketingCampaignDTO> = {
  filename: 'helloasso_campagnes',
  columns: [
    { header: 'ID', accessor: (c) => c.id },
    { header: 'Titre', accessor: (c) => c.title },
    { header: 'Type', accessor: (c) => getFormTypeLabel(c.form_type, c.campaign_category) },
    { header: 'Form Slug', accessor: (c) => c.form_slug },
    { header: 'Form Type', accessor: (c) => c.form_type },
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

