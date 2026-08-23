<template>
  <div>
    <div v-if="benevolatStore.isLoading" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Chargement des appels à bénévoles...</p>
    </div>

    <div v-else>
      <div v-if="openBenevolats.length > 0 || finishedBenevolats.length > 0">
        <SplitMasterDetail
          :has-selection="!!selectedBenevolat"
          empty-title="Aucun appel sélectionné"
          empty-message="Sélectionnez un appel à bénévoles dans la liste pour consulter les créneaux ou vous inscrire."
        >
          <!-- 1/3 GAUCHE : Listes des appels -->
          <template #master>
            <!-- SECTION : APPELS EN COURS -->
            <ion-list v-if="openBenevolats.length > 0" lines="full">
              <ion-list-header>
                <ion-label color="primary">Appels en cours</ion-label>
              </ion-list-header>

              <ion-item
                v-for="benevolat in openBenevolats"
                :key="benevolat.id"
                button
                @click="handleBenevolatClick(benevolat)"
                :class="['benevolat-item', { 'is-active': isTabletLandscape && benevolat.id === selectedBenevolatId }]"
              >
                <ion-icon slot="start" :icon="handRightOutline" color="primary" class="ion-margin-end"></ion-icon>
                <ion-label>
                  <h2 v-safe-html="benevolat.title.rendered"></h2>
                  <p>{{ formatBenevolatDates(benevolat) }}</p>
                </ion-label>
                <div slot="end" style="display: flex; align-items: center; gap: 8px;">
                  <ion-badge
                    v-if="benevolatStore.hasUserVoted(benevolat.id) && !authStore.adminMode"
                    color="success"
                  >
                    Inscrit
                  </ion-badge>
                  <ion-badge
                    v-if="authStore.adminMode"
                    color="primary"
                  >
                    {{ benevolatStore.getResponseCount(benevolat.id) }} rép.
                  </ion-badge>
                </div>
              </ion-item>
            </ion-list>

            <!-- SECTION : APPELS TERMINÉS -->
            <ion-list v-if="finishedBenevolats.length > 0" lines="full" class="ion-margin-top">
              <ion-list-header>
                <ion-label color="medium">Appels terminés</ion-label>
              </ion-list-header>

              <ion-item
                v-for="benevolat in finishedBenevolats"
                :key="benevolat.id"
                button
                @click="handleBenevolatClick(benevolat)"
                :class="['benevolat-item', 'finished-item', { 'is-active': isTabletLandscape && benevolat.id === selectedBenevolatId }]"
              >
                <ion-icon slot="start" :icon="handRightOutline" color="medium" class="ion-margin-end" style="opacity: 0.6;"></ion-icon>
                <ion-label>
                  <h2 v-safe-html="benevolat.title.rendered"></h2>
                  <p>{{ formatBenevolatDates(benevolat) }}</p>
                </ion-label>
                <div slot="end" style="display: flex; align-items: center; gap: 8px;">
                  <ion-badge
                    v-if="benevolatStore.hasUserVoted(benevolat.id) && !authStore.adminMode"
                    color="success"
                    style="opacity: 0.7;"
                  >
                    Inscrit
                  </ion-badge>
                  <ion-badge
                    v-if="authStore.adminMode"
                    color="medium"
                  >
                    {{ benevolatStore.getResponseCount(benevolat.id) }} rép.
                  </ion-badge>
                </div>
              </ion-item>
            </ion-list>
          </template>

          <!-- 2/3 DROITE : Panneau d'inscription / détails -->
          <template #detail>
            <BenevolatDetailContent
              v-if="selectedBenevolat"
              :benevolat="selectedBenevolat"
              :benevolat-id="selectedBenevolat.id"
            />
          </template>
        </SplitMasterDetail>
      </div>

      <div v-else-if="!benevolatStore.isLoading" class="ion-text-center ion-padding">
        <p v-if="searchQuery">Aucun appel ne correspond à "{{ searchQuery }}".</p>
        <p v-else>Aucun appel à bénévoles disponible.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  IonSpinner,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon
} from '@ionic/vue';
import { handRightOutline } from 'ionicons/icons';
import { useBenevolatStore, type Benevolat } from '@/stores/benevolat';
import { useAuthStore } from '@/stores/auth';
import { removeAccents } from '@/utils/stringUtils';
import { useIsTabletLandscape } from '@/composables/useIsTabletLandscape';
import SplitMasterDetail from '@/components/shared/SplitMasterDetail.vue';
import BenevolatDetailContent from '@/components/agenda/detail/BenevolatDetailContent.vue';

const benevolatStore = useBenevolatStore();
const authStore = useAuthStore();
const { isTabletLandscape } = useIsTabletLandscape();

const props = defineProps<{
  searchQuery: string;
  todayStr: string;
}>();

const emit = defineEmits<{
  (e: 'view-benevolat', benevolat: Benevolat): void;
}>();

const selectedBenevolatId = ref<number | null>(null);

const filteredBenevolats = computed(() => {
  if (!props.searchQuery.trim()) return benevolatStore.benevolats;
  const query = removeAccents(props.searchQuery.toLowerCase());
  return benevolatStore.benevolats.filter((benevolat: Benevolat) =>
    removeAccents((benevolat.title?.rendered || '').toLowerCase()).includes(query)
  );
});

const isBenevolatPast = (benevolat: Benevolat): boolean => {
  if (!benevolat.dame_benevolat_data || !Array.isArray(benevolat.dame_benevolat_data) || benevolat.dame_benevolat_data.length === 0) {
    return false;
  }
  return benevolat.dame_benevolat_data.every((day) => day.date < props.todayStr);
};

const openBenevolats = computed(() => {
  return filteredBenevolats.value.filter((b) => !isBenevolatPast(b));
});

const finishedBenevolats = computed(() => {
  return filteredBenevolats.value.filter((b) => isBenevolatPast(b));
});

const selectedBenevolat = computed(() => {
  if (!selectedBenevolatId.value) return null;
  return filteredBenevolats.value.find((b) => b.id === selectedBenevolatId.value) || null;
});

const autoSelectFirst = () => {
  const all = [...openBenevolats.value, ...finishedBenevolats.value];
  if (all.length > 0) {
    const exists = all.some((b) => b.id === selectedBenevolatId.value);
    if (!exists) {
      // Priorité au premier appel en cours, sinon au premier terminé
      selectedBenevolatId.value = openBenevolats.value[0]?.id || finishedBenevolats.value[0]?.id || null;
    }
  } else {
    selectedBenevolatId.value = null;
  }
};

const handleBenevolatClick = (benevolat: Benevolat) => {
  selectedBenevolatId.value = benevolat.id;
  if (!isTabletLandscape.value) {
    emit('view-benevolat', benevolat);
  }
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short'
  }).format(date);
};

const formatBenevolatDates = (benevolat: Benevolat): string => {
  const data = benevolat.dame_benevolat_data;
  if (!data || !Array.isArray(data) || data.length === 0) return 'Dates non définies';

  if (data.length === 1) {
    return formatDate(data[0].date);
  }

  const sortedDates = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = formatDate(sortedDates[0].date);
  const lastDate = formatDate(sortedDates[sortedDates.length - 1].date);

  return `${firstDate} - ${lastDate} (${data.length} jours)`;
};

watch(filteredBenevolats, () => {
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
.benevolat-item {
  border-radius: 8px;
  margin-bottom: 4px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.benevolat-item.is-active {
  --background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.12);
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  font-weight: 600;
}

.finished-item {
  opacity: 0.75;
}

ion-list-header ion-label {
  font-weight: bold;
}
</style>
