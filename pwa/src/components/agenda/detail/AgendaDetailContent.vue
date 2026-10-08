<template>
  <div class="agenda-detail-content">
    <div v-if="isLoading" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
    </div>

    <div v-else-if="currentEvent" class="agenda-detail-content__body">
      <div class="detail-header">
        <h1 v-safe-html="currentEvent.title.rendered"></h1>
      </div>

      <!-- Carte Détails -->
      <ion-card class="ion-no-margin ion-margin-bottom dame-panel">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="calendarOutline" color="primary"></ion-icon>
            Détails
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>
                <p>Date et Heure</p>
                <h3>{{ formatEventDate(currentEvent) }}</h3>
              </ion-label>
            </ion-item>
            <ion-item v-if="currentEvent.meta._dame_competition_type">
              <ion-label>
                <p>Type de compétition</p>
                <h3>{{ currentEvent.meta._dame_competition_type }}</h3>
              </ion-label>
            </ion-item>
            <ion-item v-if="currentEvent.meta._dame_level">
              <ion-label>
                <p>Niveau</p>
                <h3>{{ currentEvent.meta._dame_level }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Carte Lieu -->
      <ion-card
        v-if="currentEvent.meta._dame_location_name || currentEvent.meta._dame_address"
        class="ion-no-margin ion-margin-bottom dame-panel"
      >
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="locationOutline" color="primary"></ion-icon>
            Lieu
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h3 v-if="currentEvent.meta._dame_location_name">
                  <strong>{{ currentEvent.meta._dame_location_name }}</strong>
                </h3>
                <p v-if="currentEvent.meta._dame_address">{{ currentEvent.meta._dame_address }}</p>
                <p v-if="currentEvent.meta._dame_postal_code || currentEvent.meta._dame_city">
                  {{ currentEvent.meta._dame_postal_code }} {{ currentEvent.meta._dame_city }}
                </p>
              </ion-label>
              <ion-button
                slot="end"
                fill="clear"
                @click="openMap"
                aria-label="Ouvrir l'adresse dans l'application de carte"
              >
                <ion-icon slot="icon-only" :icon="locationOutline"></ion-icon>
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Carte Description -->
      <ion-card v-if="processedDescription.cleanHtml" class="ion-no-margin ion-margin-bottom dame-panel">
        <ion-card-header>
          <ion-card-title>
            <ion-icon :icon="informationCircleOutline" color="primary"></ion-icon>
            Description
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div
            class="description-content"
            v-safe-html="processedDescription.cleanHtml"
            @click="handleInternalLinks"
          ></div>
        </ion-card-content>
      </ion-card>
    </div>

    <!-- Introuvable -->
    <div v-else class="ion-text-center ion-padding dame-empty-state">
      <ion-icon :icon="calendarOutline" size="large" color="medium"></ion-icon>
      <h2>Événement introuvable</h2>
      <p>Cet événement n'existe pas ou n'est pas encore disponible.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonSpinner,
  isPlatform
} from '@ionic/vue';
import {
  calendarOutline,
  locationOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { useAgendaStore, type AgendaEvent } from '@/stores/agenda';
import { useInternalLinks } from '@/composables/useInternalLinks';

const props = defineProps<{
  event?: AgendaEvent | null;
  eventId?: number | null;
}>();

const agendaStore = useAgendaStore();
const { handleInternalLinks } = useInternalLinks();

const isLoading = computed(() => agendaStore.isLoading || agendaStore.isAdminEventsLoading);

const currentEvent = computed(() => {
  if (props.event) return props.event;
  if (props.eventId) {
    return (
      agendaStore.events.find((e) => e.id === props.eventId) ||
      agendaStore.adminEvents.find((e) => e.id === props.eventId) ||
      null
    );
  }
  return null;
});

const openMap = () => {
  if (!currentEvent.value) return;

  const meta = currentEvent.value.meta;
  const addressParts = [
    meta._dame_location_name,
    meta._dame_address,
    meta._dame_postal_code,
    meta._dame_city
  ].filter(Boolean);

  const fullAddress = addressParts.join(' ').trim();
  if (!fullAddress) return;

  const encodedAddress = encodeURIComponent(fullAddress);

  if (isPlatform('ios')) {
    window.open(`maps://maps.apple.com/?q=${encodedAddress}`, '_system');
  } else if (isPlatform('android')) {
    window.open(`geo:0,0?q=${encodedAddress}`, '_system');
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank', 'noopener,noreferrer');
  }
};

const processedDescription = computed(() => {
  const rawHtml =
    currentEvent.value?._dame_agenda_description_html ||
    currentEvent.value?.meta._dame_agenda_description ||
    '';

  const regex = /\[helloasso\s+campaign=(?:&nbsp;|\s)*[»"']*(https?:\/\/[^&"'\s»\]]+)(?:&nbsp;|\s)*[»"']*[^\]]*\]/gi;

  const cleanHtml = rawHtml.replace(regex, (match: string, url: string) => {
    return `<ion-button expand="block" class="ion-margin-top ion-margin-bottom" href="${url}" target="_blank">S'inscrire à l'événement</ion-button>`;
  });

  return { cleanHtml };
});

const formatPart = (dateString: string): string => {
  if (!dateString) return '';
  return dateString.split('-').reverse().join('/');
};

const formatEventDate = (eventItem: AgendaEvent): string => {
  const meta = eventItem.meta;
  const startDate = meta?._dame_start_date;
  const endDate = meta?._dame_end_date;

  if (!startDate) return 'Date non définie';

  if (endDate && startDate !== endDate) {
    return `Du ${formatPart(startDate)} au ${formatPart(endDate)}`;
  }

  const startTime = meta?._dame_start_time;
  const endTime = meta?._dame_end_time;
  const isAllDay = meta?._dame_all_day === 1;

  if (startTime && endTime && !isAllDay) {
    return `Le ${formatPart(startDate)} de ${startTime} à ${endTime}`;
  }

  if (startTime && !isAllDay) {
    return `Le ${formatPart(startDate)} à partir de ${startTime}`;
  }

  return `Le ${formatPart(startDate)}`;
};
</script>
