<template>
  <div class="benevolat-detail-content">
    <div v-if="benevolatStore.isLoading && !currentBenevolat" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Chargement de l'appel...</p>
    </div>

    <div v-else-if="currentBenevolat" class="benevolat-detail-content__body">
      <!-- En-tête -->
      <div class="detail-header">
        <h1 v-safe-html="currentBenevolat.title.rendered"></h1>
      </div>
      <div
        v-if="currentBenevolat.content?.rendered"
        class="description-content ion-margin-bottom"
        v-safe-html="currentBenevolat.content.rendered"
      ></div>

      <!-- Bannière Événement lié -->
      <div
        v-if="currentBenevolat.linked_agenda"
        class="banner-linked-agenda ion-margin-bottom"
        role="button"
        tabindex="0"
        @click="goToLinkedAgenda(currentBenevolat.linked_agenda.id)"
        @keydown.enter="goToLinkedAgenda(currentBenevolat.linked_agenda.id)"
      >
        <span class="banner-linked-agenda__text">
          📅 Cet appel concerne l'événement :
          <strong v-safe-html="currentBenevolat.linked_agenda.title"></strong>
          (le {{ formatLinkedAgendaDate(currentBenevolat.linked_agenda.start_date) }})
        </span>
        <ion-icon :icon="chevronForwardOutline" class="banner-linked-agenda__arrow"></ion-icon>
      </div>

      <!-- VUE ADMIN : Liste des participants par créneau -->
      <div v-if="showAdminView">
        <div class="benevolat-admin-header-group ion-margin-bottom">
          <ion-list-header class="ion-no-padding">
            <ion-label color="primary">Réponses et participants (Admin)</ion-label>
          </ion-list-header>
          <div v-if="statsData || adminSummary.totalNeeded > 0" class="benevolat-admin-stats-bar">
            <ion-chip v-if="statsData" outline color="primary">
              {{ statsData.total_distinct_voters }} {{ statsData.total_distinct_voters > 1 ? 'participants uniques' : 'participant unique' }}
            </ion-chip>
            <ion-chip
              v-if="adminSummary.totalNeeded > 0"
              outline
              :color="adminSummary.totalFulfilled >= adminSummary.totalSlotsWithNeeded ? 'primary' : 'danger'"
            >
              {{ adminSummary.totalFulfilled }} / {{ adminSummary.totalSlotsWithNeeded }} créneaux pourvus
            </ion-chip>
          </div>
        </div>

        <ion-accordion-group>
          <ion-accordion
            v-for="(day, dIndex) in currentBenevolat.dame_benevolat_data"
            :key="dIndex"
            :value="'day-' + dIndex"
          >
            <ion-item slot="header" color="light">
              <ion-label>{{ formatDate(day.date) }}</ion-label>
            </ion-item>
            <div slot="content" class="ion-padding">
              <ion-card
                v-for="(slot, tIndex) in day.time_slots"
                :key="tIndex"
                class="slot-card ion-no-margin ion-margin-bottom"
              >
                <ion-card-header class="slot-card-header">
                  <ion-card-subtitle class="slot-card-subtitle">{{ slot.start }} - {{ slot.end }}</ion-card-subtitle>
                  <ion-badge
                    :color="getSlotAdminBadgeColor(slot, dIndex, tIndex)"
                    class="slot-ratio-badge"
                  >
                    {{ getSlotAdminRatioLabel(slot, dIndex, tIndex) }}
                  </ion-badge>
                </ion-card-header>
                <ion-card-content>
                  <div v-if="getParticipants(dIndex, tIndex).length > 0">
                    <ion-chip
                      color="primary"
                      v-for="participant in getParticipants(dIndex, tIndex)"
                      :key="participant.id"
                      v-safe-html="participant.title.rendered"
                    >
                    </ion-chip>
                  </div>
                  <p v-else class="no-participants">Aucune participation</p>
                </ion-card-content>
              </ion-card>
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </div>

      <!-- VUE ADHÉRENT / VISITEUR : Choix des créneaux & vote -->
      <div v-else>
        <ion-list-header class="ion-no-padding">
          <ion-label>Choisissez vos créneaux</ion-label>
        </ion-list-header>

        <!-- Non connecté -->
        <div v-if="!authStore.isAuthenticated" class="unauthenticated-box ion-padding ion-margin-vertical">
          <p>Vous devez être connecté avec votre compte adhérent pour vous inscrire.</p>
          <ion-button expand="block" router-link="/login">Se connecter</ion-button>
        </div>

        <!-- Connecté : Formulaire de vote -->
        <div v-else>
          <ion-list lines="full" class="options-list">
            <div v-for="(day, dIndex) in currentBenevolat.dame_benevolat_data" :key="dIndex">
              <ion-item-divider color="light">
                <ion-label>{{ formatDate(day.date) }}</ion-label>
              </ion-item-divider>

              <ion-item
                v-for="(slot, tIndex) in day.time_slots"
                :key="tIndex"
                :disabled="isDayPast(day.date)"
              >
                <ion-checkbox
                  :checked="selectedChoices.includes(`${dIndex}_${tIndex}`)"
                  @ion-change="toggleChoiceKey(`${dIndex}_${tIndex}`)"
                  :disabled="isDayPast(day.date)"
                  label-placement="start"
                  justify="space-between"
                >
                  <div class="slot-time-block">
                    <span>{{ slot.start }} - {{ slot.end }}</span>
                    <span
                      class="slot-count"
                      :class="{ 'slot-count--needed': slot.needed && slot.needed > 0 }"
                    >
                      {{ getSlotPublicLabel(slot, dIndex, tIndex) }}
                    </span>
                  </div>
                </ion-checkbox>
              </ion-item>
            </div>
          </ion-list>

          <div class="ion-padding-vertical">
            <ion-button
              v-if="!isPollFullyPast"
              expand="block"
              :disabled="selectedChoices.length === 0 || isSubmitting"
              @click="submitVote"
            >
              <ion-spinner v-if="isSubmitting" name="crescent"></ion-spinner>
              <span v-else>{{ hasInitialVote ? 'Mettre à jour ma participation' : 'Confirmer ma participation' }}</span>
            </ion-button>
            <div v-else class="dame-empty-state">
              <p class="ion-text-center poll-ended-msg">
                Cet appel est terminé. Vous pouvez consulter vos participations ci-dessus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Introuvable -->
    <div v-else class="ion-text-center ion-padding dame-empty-state">
      <p>Appel à bénévoles introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonList,
  IonListHeader,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonCheckbox,
  IonButton,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonAccordion,
  IonAccordionGroup,
  IonChip,
  IonIcon,
  toastController
} from '@ionic/vue';
import { alertCircle, chevronForwardOutline } from 'ionicons/icons';
import { safeFetch } from '@/utils/safeFetch';
import {
  useBenevolatStore,
  type Benevolat,
  type BenevolatTimeSlot,
  type BenevolatReponse,
  type BenevolatStatsResponse
} from '@/stores/benevolat';
import { useAuthStore } from '@/stores/auth';

const props = withDefaults(
  defineProps<{
    benevolat?: Benevolat | null;
    benevolatId?: number | null;
    isAdmin?: boolean;
  }>(),
  {
    benevolat: null,
    benevolatId: null,
    isAdmin: undefined
  }
);

const benevolatStore = useBenevolatStore();
const authStore = useAuthStore();
const router = useRouter();

const formatLinkedAgendaDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split('-').reverse().join('/');
};

const goToLinkedAgenda = (agendaId: number) => {
  if (authStore.adminMode) {
    router.push(`/admin/agenda/${agendaId}`);
  } else {
    router.push(`/agenda/${agendaId}`);
  }
};

const showAdminView = computed(() => {
  if (props.isAdmin !== undefined) {
    return props.isAdmin;
  }
  return authStore.adminMode;
});

const currentBenevolat = computed(() => {
  if (props.benevolat) return props.benevolat;
  if (props.benevolatId) {
    return benevolatStore.benevolats.find((b) => b.id === props.benevolatId) || null;
  }
  return null;
});

const activeId = computed(() => currentBenevolat.value?.id || 0);

const selectedChoices = ref<string[]>([]);
const isSubmitting = ref(false);
const hasInitialVote = ref(false);
const statsData = ref<BenevolatStatsResponse | null>(null);

const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayStr = getTodayStr();

const isDayPast = (date: string) => {
  if (!date) return false;
  return date < todayStr;
};

const isPollFullyPast = computed(() => {
  if (!currentBenevolat.value || !Array.isArray(currentBenevolat.value.dame_benevolat_data)) return false;
  return currentBenevolat.value.dame_benevolat_data.every((day) => isDayPast(day.date));
});

const getSlotParticipantCount = (dayIndex: number | string, timeIndex: number | string): number => {
  const choiceKey = `${dayIndex}_${timeIndex}`;
  if (statsData.value?.slots) {
    const slotStat = statsData.value.slots.find((s) => s.choice_key === choiceKey);
    if (slotStat !== undefined) {
      return slotStat.registered_count;
    }
  }
  if (currentBenevolat.value?.dame_benevolat_counts?.[choiceKey] !== undefined) {
    return currentBenevolat.value.dame_benevolat_counts[choiceKey];
  }
  if (!activeId.value) return 0;
  return benevolatStore.reponses.filter(
    (r) => r.benevolat_id === activeId.value && Array.isArray(r.choices) && r.choices.includes(choiceKey)
  ).length;
};

const isSlotFulfilled = (
  slot: BenevolatTimeSlot,
  dayIndex: number | string,
  timeIndex: number | string
): boolean => {
  const choiceKey = `${dayIndex}_${timeIndex}`;
  if (statsData.value?.slots) {
    const slotStat = statsData.value.slots.find((s) => s.choice_key === choiceKey);
    if (slotStat !== undefined) {
      return slotStat.is_fulfilled;
    }
  }
  const count = getSlotParticipantCount(dayIndex, timeIndex);
  const needed = slot.needed ? Number(slot.needed) : 0;
  return needed > 0 && count >= needed;
};

const getSlotPublicLabel = (
  slot: BenevolatTimeSlot,
  dayIndex: number | string,
  timeIndex: number | string
): string => {
  const count = getSlotParticipantCount(dayIndex, timeIndex);
  const needed = slot.needed ? Number(slot.needed) : 0;
  if (needed > 0) {
    const countLabel = `${count} ${count > 1 ? 'inscrits' : 'inscrit'}`;
    const neededLabel = `${needed} ${needed > 1 ? 'souhaités' : 'souhaité'}`;
    return `(${countLabel} / ${neededLabel})`;
  }
  const countLabel = `${count} ${count > 1 ? 'inscrits' : 'inscrit'}`;
  return `(${countLabel})`;
};

const getSlotAdminRatioLabel = (
  slot: BenevolatTimeSlot,
  dayIndex: number | string,
  timeIndex: number | string
): string => {
  const count = getSlotParticipantCount(dayIndex, timeIndex);
  const needed = slot.needed ? Number(slot.needed) : 0;
  if (needed > 0) {
    return `${count} / ${needed} souhaité(s)`;
  }
  return `${count} ${count > 1 ? 'inscrits' : 'inscrit'}`;
};

const getSlotAdminBadgeColor = (
  slot: BenevolatTimeSlot,
  dayIndex: number | string,
  timeIndex: number | string
): string => {
  const needed = slot.needed ? Number(slot.needed) : 0;
  if (needed > 0) {
    return isSlotFulfilled(slot, dayIndex, timeIndex) ? 'primary' : 'danger';
  }
  return 'medium';
};

const adminSummary = computed(() => {
  let totalNeeded = 0;
  let totalSlotsWithNeeded = 0;
  let totalFulfilled = 0;
  if (currentBenevolat.value?.dame_benevolat_data) {
    currentBenevolat.value.dame_benevolat_data.forEach((day, dIdx) => {
      day.time_slots?.forEach((slot, tIdx) => {
        const needed = slot.needed ? Number(slot.needed) : 0;
        if (needed > 0) {
          totalNeeded += needed;
          totalSlotsWithNeeded++;
          if (isSlotFulfilled(slot, dIdx, tIdx)) {
            totalFulfilled++;
          }
        }
      });
    });
  }
  return { totalNeeded, totalSlotsWithNeeded, totalFulfilled };
});

const getParticipants = (dayIndex: number | string, timeIndex: number | string): BenevolatReponse[] => {
  if (!activeId.value) return [];
  const choiceKey = `${dayIndex}_${timeIndex}`;
  return benevolatStore.reponses.filter(
    (r) => r.benevolat_id === activeId.value && Array.isArray(r.choices) && r.choices.includes(choiceKey)
  );
};

const toggleChoiceKey = (key: string) => {
  const index = selectedChoices.value.indexOf(key);
  if (index > -1) {
    selectedChoices.value.splice(index, 1);
  } else {
    selectedChoices.value.push(key);
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
};

const fetchStats = async () => {
  if (!activeId.value) {
    statsData.value = null;
    return;
  }
  statsData.value = await benevolatStore.fetchBenevolatStats(activeId.value);
};

const fetchMyVote = async () => {
  if (!authStore.isAuthenticated || !activeId.value) {
    selectedChoices.value = [];
    hasInitialVote.value = false;
    return;
  }

  try {
    const response = await safeFetch(
      `/dame/v1/benevolats/${activeId.value}/my-vote`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      selectedChoices.value = Array.isArray(data.choices) ? data.choices : [];
      if (selectedChoices.value.length > 0) {
        hasInitialVote.value = true;
        benevolatStore.markAsVoted(activeId.value);
      } else {
        hasInitialVote.value = false;
      }
    }
  } catch (error) {
    console.error('Erreur fetchMyVote:', error);
  }
};

const loadData = async () => {
  await Promise.all([fetchMyVote(), fetchStats()]);
};

const submitVote = async () => {
  if (selectedChoices.value.length === 0 || !authStore.isAuthenticated || !activeId.value) return;

  isSubmitting.value = true;

  try {
    const response = await safeFetch(
      `/dame/v1/benevolats/${activeId.value}/vote`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          choices: selectedChoices.value,
          member_id: authStore.selectedIdentity?.member_id
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      const toast = await toastController.create({
        message: hasInitialVote.value
          ? 'Participation mise à jour avec succès !'
          : 'Participation enregistrée avec succès !',
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
      hasInitialVote.value = true;
      benevolatStore.markAsVoted(activeId.value);
      await benevolatStore.fetchBenevolatsData(true);
      await fetchStats();
    } else if (response.status === 403 && data.code === 'already_voted') {
      const toast = await toastController.create({
        message: 'Vous avez déjà proposé votre aide pour cet appel.',
        duration: 3000,
        color: 'warning',
        icon: alertCircle
      });
      await toast.present();
    } else {
      throw new Error(data.message || "Erreur lors de l'envoi.");
    }
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const toast = await toastController.create({
      message: errorObj.message || "Une erreur est survenue lors de l'envoi.",
      duration: 4000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    isSubmitting.value = false;
  }
};

watch(activeId, () => {
  loadData();
});

onMounted(() => {
  loadData();
});
</script>
