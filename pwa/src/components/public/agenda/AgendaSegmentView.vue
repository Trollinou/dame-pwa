<template>
  <div>
    <!-- Mode 1 : Vue Calendrier (Style iOS) -->
    <AgendaCalendarView
      v-if="viewMode === 'calendar'"
      :events="events"
      :today-str="todayStr"
      @go-to-detail="$emit('go-to-detail', $event)"
    />

    <!-- Mode 2 : Vue Liste avec Split-View sur grand écran -->
    <div v-else>
      <SplitMasterDetail :has-selection="!!selectedEvent" empty-title="Aucun événement sélectionné" empty-message="Sélectionnez un événement dans la liste pour voir les détails.">
        <!-- 1/3 GAUCHE : Liste des événements à venir -->
        <template #master>
          <!-- État de chargement initial -->
          <div v-if="isLoading && events.length === 0" class="ion-text-center ion-padding">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Chargement de l'agenda...</p>
          </div>

          <!-- Liste des événements en cours ou à venir -->
          <ion-list v-else-if="filteredEvents.length > 0" class="agenda-items-list">
            <ion-item
              v-for="event in filteredEvents"
              :key="event.id"
              :id="'event-' + event.id"
              button
              @click="handleEventClick(event)"
              :class="['dame-list-item', { 'is-active': isTabletLandscape && event.id === selectedEventId }]"
            >
              <!-- Indicateur de couleur de catégorie -->
              <div
                class="category-color-bar"
                :style="{ backgroundColor: getEventPrimaryColor(event) }"
              ></div>

              <ion-label class="ion-padding-start">
                <h2 class="upcoming-title" v-safe-html="event.title.rendered"></h2>
                <p>{{ formatEventDate(event) }}</p>
              </ion-label>
              <ion-badge v-if="isToday(event)" color="warning" slot="end">Actuellement</ion-badge>
            </ion-item>
          </ion-list>

          <!-- Aucun résultat ou échec de chargement -->
          <div v-else class="ion-text-center ion-padding">
            <p v-if="searchQuery">Aucun événement à venir ne correspond à "{{ searchQuery }}".</p>
            <div v-else>
              <p>Aucun événement à venir pour le moment.</p>
              <ion-button fill="outline" size="small" @click="$emit('retry')">
                Actualiser l'agenda
              </ion-button>
            </div>
          </div>
        </template>

        <!-- 2/3 DROITE : Détail de l'événement sélectionné -->
        <template #detail>
          <AgendaDetailContent
            v-if="selectedEvent"
            :event="selectedEvent"
            :event-id="selectedEvent.id"
          />
        </template>
      </SplitMasterDetail>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton
} from '@ionic/vue';
import type { AgendaEvent } from '@/stores/agenda';
import { removeAccents } from '@/utils/stringUtils';
import { useIsTabletLandscape } from '@/composables/core/useIsTabletLandscape';
import SplitMasterDetail from '@/components/shared/SplitMasterDetail.vue';
import AgendaDetailContent from '@/components/public/agenda/detail/AgendaDetailContent.vue';
import AgendaCalendarView from './AgendaCalendarView.vue';

const { isTabletLandscape } = useIsTabletLandscape();

const props = defineProps<{
  viewMode: 'list' | 'calendar';
  searchQuery: string;
  events: AgendaEvent[];
  isLoading: boolean;
  todayStr: string;
}>();

const emit = defineEmits<{
  (e: 'go-to-detail', id: number): void;
  (e: 'retry'): void;
}>();

const selectedEventId = ref<number | null>(null);

const filteredEvents = computed(() => {
  // En vue liste : exclure formellement tout événement passé (seuls les événements en cours ou futurs sont conservés)
  let list = props.events.filter((event) => !isPast(event));

  if (props.searchQuery.trim()) {
    const query = removeAccents(props.searchQuery.toLowerCase());
    list = list.filter((event) => {
      const title = event.title?.rendered || event.title?.raw || '';
      const location = event.meta?._dame_location_name || '';
      const desc = event.meta?._dame_agenda_description || '';
      const categories = event.categories_data?.map((c) => c.name).join(' ') || '';
      const fullText = `${title} ${location} ${desc} ${categories}`;
      return removeAccents(fullText.toLowerCase()).includes(query);
    });
  }

  return [...list].sort((a, b) => {
    const dateA = a.meta?._dame_start_date || '';
    const dateB = b.meta?._dame_start_date || '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const timeA = a.meta?._dame_start_time || '';
    const timeB = b.meta?._dame_start_time || '';
    return timeA.localeCompare(timeB);
  });
});

const selectedEvent = computed(() => {
  if (!selectedEventId.value) return null;
  return filteredEvents.value.find((e) => e.id === selectedEventId.value) || null;
});

/**
 * Sélectionne le premier événement de la liste (le plus proche chronologiquement)
 */
const autoSelectUpcomingOrCurrent = () => {
  if (filteredEvents.value.length === 0) {
    selectedEventId.value = null;
    return;
  }

  // Si on a déjà une sélection valide dans la liste filtrée, on la conserve
  const exists = filteredEvents.value.some((e) => e.id === selectedEventId.value);
  if (exists) {
    return;
  }

  // Sélectionner le premier événement (en cours ou le plus proche à venir)
  selectedEventId.value = filteredEvents.value[0].id;
};

const handleEventClick = (event: AgendaEvent) => {
  selectedEventId.value = event.id;
  if (!isTabletLandscape.value) {
    emit('go-to-detail', event.id);
  }
};

const isPast = (event: AgendaEvent): boolean => {
  const referenceDate = event.meta?._dame_end_date || event.meta?._dame_start_date || '';
  return referenceDate < props.todayStr;
};

const isToday = (event: AgendaEvent): boolean => {
  const startDate = event.meta?._dame_start_date;
  const endDate = event.meta?._dame_end_date;

  if (!startDate) return false;

  if (endDate && startDate !== endDate) {
    return props.todayStr >= startDate && props.todayStr <= endDate;
  }

  return startDate === props.todayStr;
};

const formatPart = (dateString: string): string => {
  if (!dateString) return '';
  return dateString.split('-').reverse().join('/');
};

const formatEventDate = (event: AgendaEvent): string => {
  const meta = event.meta;
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
  return `Le ${formatPart(startDate)} (Toute la journée)`;
};

const getEventPrimaryColor = (event: AgendaEvent): string => {
  if (event.categories_data && event.categories_data.length > 0 && event.categories_data[0].color) {
    return event.categories_data[0].color;
  }
  return '#3880ff';
};

watch(filteredEvents, () => {
  if (isTabletLandscape.value) {
    autoSelectUpcomingOrCurrent();
  }
});

watch(isTabletLandscape, (landscape) => {
  if (landscape) {
    autoSelectUpcomingOrCurrent();
  }
});

onMounted(() => {
  autoSelectUpcomingOrCurrent();
});
</script>
