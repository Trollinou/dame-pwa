<template>
  <div>
    <div v-if="tournamentStore.isLoading" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Chargement des tournois...</p>
    </div>

    <div v-else-if="tournamentError && filteredTournaments.length === 0" class="ion-text-center ion-padding">
      <ion-icon :icon="cloudOfflineOutline" size="large" color="medium"></ion-icon>
      <p class="ion-margin-top">{{ tournamentError }}</p>
      <ion-button fill="solid" class="ion-margin-top" @click="$emit('retry')">Réessayer</ion-button>
    </div>

    <div v-else>
      <div v-if="tournamentError && filteredTournaments.length > 0" class="offline-banner ion-margin-bottom">
        <ion-icon :icon="cloudOfflineOutline"></ion-icon>
        <span>Mode hors-ligne : Affichage des données en cache</span>
      </div>

      <div v-if="filteredTournaments.length > 0">
        <SplitMasterDetail
          :has-selection="!!selectedTournamentId"
          empty-title="Aucun tournoi sélectionné"
          empty-message="Sélectionnez un tournoi dans la liste pour voir les modalités d'inscription et le règlement."
        >
          <!-- 1/3 GAUCHE : Cartes des tournois -->
          <template #master>
            <div class="tournaments-list">
              <ion-card
                v-for="item in filteredTournaments"
                :key="item.id"
                :class="['tournament-card', 'ion-no-margin', 'ion-margin-bottom', { 'is-active': isTabletLandscape && item.object_id === selectedTournamentId }]"
                button
                @click="handleTournamentClick(item)"
              >
                <ion-card-header>
                  <div class="card-icon-container">
                    <ion-icon :icon="trophyOutline" color="primary"></ion-icon>
                  </div>
                  <ion-card-subtitle>Compétition</ion-card-subtitle>
                  <ion-card-title v-safe-html="item.title"></ion-card-title>
                </ion-card-header>

                <ion-card-content>
                  <p>Découvrez les détails, les horaires et les modalités d'inscription pour ce tournoi.</p>
                  <div class="cta-container">
                    <span class="cta-text">Voir les détails</span>
                    <ion-icon :icon="chevronForwardOutline" size="small"></ion-icon>
                  </div>
                </ion-card-content>
              </ion-card>
            </div>
          </template>

          <!-- 2/3 DROITE : Panneau de détails en mode paysage / desktop -->
          <template #detail>
            <TournamentDetailContent
              v-if="selectedTournamentId"
              :page-id="selectedTournamentId"
            />
          </template>
        </SplitMasterDetail>
      </div>

      <div v-else-if="!tournamentStore.isLoading" class="ion-text-center ion-padding">
        <p v-if="searchQuery">Aucun tournoi ne correspond à "{{ searchQuery }}".</p>
        <p v-else>Aucun tournoi disponible pour le moment.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonButton
} from '@ionic/vue';
import { trophyOutline, chevronForwardOutline, cloudOfflineOutline } from 'ionicons/icons';
import { useTournamentStore, type MenuItem } from '@/stores/tournament';
import { removeAccents } from '@/utils/stringUtils';
import { useIsTabletLandscape } from '@/composables/useIsTabletLandscape';
import SplitMasterDetail from '@/components/shared/SplitMasterDetail.vue';
import TournamentDetailContent from '@/components/agenda/detail/TournamentDetailContent.vue';

const tournamentStore = useTournamentStore();
const { isTabletLandscape } = useIsTabletLandscape();

const props = defineProps<{
  searchQuery: string;
  tournamentError: string | null;
}>();

const emit = defineEmits<{
  (e: 'go-to-tournament-detail', id: number): void;
  (e: 'retry'): void;
}>();

const selectedTournamentId = ref<number | null>(null);

const filteredTournaments = computed(() => {
  const topLevel = tournamentStore.menuItems.filter((item) => String(item.parent) === '0');
  if (!props.searchQuery.trim()) return topLevel;
  const query = removeAccents(props.searchQuery.toLowerCase());
  return topLevel.filter((item) =>
    removeAccents((item.title || '').toLowerCase()).includes(query)
  );
});

const autoSelectFirst = () => {
  if (filteredTournaments.value.length > 0) {
    const exists = filteredTournaments.value.some((t) => t.object_id === selectedTournamentId.value);
    if (!exists) {
      selectedTournamentId.value = filteredTournaments.value[0].object_id;
    }
  } else {
    selectedTournamentId.value = null;
  }
};

const handleTournamentClick = (item: MenuItem) => {
  selectedTournamentId.value = item.object_id;
  if (!isTabletLandscape.value) {
    emit('go-to-tournament-detail', item.object_id);
  }
};

watch(filteredTournaments, () => {
  if (isTabletLandscape.value) {
    autoSelectFirst();
  }
});

watch(isTabletLandscape, (landscape) => {
  if (landscape) {
    autoSelectFirst();
  }
});

onMounted(() => {
  autoSelectFirst();
});
</script>

<style scoped>
.tournament-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  border: 2px solid transparent;
}

.tournament-card.is-active {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 4px 16px rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.2);
  transform: scale(1.01);
}

.card-icon-container {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.cta-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--ion-color-primary);
  font-weight: 500;
  margin-top: 10px;
}

.cta-text {
  margin-right: 4px;
}

.offline-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ion-color-warning-tint);
  color: var(--ion-color-warning-shade);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}
</style>
