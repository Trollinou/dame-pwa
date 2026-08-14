<template>
  <div>
    <!-- Barre de bascule du mode de vue (Liste vs Calendrier) -->
    <div class="agenda-view-mode-toggle ion-padding-bottom">
      <ion-segment :value="viewMode" @ionChange="changeViewMode($event.detail.value as 'list' | 'calendar')">
        <ion-segment-button value="list">
          <ion-icon :icon="listOutline"></ion-icon>
          <ion-label>Liste</ion-label>
        </ion-segment-button>
        <ion-segment-button value="calendar">
          <ion-icon :icon="calendarOutline"></ion-icon>
          <ion-label>Calendrier</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>

    <!-- Mode 1 : Vue Calendrier (Style iOS) -->
    <AgendaCalendarView
      v-if="viewMode === 'calendar'"
      :events="filteredEvents"
      :today-str="todayStr"
      @go-to-detail="$emit('go-to-detail', $event)"
    />

    <!-- Mode 2 : Vue Liste infinie -->
    <div v-else>
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
      <ion-list v-else-if="filteredEvents.length > 0">
        <ion-item
          v-for="event in filteredEvents"
          :key="event.id"
          :id="'event-' + event.id"
          button
          @click="$emit('go-to-detail', event.id)"
          :class="{ 'past-event': isPast(event) }"
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

      <!-- Aucun résultat -->
      <div v-else class="ion-text-center ion-padding">
        <p v-if="searchQuery">Aucun événement ne correspond à "{{ searchQuery }}".</p>
        <p v-else>Aucun événement trouvé.</p>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSegment,
  IonSegmentButton,
  IonIcon
} from '@ionic/vue';
import { listOutline, calendarOutline } from 'ionicons/icons';
import type { AgendaEvent } from '@/stores/agenda';
import { removeAccents } from '@/utils/stringUtils';
import AgendaCalendarView from './AgendaCalendarView.vue';

const props = defineProps<{
  searchQuery: string;
  events: AgendaEvent[];
  isLoading: boolean;
  hasMorePast: boolean;
  hasMoreUpcoming: boolean;
  todayStr: string;
}>();

defineEmits<{
  (e: 'go-to-detail', id: number): void;
  (e: 'load-more-past', event: any): void;
  (e: 'load-more-upcoming', event: any): void;
}>();

// Persistance du mode de vue dans localStorage (Défaut: 'calendar')
const STORAGE_KEY = 'dame_agenda_view_mode';
const savedMode = (localStorage.getItem(STORAGE_KEY) as 'list' | 'calendar') || 'calendar';
const viewMode = ref<'list' | 'calendar'>(savedMode);

const changeViewMode = (mode: 'list' | 'calendar') => {
  if (mode) {
    viewMode.value = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }
};

const filteredEvents = computed(() => {
  let list = props.events;
  if (props.searchQuery.trim()) {
    const query = removeAccents(props.searchQuery.toLowerCase());
    list = props.events.filter((event) =>
      removeAccents((event.title?.raw || '').toLowerCase()).includes(query)
    );
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
</script>

<style scoped>
.agenda-view-mode-toggle {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: var(--ion-background-color, #ffffff);
  padding-top: 4px;
  padding-bottom: 8px;
  margin-top: 0;
}

ion-list { margin-top: 8px; }
h2 { font-weight: bold; }
p { color: var(--ion-color-medium); }
.past-event { opacity: 0.6; }
.past-event h2 { font-weight: normal; }
.upcoming-title { color: var(--ion-color-primary); }
ion-badge { margin-left: 8px; }
.list-category-indicator {
  width: 4px;
  height: 28px;
  border-radius: 2px;
  margin-right: 8px;
}
</style>
