<template>
  <div class="agenda-calendar-view">
    <!-- En-tête Navigation Mois -->
    <div class="calendar-header ion-padding-horizontal">
      <div class="month-title-wrapper">
        <h2 class="month-title">{{ monthYearTitle }}</h2>
        <ion-button fill="clear" size="small" class="today-button" @click="goToToday">
          Aujourd'hui
        </ion-button>
      </div>

      <div class="month-nav-buttons">
        <ion-button fill="clear" size="small" @click="prevMonth" aria-label="Mois précédent">
          <ion-icon :icon="chevronBackOutline" slot="icon-only"></ion-icon>
        </ion-button>
        <ion-button fill="clear" size="small" @click="nextMonth" aria-label="Mois suivant">
          <ion-icon :icon="chevronForwardOutline" slot="icon-only"></ion-icon>
        </ion-button>
      </div>
    </div>

    <!-- Jours de la semaine (L, M, M, J, V, S, D) -->
    <div class="calendar-weekdays">
      <div v-for="day in weekdays" :key="day" class="weekday-cell">
        {{ day }}
      </div>
    </div>

    <!-- Grille des jours du mois -->
    <div class="calendar-grid">
      <div
        v-for="(cell, index) in calendarCells"
        :key="index"
        class="day-cell"
        :class="{
          'other-month': !cell.isCurrentMonth,
          'is-today': cell.isToday,
          'is-selected': cell.dateStr === selectedDateStr,
          'has-events': cell.events.length > 0
        }"
        @click="selectDate(cell.dateStr)"
      >
        <div class="day-number-wrapper">
          <span class="day-number">{{ cell.dayNumber }}</span>
        </div>

        <!-- Symbole / Pastilles de couleur sous les chiffres -->
        <div class="event-dots-container">
          <span
            v-for="(color, dotIdx) in cell.categoryColors.slice(0, 4)"
            :key="dotIdx"
            class="event-dot"
            :style="{ backgroundColor: color }"
          ></span>
        </div>
      </div>
    </div>

    <!-- Section Liste des Événements du jour sélectionné -->
    <div class="selected-day-events ion-margin-top">
      <div class="selected-day-header ion-padding-horizontal">
        <h3>{{ formattedSelectedDate }}</h3>
        <span class="event-count-badge" v-if="selectedDayEvents.length > 0">
          {{ selectedDayEvents.length }} {{ selectedDayEvents.length > 1 ? 'événements' : 'événement' }}
        </span>
      </div>

      <ion-list v-if="selectedDayEvents.length > 0" class="day-event-list">
        <ion-item
          v-for="event in selectedDayEvents"
          :key="event.id"
          button
          detail
          @click="$emit('go-to-detail', event.id)"
          class="day-event-item"
        >
          <!-- Accent couleur catégorie à gauche -->
          <div
            class="category-color-bar"
            :style="{ backgroundColor: getEventPrimaryColor(event) }"
          ></div>

          <ion-label class="ion-padding-start">
            <h2 class="event-title" v-safe-html="event.title.rendered"></h2>
            <p class="event-time-location">
              <span class="time-range">{{ formatEventTime(event) }}</span>
              <span v-if="event.meta?._dame_location_name" class="location-name">
                • {{ event.meta._dame_location_name }}
              </span>
            </p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div v-else class="no-events-placeholder ion-text-center ion-padding">
        <p>Aucun événement prévu pour cette date.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IonButton, IonIcon, IonList, IonItem, IonLabel } from '@ionic/vue';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { useAgendaStore, type AgendaEvent } from '@/stores/agenda';

const props = defineProps<{
  events: AgendaEvent[];
  todayStr: string;
}>();



defineEmits<{
  (e: 'go-to-detail', id: number): void;
}>();

const agendaStore = useAgendaStore();

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Date de référence (Mois/Année affiché)
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth()); // 0-indexed (0 = Janvier)

// Déclenche le chargement des événements du mois à l'initialisation et à chaque changement de mois
watch(
  [currentYear, currentMonth],
  ([newYear, newMonth]) => {
    agendaStore.fetchMonthEvents(newYear, newMonth);
  },
  { immediate: true }
);

// Date sélectionnée (par défaut aujourd'hui)
const selectedDateStr = ref(props.todayStr || formatDateToIsoStr(now));


const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const monthYearTitle = computed(() => {
  return `${monthNames[currentMonth.value]} ${currentYear.value}`;
});

function formatDateToIsoStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

const goToToday = () => {
  const t = new Date();
  currentYear.value = t.getFullYear();
  currentMonth.value = t.getMonth();
  selectedDateStr.value = props.todayStr || formatDateToIsoStr(t);
};

const selectDate = (dateStr: string) => {
  selectedDateStr.value = dateStr;
};

interface CalendarCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: AgendaEvent[];
  categoryColors: string[];
}

const calendarCells = computed<CalendarCell[]>(() => {
  const cells: CalendarCell[] = [];
  const year = currentYear.value;
  const month = currentMonth.value;

  // Premier jour du mois
  const firstDayOfMonth = new Date(year, month, 1);
  // Jour de la semaine du 1er du mois (0 = Dimanche, 1 = Lundi ...)
  let firstDayIndex = firstDayOfMonth.getDay() - 1; // 0 = Lundi, 6 = Dimanche
  if (firstDayIndex < 0) firstDayIndex = 6;

  // Nombre de jours dans le mois
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Jours du mois précédent pour compléter le début de semaine
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthDays - i);
    const dateStr = formatDateToIsoStr(prevDate);
    const dayEvents = getEventsForDate(dateStr);
    cells.push({
      dateStr,
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      isToday: dateStr === props.todayStr,
      events: dayEvents,
      categoryColors: getCategoryColorsForEvents(dayEvents)
    });
  }

  // Jours du mois courant
  for (let day = 1; day <= daysInMonth; day++) {
    const currDate = new Date(year, month, day);
    const dateStr = formatDateToIsoStr(currDate);
    const dayEvents = getEventsForDate(dateStr);
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === props.todayStr,
      events: dayEvents,
      categoryColors: getCategoryColorsForEvents(dayEvents)
    });
  }

  // Jours du mois suivant pour compléter la grille 7 colonnes
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const nextDate = new Date(year, month + 1, day);
    const dateStr = formatDateToIsoStr(nextDate);
    const dayEvents = getEventsForDate(dateStr);
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === props.todayStr,
      events: dayEvents,
      categoryColors: getCategoryColorsForEvents(dayEvents)
    });
  }

  return cells;
});

function getEventsForDate(dateStr: string): AgendaEvent[] {
  return props.events.filter((event) => {
    const start = event.meta?._dame_start_date;
    const end = event.meta?._dame_end_date || start;
    if (!start) return false;
    return dateStr >= start && dateStr <= end;
  });
}

function getCategoryColorsForEvents(events: AgendaEvent[]): string[] {
  const colorSet = new Set<string>();
  events.forEach((evt) => {
    if (evt.categories_data && evt.categories_data.length > 0) {
      evt.categories_data.forEach((cat) => {
        if (cat.color) colorSet.add(cat.color);
      });
    } else {
      colorSet.add('#3880ff'); // Couleur par défaut
    }
  });
  return Array.from(colorSet);
}

function getEventPrimaryColor(event: AgendaEvent): string {
  if (event.categories_data && event.categories_data.length > 0 && event.categories_data[0].color) {
    return event.categories_data[0].color;
  }
  return '#3880ff';
}

const selectedDayEvents = computed(() => {
  return getEventsForDate(selectedDateStr.value);
});

const formattedSelectedDate = computed(() => {
  if (!selectedDateStr.value) return '';
  const parts = selectedDateStr.value.split('-');
  if (parts.length !== 3) return selectedDateStr.value;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

const formatEventTime = (event: AgendaEvent): string => {
  const meta = event.meta;
  const startTime = meta?._dame_start_time;
  const endTime = meta?._dame_end_time;
  const isAllDay = meta?._dame_all_day === 1;

  if (isAllDay || (!startTime && !endTime)) {
    return 'Toute la journée';
  }
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }
  return startTime || '';
};
</script>

<style scoped>
.agenda-calendar-view {
  display: flex;
  flex-direction: column;
  user-select: none;
}

/* En-tête mois */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.month-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.month-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  text-transform: capitalize;
}
.today-button {
  --padding-start: 6px;
  --padding-end: 6px;
  font-size: 0.85rem;
}
.month-nav-buttons {
  display: flex;
  align-items: center;
}

/* Entête jours de semaine */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  border-bottom: 1px solid var(--ion-color-light-shade, #e0e0e0);
  padding-bottom: 6px;
  margin-bottom: 4px;
}
.weekday-cell {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  text-transform: uppercase;
}

/* Grille du calendrier */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.day-cell {
  aspect-ratio: 1 / 1.1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.day-cell:active {
  background-color: var(--ion-color-light-shade, #f0f0f0);
}
.other-month {
  opacity: 0.35;
}

.day-number-wrapper {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.95rem;
  font-weight: 500;
}
.day-cell.is-selected .day-number-wrapper {
  border: 2px solid var(--ion-color-primary, #3880ff);
  font-weight: 700;
}
.day-cell.is-today .day-number-wrapper {
  background-color: var(--ion-color-primary, #3880ff);
  color: #ffffff;
  font-weight: 700;
}

/* Pastilles / Dots d'événements */
.event-dots-container {
  display: flex;
  gap: 3px;
  margin-top: 3px;
  min-height: 6px;
  align-items: center;
}
.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
}

/* Evénements du jour sélectionné */
.selected-day-events {
  border-top: 1px solid var(--ion-color-light-shade, #e0e0e0);
  padding-top: 12px;
}
.selected-day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.selected-day-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  text-transform: capitalize;
}
.event-count-badge {
  font-size: 0.75rem;
  background-color: var(--ion-color-light-shade, #eee);
  color: var(--ion-color-dark);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}
.day-event-list {
  background: transparent;
}
.day-event-item {
  position: relative;
  --inner-padding-start: 12px;
  margin-bottom: 6px;
  border-radius: 8px;
}
.category-color-bar {
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 4px;
  border-radius: 2px;
}
.event-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 2px;
}
.event-time-location {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
.location-name {
  font-weight: 500;
}
.no-events-placeholder p {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}
</style>
