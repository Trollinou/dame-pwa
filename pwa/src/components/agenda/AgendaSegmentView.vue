<template>
  <div>
    <!-- Mode 1 : Vue Calendrier (Style iOS) -->
    <AgendaCalendarView
      v-if="viewMode === 'calendar'"
      :events="events"
      :today-str="todayStr"
      @go-to-detail="$emit('go-to-detail', $event)"
    />

    <!-- Mode 2 : Vue Liste infinie avec Split-View sur grand écran -->
    <div v-else>
      <SplitMasterDetail :has-selection="!!selectedEvent" empty-title="Aucun événement sélectionné" empty-message="Sélectionnez un événement dans la liste pour voir les détails.">
        <!-- 1/3 GAUCHE : Liste infinie -->
        <template #master>
          <!-- Infinite Scroll TOP (Historique) -->
          <ion-infinite-scroll
            v-if="!searchQuery && hasMorePast"
            position="top"
            @ionInfinite="$emit('load-more-past', $event)"
            :disabled="!hasMorePast || isLoading"
          >
            <ion-infinite-scroll-content
              loading-spinner="dots"
              loading-text="Chargement de l'historique..."
            >
            </ion-infinite-scroll-content>
          </ion-infinite-scroll>

          <!-- État de chargement initial -->
          <div v-if="isLoading && events.length === 0" class="ion-text-center ion-padding">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Chargement de l'agenda...</p>
          </div>

          <!-- Liste des événements -->
          <ion-list v-else-if="filteredEvents.length > 0" class="agenda-items-list">
            <ion-item
              v-for="event in filteredEvents"
              :key="event.id"
              :id="'event-' + event.id"
              button
              @click="handleEventClick(event)"
              :class="['agenda-item', { 'past-event': isPast(event), 'is-active': isTabletLandscape && event.id === selectedEventId }]"
            >
              <!-- Indicateur de couleur de catégorie -->
              <div
                v-if="event.categories_data && event.categories_data.length > 0"
                class="list-category-indicator"
                :style="{ backgroundColor: event.categories_data[0].color }"
              ></div>

              <ion-label class="ion-padding-start">
                <h2 :class="{ 'upcoming-title': !isPast(event) }" v-safe-html="event.title.rendered"></h2>
                <p>{{ formatEventDate(event) }}</p>
              </ion-label>
              <ion-badge v-if="isToday(event)" color="warning" slot="end">Actuellement</ion-badge>
            </ion-item>
          </ion-list>

          <!-- Aucun résultat ou échec de chargement -->
          <div v-else class="ion-text-center ion-padding">
            <p v-if="searchQuery">Aucun événement ne correspond à "{{ searchQuery }}".</p>
            <div v-else>
              <p>Aucun événement disponible pour le moment.</p>
              <ion-button fill="outline" size="small" @click="$emit('retry')">
                Actualiser l'agenda
              </ion-button>
            </div>
          </div>

          <!-- Infinite Scroll BOTTOM (Futur) -->
          <ion-infinite-scroll
            v-if="!searchQuery && hasMoreUpcoming"
            @ionInfinite="$emit('load-more-upcoming', $event)"
            :disabled="!hasMoreUpcoming || isLoading"
          >
            <ion-infinite-scroll-content
              loading-spinner="dots"
              loading-text="Chargement des événements futurs..."
            >
            </ion-infinite-scroll-content>
          </ion-infinite-scroll>
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
  IonButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  type InfiniteScrollCustomEvent
} from '@ionic/vue';
import type { AgendaEvent } from '@/stores/agenda';
import { removeAccents } from '@/utils/stringUtils';
import { useIsTabletLandscape } from '@/composables/useIsTabletLandscape';
import SplitMasterDetail from '@/components/shared/SplitMasterDetail.vue';
import AgendaDetailContent from '@/components/agenda/detail/AgendaDetailContent.vue';
import AgendaCalendarView from './AgendaCalendarView.vue';

const { isTabletLandscape } = useIsTabletLandscape();

const props = defineProps<{
  viewMode: 'list' | 'calendar';
  searchQuery: string;
  events: AgendaEvent[];
  isLoading: boolean;
  hasMorePast: boolean;
  hasMoreUpcoming: boolean;
  todayStr: string;
}>();

const emit = defineEmits<{
  (e: 'go-to-detail', id: number): void;
  (e: 'load-more-past', event: InfiniteScrollCustomEvent): void;
  (e: 'load-more-upcoming', event: InfiniteScrollCustomEvent): void;
  (e: 'retry'): void;
}>();

const selectedEventId = ref<number | null>(null);

const filteredEvents = computed(() => {
  let list = props.events;
  if (props.searchQuery.trim()) {
    const query = removeAccents(props.searchQuery.toLowerCase());
    list = props.events.filter((event) => {
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
 * Sélectionne intelligemment l'événement courant ou le premier événement à venir
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

  // 1. Chercher un événement "aujourd'hui" ou le premier futur
  const upcomingOrToday = filteredEvents.value.find((e) => !isPast(e));
  if (upcomingOrToday) {
    selectedEventId.value = upcomingOrToday.id;
    return;
  }

  // 2. Si tous les événements sont passés, prendre le plus récent (le dernier de la liste triée chronologiquement)
  const lastEvent = filteredEvents.value[filteredEvents.value.length - 1];
  selectedEventId.value = lastEvent ? lastEvent.id : null;
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

<style scoped>
.agenda-items-list {
  margin-top: 8px;
}

.agenda-item {
  border-radius: 8px;
  margin-bottom: 4px;
  --background-hover: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.08);
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.agenda-item.is-active {
  --background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.12);
  border-left: 4px solid var(--ion-color-primary, #3880ff);
  font-weight: 600;
}

h2 {
  font-weight: bold;
}

p {
  color: var(--ion-color-medium);
}

.past-event {
  opacity: 0.6;
}

.past-event h2 {
  font-weight: normal;
}

.upcoming-title {
  color: var(--ion-color-primary);
}

ion-badge {
  margin-left: 8px;
}

.list-category-indicator {
  width: 4px;
  height: 28px;
  border-radius: 2px;
  margin-right: 8px;
}
</style>
