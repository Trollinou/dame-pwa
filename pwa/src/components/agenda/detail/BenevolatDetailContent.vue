<template>
  <div class="benevolat-detail-content">
    <div v-if="benevolatStore.isLoading && !currentBenevolat" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Chargement de l'appel...</p>
    </div>

    <div v-else-if="currentBenevolat" class="benevolat-detail-content__body">
      <!-- En-tête -->
      <div class="header-section">
        <h1 v-safe-html="currentBenevolat.title.rendered"></h1>
        <div
          v-if="currentBenevolat.content?.rendered"
          class="description-content"
          v-safe-html="currentBenevolat.content.rendered"
        ></div>
      </div>

      <!-- VUE ADMIN : Liste des participants par créneau -->
      <div v-if="authStore.adminMode">
        <ion-list-header class="ion-no-padding ion-margin-bottom">
          <ion-label color="primary">Réponses et participants (Admin)</ion-label>
        </ion-list-header>

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
                <ion-card-header>
                  <ion-card-subtitle>{{ slot.start }} - {{ slot.end }}</ion-card-subtitle>
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
                  <div style="display: flex; flex-direction: column;">
                    <span>{{ slot.start }} - {{ slot.end }}</span>
                    <span style="font-size: 0.8em; opacity: 0.7;">
                      {{ getSlotParticipantCount(dIndex, tIndex) }} inscrit(s)
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
            <div v-else class="poll-ended-container">
              <p class="ion-text-center poll-ended-msg">
                Cet appel est terminé. Vous pouvez consulter vos participations ci-dessus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Introuvable -->
    <div v-else class="ion-text-center ion-padding not-found-container">
      <p>Appel à bénévoles introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
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
  toastController
} from '@ionic/vue';
import { alertCircle } from 'ionicons/icons';
import { useBenevolatStore, type Benevolat, type BenevolatReponse } from '@/stores/benevolat';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  benevolat?: Benevolat | null;
  benevolatId?: number | null;
}>();

const benevolatStore = useBenevolatStore();
const authStore = useAuthStore();

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

const getSlotParticipantCount = (dayIndex: number | string, timeIndex: number | string) => {
  if (!activeId.value) return 0;
  const choiceKey = `${dayIndex}_${timeIndex}`;
  return benevolatStore.reponses.filter(
    (r) => r.benevolat_id === activeId.value && Array.isArray(r.choices) && r.choices.includes(choiceKey)
  ).length;
};

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

const fetchMyVote = async () => {
  if (!authStore.token || !activeId.value) {
    selectedChoices.value = [];
    hasInitialVote.value = false;
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/dame/v1/benevolats/${activeId.value}/my-vote`,
      {
        headers: {
          Authorization: `Bearer ${authStore.token}`
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

const submitVote = async () => {
  if (selectedChoices.value.length === 0 || !authStore.token || !activeId.value) return;

  isSubmitting.value = true;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/dame/v1/benevolats/${activeId.value}/vote`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`
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
  fetchMyVote();
});

onMounted(() => {
  fetchMyVote();
});
</script>

<style scoped>
.benevolat-detail-content {
  width: 100%;
}

.header-section h1 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 12px;
}

.description-content :deep(p) {
  margin-bottom: 12px;
  line-height: 1.6;
}

.unauthenticated-box {
  background: var(--ion-color-light);
  border-radius: 12px;
  text-align: center;
}

.slot-card {
  border-radius: 8px;
  margin-bottom: 8px;
}

.no-participants {
  margin: 0;
  font-size: 0.9em;
  opacity: 0.7;
  font-style: italic;
}

.poll-ended-container {
  padding: 12px;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.poll-ended-msg {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9em;
}
</style>
