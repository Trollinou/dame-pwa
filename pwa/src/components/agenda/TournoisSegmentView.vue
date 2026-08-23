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
          <!-- 1/3 GAUCHE : Liste des tournois -->
          <template #master>
            <ion-list class="tournaments-list" lines="full">
              <ion-item
                v-for="item in filteredTournaments"
                :key="item.id"
                button
                @click="handleTournamentClick(item)"
                :class="['tournament-item', { 'is-active': isTabletLandscape && item.object_id === selectedTournamentId }]"
              >
                <ion-icon slot="start" :icon="trophyOutline" color="primary" class="ion-margin-end"></ion-icon>
                <ion-label>
                  <h2 v-safe-html="item.title"></h2>
                  <p>Compétition</p>
                </ion-label>
                <ion-icon slot="end" :icon="chevronForwardOutline" color="medium" style="opacity: 0.6; font-size: 1.1rem;"></ion-icon>
              </ion-item>
            </ion-list>
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
.tournaments-list {
  background: transparent;
}

.tournament-item {
  border-radius: 8px;
  margin-bottom: 4px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.tournament-item.is-active {
  --background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.12);
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  font-weight: 600;
}

.tournament-item h2 {
  font-weight: 600;
  font-size: 1rem;
}

.tournament-item p {
  color: var(--ion-color-medium);
  font-size: 0.85rem;
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
