<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/admin/helloasso" />
        </ion-buttons>
        <ion-title>{{ campaign?.title || 'Détail Collecte HelloAsso' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="isLoadingItems" @click="refreshItems">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <!-- État de chargement initial de la campagne -->
        <div v-if="!campaign && isCampaignsLoading" class="ion-text-center ion-padding">
          <ion-spinner name="crescent" color="primary" />
          <p>Chargement de la collecte...</p>
        </div>

        <template v-else-if="campaign">
          <!-- Carte En-tête / Synthèse Campagne & Émargement -->
          <ion-card class="ion-no-margin ion-margin-bottom helloasso-summary-card">
            <ion-card-header>
              <div class="summary-top-row">
                <div class="summary-badges">
                  <ion-badge :color="getCategoryColor(campaign.campaign_category)">
                    {{ getCategoryLabel(campaign.campaign_category) }}
                  </ion-badge>
                  <ion-badge v-if="campaignSeason" color="light">
                    Saison {{ campaignSeason }}
                  </ion-badge>
                  <ion-badge v-if="campaign.form_type" color="medium">
                    {{ campaign.form_type }}
                  </ion-badge>
                </div>
                <div class="summary-amount">
                  {{ formatAmount(campaign.total_amount_cents) }}
                </div>
              </div>
              <ion-card-title class="summary-title">{{ campaign.title }}</ion-card-title>
              <ion-card-subtitle v-if="formatCampaignDate(campaign)">
                {{ formatCampaignDate(campaign) }}
              </ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <!-- Barre de progression du pointage -->
              <div class="checkin-progress-section">
                <div class="checkin-progress-labels">
                  <span class="progress-title">
                    <ion-icon :icon="checkmarkCircleOutline" color="success" />
                    <strong>{{ checkedInCount }}</strong> / {{ totalCount }} présents
                  </span>
                  <span class="progress-percentage">{{ checkinPercentage }}% pointés</span>
                </div>
                <ion-progress-bar
                  :value="totalCount > 0 ? checkedInCount / totalCount : 0"
                  color="success"
                  class="checkin-progress-bar"
                />
              </div>

              <!-- Ventilation par tarifs / formules -->
              <div v-if="campaign.tiers && Object.keys(campaign.tiers).length > 0" class="tiers-breakdown">
                <span class="tiers-label">Formules :</span>
                <div class="tiers-chips">
                  <ion-chip
                    v-for="(count, tierName) in campaign.tiers"
                    :key="tierName"
                    :color="selectedTier === tierName ? 'primary' : 'medium'"
                    @click="toggleTierFilter(tierName)"
                  >
                    <ion-label>{{ tierName }} ({{ count }})</ion-label>
                  </ion-chip>
                </div>
              </div>

              <!-- Boutons d'action : Inscription sur place & Exports -->
              <div class="action-buttons-row">
                <ion-button color="primary" @click="openOnSiteModal">
                  <ion-icon slot="start" :icon="personAddOutline" />
                  + Inscription sur place
                </ion-button>
                <ion-button fill="outline" color="secondary" @click="exportStandardCsv">
                  <ion-icon slot="start" :icon="downloadOutline" />
                  Export CSV
                </ion-button>
                <ion-button fill="outline" color="dark" @click="exportSharlyCsv">
                  <ion-icon slot="start" :icon="documentTextOutline" />
                  Export Sharly (Arbitre)
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Filtres & Recherche rapide -->
          <div class="helloasso-filter-bar ion-margin-bottom">
            <ion-searchbar
              v-model="searchQuery"
              placeholder="Rechercher joueur, licence, club, payeur..."
              :debounce="200"
              class="helloasso-searchbar"
            />

            <ion-segment v-model="statusFilter" class="status-segment">
              <ion-segment-button value="all">
                <ion-label>Tous ({{ totalCount }})</ion-label>
              </ion-segment-button>
              <ion-segment-button value="checked_in">
                <ion-label>Présents ({{ checkedInCount }})</ion-label>
              </ion-segment-button>
              <ion-segment-button value="pending">
                <ion-label>En attente ({{ totalCount - checkedInCount }})</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>

          <!-- Spinner chargement des inscrits -->
          <div v-if="isLoadingItems && items.length === 0" class="ion-text-center ion-padding">
            <ion-spinner name="crescent" color="primary" />
            <p>Chargement des participants...</p>
          </div>

          <!-- Liste / Tableau des inscrits -->
          <template v-else>
            <div v-if="filteredItems.length === 0" class="ion-text-center ion-padding empty-state-box">
              <p>Aucun participant ne correspond aux critères.</p>
              <ion-button v-if="searchQuery || statusFilter !== 'all' || selectedTier" fill="clear" @click="resetFilters">
                Réinitialiser les filtres
              </ion-button>
            </div>

            <!-- VUE DESKTOP (> 768px) -->
            <div v-else class="desktop-items-view">
              <div class="table-responsive">
                <table class="dame-table helloasso-table">
                  <thead>
                    <tr>
                      <th style="width: 130px;">Pointage</th>
                      <th>Participant</th>
                      <th>Club / Licence</th>
                      <th>Elo / FIDE</th>
                      <th>Tarif & Montant</th>
                      <th>Paiement</th>
                      <th style="width: 90px;">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in filteredItems"
                      :key="item.id"
                      :class="{ 'row-checked-in': item.checked_in }"
                      @click="openDetailModal(item)"
                    >
                      <!-- Action de pointage 1-clic -->
                      <td class="checkin-action-cell" @click.stop>
                        <ion-button
                          :color="item.checked_in ? 'success' : 'primary'"
                          :fill="item.checked_in ? 'solid' : 'outline'"
                          size="small"
                          class="pointage-btn"
                          :disabled="isMutatingCheckin(item.id)"
                          @click="handleCheckinToggle(item)"
                        >
                          <ion-icon slot="start" :icon="item.checked_in ? checkmarkOutline : radioButtonOffOutline" />
                          {{ item.checked_in ? 'Présent' : 'Pointer' }}
                        </ion-button>
                      </td>

                      <!-- Nom & Badges -->
                      <td>
                        <div class="participant-name-cell">
                          <strong>{{ item.participant_last_name.toUpperCase() }} {{ item.participant_first_name }}</strong>
                          <div class="cell-badges">
                            <span v-if="item.matched_adherent_id > 0" class="badge-club-adherent">
                              ★ Adhérent
                            </span>
                            <span v-else class="badge-external">
                              Externe / Ligue
                            </span>
                            <span v-if="item.source === 'onsite'" class="badge-onsite">
                              Sur place
                            </span>
                          </div>
                        </div>
                      </td>

                      <!-- Club & Licence -->
                      <td>
                        <div class="sub-info-block">
                          <span class="club-title">{{ item.club_name || 'Non renseigné' }}</span>
                          <span v-if="item.license_number" class="license-label">Licence : {{ item.license_number }}</span>
                        </div>
                      </td>

                      <!-- Elo & FIDE -->
                      <td>
                        <div class="sub-info-block">
                          <span class="elo-badge">{{ item.elo ? item.elo + ' Elo' : 'Non classé' }}</span>
                          <span v-if="item.fide_id" class="fide-label">FIDE : {{ item.fide_id }}</span>
                        </div>
                      </td>

                      <!-- Tarif & Montant -->
                      <td>
                        <div class="sub-info-block">
                          <span class="tier-label">{{ item.tier_name || 'Standard' }}</span>
                          <span class="amount-label">{{ formatAmount(item.amount_cents) }}</span>
                        </div>
                      </td>

                      <!-- Mode de Paiement & Date -->
                      <td>
                        <div class="sub-info-block">
                          <span class="payment-method-label">{{ item.payment_method }}</span>
                          <span v-if="item.order_date" class="date-label">{{ formatDateFr(item.order_date) }}</span>
                        </div>
                      </td>

                      <!-- Bouton détail -->
                      <td class="action-cell" @click.stop="openDetailModal(item)">
                        <ion-button fill="clear" size="small" color="medium">
                          <ion-icon slot="icon-only" :icon="eyeOutline" />
                        </ion-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- VUE MOBILE (<= 768px) -->
            <div class="mobile-items-view">
              <ion-card
                v-for="item in filteredItems"
                :key="'mob-' + item.id"
                class="participant-mobile-card"
                :class="{ 'card-checked-in': item.checked_in }"
                @click="openDetailModal(item)"
              >
                <div class="card-mobile-body">
                  <div class="card-info-col">
                    <div class="card-header-line">
                      <h3 class="participant-name">
                        {{ item.participant_last_name.toUpperCase() }} {{ item.participant_first_name }}
                      </h3>
                    </div>

                    <div class="card-badges-line">
                      <span v-if="item.matched_adherent_id > 0" class="badge-club-adherent">
                        ★ Adhérent
                      </span>
                      <span v-else class="badge-external">
                        Externe
                      </span>
                      <span v-if="item.source === 'onsite'" class="badge-onsite">
                        Sur place
                      </span>
                      <span v-if="item.elo" class="elo-tag">
                        {{ item.elo }} Elo
                      </span>
                    </div>

                    <div class="card-details-line">
                      <p v-if="item.club_name" class="club-line">
                        <ion-icon :icon="businessOutline" /> {{ item.club_name }}
                      </p>
                      <p class="tier-line">
                        {{ item.tier_name || 'Tarif standard' }} • {{ formatAmount(item.amount_cents) }} ({{ item.payment_method }})
                      </p>
                      <p v-if="item.license_number" class="license-line">
                        Licence : <strong>{{ item.license_number }}</strong>
                        <span v-if="item.fide_id"> | FIDE : {{ item.fide_id }}</span>
                      </p>
                    </div>
                  </div>

                  <!-- Bouton pointage tactile à droite -->
                  <div class="card-action-col" @click.stop>
                    <ion-button
                      :color="item.checked_in ? 'success' : 'primary'"
                      :fill="item.checked_in ? 'solid' : 'outline'"
                      class="mobile-checkin-btn"
                      :disabled="isMutatingCheckin(item.id)"
                      @click="handleCheckinToggle(item)"
                    >
                      <ion-icon slot="icon-only" :icon="item.checked_in ? checkmarkOutline : radioButtonOffOutline" />
                    </ion-button>
                    <span class="mobile-checkin-text">{{ item.checked_in ? 'Présent' : 'Pointer' }}</span>
                  </div>
                </div>
              </ion-card>
            </div>
          </template>
        </template>
      </div>

      <!-- MODALE DÉTAIL D'UN PARTICIPANT -->
      <ion-modal :is-open="isDetailModalOpen" @did-dismiss="closeDetailModal">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Fiche Participant</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeDetailModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content v-if="selectedItem" class="ion-padding">
          <div class="modal-detail-wrapper">
            <!-- Statut Pointage -->
            <div class="detail-checkin-header" :class="{ 'is-checked': selectedItem.checked_in }">
              <div class="checkin-header-info">
                <ion-icon :icon="selectedItem.checked_in ? checkmarkCircle : alertCircleOutline" />
                <div>
                  <h4>{{ selectedItem.checked_in ? 'Participant pointé présent' : 'En attente de pointage' }}</h4>
                  <p v-if="selectedItem.checked_in && selectedItem.checked_in_at">
                    Émargé le {{ formatDateFr(selectedItem.checked_in_at) }}
                  </p>
                </div>
              </div>
              <ion-button
                :color="selectedItem.checked_in ? 'warning' : 'success'"
                fill="solid"
                size="small"
                @click="handleCheckinToggle(selectedItem)"
              >
                {{ selectedItem.checked_in ? 'Annuler pointage' : 'Pointer présent' }}
              </ion-button>
            </div>

            <!-- Fiche Joueur -->
            <ion-list lines="full">
              <ion-list-header>
                <ion-label>Identité Joueur</ion-label>
              </ion-list-header>
              <ion-item>
                <ion-label>
                  <h3>Nom complet</h3>
                  <p>{{ selectedItem.participant_first_name }} {{ selectedItem.participant_last_name }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.participant_birth_date">
                <ion-label>
                  <h3>Date de naissance</h3>
                  <p>{{ formatDateFr(selectedItem.participant_birth_date) }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.participant_email">
                <ion-label>
                  <h3>Email participant</h3>
                  <p>{{ selectedItem.participant_email }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.phone">
                <ion-label>
                  <h3>Téléphone</h3>
                  <p>{{ selectedItem.phone }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Club d'échecs</h3>
                  <p>{{ selectedItem.club_name || 'Non renseigné' }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Licence FFE</h3>
                  <p>{{ selectedItem.license_number || 'Aucune' }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.fide_id">
                <ion-label>
                  <h3>Code FIDE</h3>
                  <p>{{ selectedItem.fide_id }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.elo">
                <ion-label>
                  <h3>Classement Elo</h3>
                  <p>{{ selectedItem.elo }}</p>
                </ion-label>
              </ion-item>
            </ion-list>

            <!-- Fiche Paiement & Commande -->
            <ion-list lines="full">
              <ion-list-header>
                <ion-label>Détails Commande & Paiement</ion-label>
              </ion-list-header>
              <ion-item>
                <ion-label>
                  <h3>Tarif / Formule</h3>
                  <p>{{ selectedItem.tier_name || 'Standard' }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Montant réglé</h3>
                  <p>{{ formatAmount(selectedItem.amount_cents) }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Mode de paiement & Origine</h3>
                  <p>{{ selectedItem.payment_method }} ({{ selectedItem.source === 'onsite' ? 'Sur place' : 'HelloAsso' }})</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.payer_first_name || selectedItem.payer_last_name">
                <ion-label>
                  <h3>Payeur</h3>
                  <p>{{ selectedItem.payer_first_name }} {{ selectedItem.payer_last_name }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.payer_email">
                <ion-label>
                  <h3>Email payeur</h3>
                  <p>{{ selectedItem.payer_email }}</p>
                </ion-label>
              </ion-item>
              <ion-item v-if="selectedItem.order_date">
                <ion-label>
                  <h3>Date d'enregistrement</h3>
                  <p>{{ formatDateFr(selectedItem.order_date) }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </ion-content>
      </ion-modal>

      <!-- MODALE INSCRIPTION SUR PLACE -->
      <ion-modal :is-open="isOnSiteModalOpen" @did-dismiss="closeOnSiteModal">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Inscription sur Place</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeOnSiteModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <form @submit.prevent="submitOnSiteParticipant" class="form-container">
            <ion-list lines="full">
              <ion-item>
                <ion-label position="stacked">Prénom *</ion-label>
                <ion-input
                  v-model="onSiteForm.participant_first_name"
                  placeholder="Ex : Julien"
                  required
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Nom *</ion-label>
                <ion-input
                  v-model="onSiteForm.participant_last_name"
                  placeholder="Ex : Dupont"
                  required
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Email</ion-label>
                <ion-input
                  v-model="onSiteForm.participant_email"
                  type="email"
                  placeholder="Ex : julien@exemple.fr"
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Numéro de licence FFE</ion-label>
                <ion-input
                  v-model="onSiteForm.license_number"
                  placeholder="Ex : N12345"
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Nom du club</ion-label>
                <ion-input
                  v-model="onSiteForm.club_name"
                  placeholder="Ex : Échiquier Lédonien"
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Classement Elo</ion-label>
                <ion-input
                  v-model.number="onSiteForm.elo"
                  type="number"
                  placeholder="Ex : 1550"
                />
              </ion-item>

              <!-- Sélection du Tarif issu de la campagne ou libre -->
              <ion-item>
                <ion-label position="stacked">Formule / Tarif</ion-label>
                <ion-select
                  v-if="campaign && campaign.tiers && Object.keys(campaign.tiers).length > 0"
                  v-model="onSiteForm.tier_name"
                  interface="popover"
                  placeholder="Sélectionner une formule"
                >
                  <ion-select-option
                    v-for="tier in Object.keys(campaign.tiers)"
                    :key="tier"
                    :value="tier"
                  >
                    {{ tier }}
                  </ion-select-option>
                  <ion-select-option value="Autre">Autre tarif</ion-select-option>
                </ion-select>
                <ion-input
                  v-else
                  v-model="onSiteForm.tier_name"
                  placeholder="Ex : Open Principal"
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Montant réglé (€)</ion-label>
                <ion-input
                  v-model.number="onSiteForm.amount"
                  type="number"
                  step="0.5"
                  placeholder="Ex : 20.00"
                />
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Moyen de paiement</ion-label>
                <ion-select
                  v-model="onSiteForm.payment_method"
                  interface="popover"
                >
                  <ion-select-option value="Espèces">Espèces</ion-select-option>
                  <ion-select-option value="Chèque">Chèque</ion-select-option>
                  <ion-select-option value="Autre">Autre</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>

            <div class="ion-padding-top">
              <ion-button
                type="submit"
                expand="block"
                color="primary"
                :disabled="isSubmittingOnSite"
              >
                <ion-spinner v-if="isSubmittingOnSite" slot="start" name="crescent" />
                <ion-icon v-else slot="start" :icon="checkmarkCircleOutline" />
                Enregistrer & Pointer présent
              </ion-button>
            </div>
          </form>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonChip,
  IonLabel,
  IonProgressBar,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonModal,
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  toastController
} from '@ionic/vue';
import {
  refreshOutline,
  personAddOutline,
  downloadOutline,
  documentTextOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  radioButtonOffOutline,
  closeOutline,
  checkmarkCircle,
  alertCircleOutline,
  eyeOutline,
  businessOutline
} from 'ionicons/icons';
import { useTicketingStore } from '@/stores/ticketing';
import type {
  TicketingCampaignDTO,
  TicketingItemDTO,
  AddOnSiteParticipantRequest,
  CampaignCategory
} from '@/types/api/ticketing';
import { getSeasonFromDate, formatDateFr } from '@/utils/seasonUtils';

const route = useRoute();
const ticketingStore = useTicketingStore();
const { campaigns, isCampaignsLoading } = storeToRefs(ticketingStore);

const campaignId = computed(() => parseInt(route.params.id as string, 10));

// Campagne courante
const campaign = computed<TicketingCampaignDTO | undefined>(() => {
  return campaigns.value.find((c) => c.id === campaignId.value);
});

// État des participants
const items = ref<TicketingItemDTO[]>([]);
const isLoadingItems = ref(false);
const mutatingItemIds = ref<Set<number>>(new Set());

// Filtres
const searchQuery = ref('');
const statusFilter = ref<'all' | 'checked_in' | 'pending'>('all');
const selectedTier = ref<string | null>(null);

// Modale Détail
const isDetailModalOpen = ref(false);
const selectedItem = ref<TicketingItemDTO | null>(null);

// Modale Sur Place
const isOnSiteModalOpen = ref(false);
const isSubmittingOnSite = ref(false);
const onSiteForm = ref<AddOnSiteParticipantRequest>({
  participant_first_name: '',
  participant_last_name: '',
  participant_email: '',
  license_number: '',
  club_name: '',
  elo: undefined,
  tier_name: '',
  amount: 0,
  payment_method: 'Espèces'
});

const isMutatingCheckin = (id: number) => mutatingItemIds.value.has(id);

const campaignSeason = computed(() => {
  if (!campaign.value) return '';
  if (campaign.value.linked_season_id) {
    return `${campaign.value.linked_season_id}-${campaign.value.linked_season_id + 1}`;
  }
  return getSeasonFromDate(campaign.value.start_date) || '';
});

const totalCount = computed(() => items.value.length);
const checkedInCount = computed(() => items.value.filter((i) => i.checked_in).length);
const checkinPercentage = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((checkedInCount.value / totalCount.value) * 100);
});

// Chargement des inscrits
const loadItems = async () => {
  if (!campaignId.value) return;
  isLoadingItems.value = true;
  try {
    items.value = await ticketingStore.fetchCampaignItems(campaignId.value);
  } catch (err) {
    const toast = await toastController.create({
      message: 'Erreur lors du chargement des inscrits.',
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    isLoadingItems.value = false;
  }
};

const refreshItems = async () => {
  await Promise.all([loadItems(), ticketingStore.refetchCampaigns()]);
};

// Filtrage local en mémoire
const filteredItems = computed(() => {
  let list = items.value;

  // Filtre statut
  if (statusFilter.value === 'checked_in') {
    list = list.filter((i) => i.checked_in);
  } else if (statusFilter.value === 'pending') {
    list = list.filter((i) => !i.checked_in);
  }

  // Filtre tarif
  if (selectedTier.value) {
    list = list.filter((i) => i.tier_name === selectedTier.value);
  }

  // Recherche textuelle
  const query = searchQuery.value.trim().toLowerCase();
  if (query) {
    list = list.filter((i) => {
      const matchFirst = i.participant_first_name.toLowerCase().includes(query);
      const matchLast = i.participant_last_name.toLowerCase().includes(query);
      const matchLic = (i.license_number || '').toLowerCase().includes(query);
      const matchClub = (i.club_name || '').toLowerCase().includes(query);
      const matchEmail = (i.participant_email || '').toLowerCase().includes(query);
      const matchPayer = `${i.payer_first_name} ${i.payer_last_name}`.toLowerCase().includes(query);
      return matchFirst || matchLast || matchLic || matchClub || matchEmail || matchPayer;
    });
  }

  return list;
});

const toggleTierFilter = (tierName: string) => {
  selectedTier.value = selectedTier.value === tierName ? null : tierName;
};

const resetFilters = () => {
  searchQuery.value = '';
  statusFilter.value = 'all';
  selectedTier.value = null;
};

// Pointage 1-clic
const handleCheckinToggle = async (item: TicketingItemDTO) => {
  const newStatus = !item.checked_in;
  mutatingItemIds.value.add(item.id);

  // Mise à jour optimiste locale
  item.checked_in = newStatus;
  item.checked_in_at = newStatus ? new Date().toISOString() : null;

  try {
    await ticketingStore.checkinMutation.mutateAsync({
      itemId: item.id,
      campaignId: campaignId.value,
      checkedIn: newStatus
    });
  } catch (err) {
    // Revert en cas d'erreur
    item.checked_in = !newStatus;
    const toast = await toastController.create({
      message: 'Erreur lors de la mise à jour du pointage.',
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    mutatingItemIds.value.delete(item.id);
  }
};

// Modale détail
const openDetailModal = (item: TicketingItemDTO) => {
  selectedItem.value = item;
  isDetailModalOpen.value = true;
};

const closeDetailModal = () => {
  isDetailModalOpen.value = false;
  selectedItem.value = null;
};

// Modale Inscription sur place
const openOnSiteModal = () => {
  onSiteForm.value = {
    participant_first_name: '',
    participant_last_name: '',
    participant_email: '',
    license_number: '',
    club_name: '',
    elo: undefined,
    tier_name: campaign.value?.tiers ? Object.keys(campaign.value.tiers)[0] || '' : '',
    amount: 0,
    payment_method: 'Espèces'
  };
  isOnSiteModalOpen.value = true;
};

const closeOnSiteModal = () => {
  isOnSiteModalOpen.value = false;
};

const submitOnSiteParticipant = async () => {
  if (!onSiteForm.value.participant_first_name || !onSiteForm.value.participant_last_name) {
    return;
  }
  isSubmittingOnSite.value = true;
  try {
    await ticketingStore.addOnSiteMutation.mutateAsync({
      campaignId: campaignId.value,
      data: onSiteForm.value
    });
    const toast = await toastController.create({
      message: 'Participant enregistré et pointé avec succès !',
      duration: 2500,
      color: 'success'
    });
    await toast.present();
    closeOnSiteModal();
    await refreshItems();
  } catch (err) {
    const toast = await toastController.create({
      message: "Erreur lors de l'enregistrement du participant.",
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    isSubmittingOnSite.value = false;
  }
};

// Exports CSV & Sharly
const downloadCsv = (filename: string, content: string) => {
  // UTF-8 BOM \uFEFF pour compatibilité Excel
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportStandardCsv = () => {
  const headers = [
    'ID',
    'Nom',
    'Prénom',
    'Email',
    'Date de naissance',
    'N° Licence',
    'Code FIDE',
    'Elo',
    'Club',
    'Tarif',
    'Montant (€)',
    'Moyen de paiement',
    'Source',
    'Pointé',
    'Date pointage',
    'Nom Payeur',
    'Email Payeur',
    'Téléphone',
    'Date commande'
  ];

  const rows = filteredItems.value.map((i) => [
    i.id,
    `"${(i.participant_last_name || '').replace(/"/g, '""')}"`,
    `"${(i.participant_first_name || '').replace(/"/g, '""')}"`,
    `"${(i.participant_email || '').replace(/"/g, '""')}"`,
    i.participant_birth_date || '',
    i.license_number || '',
    i.fide_id || '',
    i.elo ?? '',
    `"${(i.club_name || '').replace(/"/g, '""')}"`,
    `"${(i.tier_name || '').replace(/"/g, '""')}"`,
    ((i.amount_cents || 0) / 100).toFixed(2),
    i.payment_method || '',
    i.source === 'onsite' ? 'Sur place' : 'HelloAsso',
    i.checked_in ? 'Oui' : 'Non',
    i.checked_in_at || '',
    `"${(i.payer_last_name || '').replace(/"/g, '""')}"`,
    `"${(i.payer_email || '').replace(/"/g, '""')}"`,
    i.phone || '',
    i.order_date || ''
  ]);

  const slug = campaign.value?.form_slug || `campagne_${campaignId.value}`;
  downloadCsv(
    `inscrits_${slug}.csv`,
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
  );
};

const exportSharlyCsv = () => {
  // Format Sharly Chess : Nom;Prénom;Sexe;Né(e) le;Catégorie;Titre;Féd;Elo;Rapide;Blitz;Code FIDE;N° FFE;Club
  const headers = [
    'Nom',
    'Prénom',
    'Sexe',
    'Né(e) le',
    'Catégorie',
    'Titre',
    'Féd',
    'Elo',
    'Rapide',
    'Blitz',
    'Code FIDE',
    'N° FFE',
    'Club'
  ];

  const rows = filteredItems.value.map((i) => [
    `"${(i.participant_last_name || '').toUpperCase().replace(/"/g, '""')}"`,
    `"${(i.participant_first_name || '').replace(/"/g, '""')}"`,
    '',
    i.participant_birth_date ? formatDateFr(i.participant_birth_date) : '',
    '',
    '',
    'FRA',
    i.elo ?? '',
    '',
    '',
    i.fide_id || '',
    i.license_number || '',
    `"${(i.club_name || '').replace(/"/g, '""')}"`
  ]);

  const slug = campaign.value?.form_slug || `campagne_${campaignId.value}`;
  downloadCsv(
    `sharly_${slug}.csv`,
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
  );
};

// Utilitaires de formatage
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

const formatAmount = (cents?: number | null): string => {
  const euros = (cents || 0) / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(euros);
};

const formatCampaignDate = (c: TicketingCampaignDTO): string => {
  if (!c.start_date) return '';
  const start = formatDateFr(c.start_date);
  if (c.end_date && c.end_date !== c.start_date) {
    return `Du ${start} au ${formatDateFr(c.end_date)}`;
  }
  return start;
};

onMounted(async () => {
  if (campaigns.value.length === 0) {
    await ticketingStore.refetchCampaigns();
  }
  await loadItems();
});
</script>
