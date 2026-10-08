<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ pageTitle }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="hasUnreadInCurrentSegment"
            @click="markCurrentSegmentAsRead"
            title="Tout marquer comme lu"
          >
            <ion-icon slot="icon-only" :icon="checkmarkDoneOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Sous-navigation (Segment) -->
      <ion-toolbar>
        <ion-segment :value="selectedSegment" @ionChange="onSegmentChange($event.detail.value as string, loadTabContent)">
          <ion-segment-button value="actualites">
            <ion-label class="segment-label-wrapper">
              Actualités
              <ion-badge v-if="unreadStore.newsUnreadCount > 0" color="danger" class="segment-badge">
                {{ unreadStore.newsUnreadCount }}
              </ion-badge>
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="agenda">
            <ion-label>Agenda</ion-label>
          </ion-segment-button>
          <ion-segment-button value="tournois">
            <ion-label class="segment-label-wrapper">
              Tournois
              <ion-badge v-if="unreadStore.tournamentsUnreadCount > 0" color="danger" class="segment-badge">
                {{ unreadStore.tournamentsUnreadCount }}
              </ion-badge>
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="benevolat">
            <ion-label class="segment-label-wrapper">
              Bénévolat
              <ion-badge v-if="unreadStore.benevolatsUnreadCount > 0" color="danger" class="segment-badge">
                {{ unreadStore.benevolatsUnreadCount }}
              </ion-badge>
            </ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- Sous-barre Mode de vue Agenda (Liste / Calendrier) -->
      <ion-toolbar v-if="selectedSegment === 'agenda'">
        <ion-segment :value="agendaViewMode" @ionChange="changeAgendaViewMode($event.detail.value as 'list' | 'calendar')">
          <ion-segment-button value="list" layout="icon-start">
            <ion-icon :icon="listOutline"></ion-icon>
            <ion-label>Liste</ion-label>
          </ion-segment-button>
          <ion-segment-button value="calendar" layout="icon-start">
            <ion-icon :icon="calendarOutline"></ion-icon>
            <ion-label>Calendrier</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <ion-toolbar v-if="selectedSegment !== 'agenda' || agendaViewMode === 'list'">
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          animated
        ></ion-searchbar>
      </ion-toolbar>

    </ion-header>

    <ion-content :fullscreen="true" ref="contentRef" class="ion-padding">
      <div class="safe-area-wrapper">
        <KeepAlive>
          <!-- ONGLET 0 : ACTUALITES -->
          <ActualitesSegmentView
            v-if="selectedSegment === 'actualites'"
            :search-query="searchQuery"
            @go-to-news-detail="goToNewsDetail"
          />

          <!-- ONGLET 1 : AGENDA -->
          <AgendaSegmentView
            v-else-if="selectedSegment === 'agenda'"
            :view-mode="agendaViewMode"
            :search-query="searchQuery"
            :events="events"
            :is-loading="isLoading"
            :has-more-past="hasMorePast"
            :has-more-upcoming="hasMoreUpcoming"
            :today-str="todayStr"
            @go-to-detail="goToDetail"
            @load-more-past="loadMorePast"
            @load-more-upcoming="loadMoreUpcoming"
            @retry="agendaStore.fetchAgenda()"
          />

          <!-- ONGLET 2 : TOURNOIS -->
          <TournoisSegmentView
            v-else-if="selectedSegment === 'tournois'"
            :search-query="searchQuery"
            :tournament-error="tournamentError"
            @go-to-tournament-detail="goToTournamentDetail"
            @retry="fetchTournaments"
          />

          <!-- ONGLET 3 : BENEVOLAT -->
          <BenevolatSegmentView
            v-else-if="selectedSegment === 'benevolat'"
            :search-query="searchQuery"
            :today-str="todayStr"
            @view-benevolat="viewBenevolat"
          />
        </KeepAlive>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, defineAsyncComponent } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonBadge,
  IonButtons,
  IonButton,
  onIonViewWillEnter,
  type InfiniteScrollCustomEvent
} from '@ionic/vue';
import { listOutline, calendarOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { useRouter, useRoute } from 'vue-router';

import { useAgendaStore, type AgendaEvent } from '@/stores/agenda';
import { useTournamentStore } from '@/stores/tournament';
import { useBenevolatStore, type Benevolat } from '@/stores/benevolat';
import { useAuthStore } from '@/stores/auth';
import { useNewsStore } from '@/stores/news';
import { useUnreadStore } from '@/stores/unread';
import { storeToRefs } from 'pinia';
import { useAgendaSearch } from '@/composables/agenda/useAgendaSearch';

const ActualitesSegmentView = defineAsyncComponent(() => import('@/components/agenda/ActualitesSegmentView.vue'));
const AgendaSegmentView = defineAsyncComponent(() => import('@/components/agenda/AgendaSegmentView.vue'));
const TournoisSegmentView = defineAsyncComponent(() => import('@/components/agenda/TournoisSegmentView.vue'));
const BenevolatSegmentView = defineAsyncComponent(() => import('@/components/agenda/BenevolatSegmentView.vue'));

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const agendaStore = useAgendaStore();
const tournamentStore = useTournamentStore();
const benevolatStore = useBenevolatStore();
const newsStore = useNewsStore();
const unreadStore = useUnreadStore();

const { events, isLoading, hasMoreUpcoming, hasMorePast, upcomingPage, pastPage } = storeToRefs(agendaStore);
const { selectedSegment, searchQuery, pageTitle, searchPlaceholder, onSegmentChange } = useAgendaSearch();

const contentRef = ref();
const todayStr = agendaStore.getTodayLocal();
const tournamentError = ref<string | null>(null);

const hasUnreadInCurrentSegment = computed(() => {
  if (selectedSegment.value === 'actualites') {
    return unreadStore.newsUnreadCount > 0;
  }
  if (selectedSegment.value === 'tournois') {
    return unreadStore.tournamentsUnreadCount > 0;
  }
  if (selectedSegment.value === 'benevolat') {
    return unreadStore.benevolatsUnreadCount > 0;
  }
  return false;
});

const markCurrentSegmentAsRead = () => {
  unreadStore.markAllAsSeen(selectedSegment.value);
};

// Persistance du mode de vue Agenda dans localStorage (Défaut: 'calendar')
const STORAGE_KEY = 'dame_agenda_view_mode';
const savedMode = (localStorage.getItem(STORAGE_KEY) as 'list' | 'calendar') || 'calendar';
const agendaViewMode = ref<'list' | 'calendar'>(savedMode);

const changeAgendaViewMode = (mode: 'list' | 'calendar') => {
  if (mode) {
    agendaViewMode.value = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    if (mode === 'calendar') {
      searchQuery.value = '';
    } else if (mode === 'list') {
      scrollToCurrentEvent();
    }
  }
};

const goToDetail = (id: number) => {
  router.push('/agenda/' + id);
};

const goToTournamentDetail = (id: number) => {
  unreadStore.markTournamentAsSeen(id);
  router.push(`/page/${id}`);
};

const goToNewsDetail = (id: number) => {
  unreadStore.markNewsAsSeen(id);
  router.push('/news/' + id);
};

const viewBenevolat = (benevolat: Benevolat) => {
  unreadStore.markBenevolatAsSeen(benevolat.id, benevolat.modified);
  if (authStore.adminMode) {
    router.push('/admin/benevolat/' + benevolat.id);
  } else {
    if (authStore.isAuthenticated) {
      router.push('/benevolat/participation/' + benevolat.id);
    } else {
      router.push({
        path: '/login',
        query: { message: 'Identification requise pour proposer votre aide.' },
      });
    }
  }
};

const fetchNews = async () => {
  try {
    await newsStore.fetchPosts();
  } catch (err) {
    console.warn('Erreur chargement posts:', err);
  }
};

const fetchTournaments = async () => {
  tournamentError.value = null;
  try {
    await tournamentStore.fetchMenu();
  } catch {
    if (!navigator.onLine) {
      tournamentError.value = 'Vous êtes hors-ligne. Les informations sur les tournois nécessitent une connexion.';
    } else {
      tournamentError.value = 'Impossible de charger les tournois.';
    }
  }
};

const fetchBenevolats = async () => {
  try {
    await benevolatStore.fetchBenevolatsData();
  } catch (err) {
    console.error('Erreur chargement bénévolat:', err);
  }
};

const loadTabContent = () => {
  if (selectedSegment.value === 'actualites') {
    fetchNews();
  } else if (selectedSegment.value === 'agenda') {
    agendaStore.fetchAgenda();
    scrollToCurrentEvent();
  } else if (selectedSegment.value === 'tournois') {
    fetchTournaments();
  } else if (selectedSegment.value === 'benevolat') {
    fetchBenevolats();
  }
};

watch(selectedSegment, (newSeg) => {
  if (newSeg === 'agenda') {
    agendaStore.fetchAgenda();
    scrollToCurrentEvent();
  }
});

const loadMoreUpcoming = async (ev: InfiniteScrollCustomEvent) => {
  const target = ev?.target;
  if (!hasMoreUpcoming.value || isLoading.value) {
    if (target) {
      try {
        await target.complete();
      } catch {
        // Ignorer si déjà complété
      }
      target.disabled = true;
    }
    return;
  }
  try {
    const data = await agendaStore.fetchBatch('upcoming', todayStr, upcomingPage.value);
    if (data && data.length > 0) {
      const newItems = data.filter((newItem) => !events.value.some((existing) => existing.id === newItem.id));
      events.value = [...events.value, ...newItems];
      upcomingPage.value++;
    } else if (data !== null) {
      hasMoreUpcoming.value = false;
    }
  } catch (err) {
    console.error('Erreur chargement événements futurs:', err);
  } finally {
    if (target) {
      try {
        await target.complete();
      } catch {
        // Ignorer si déjà complété
      }
      if (!hasMoreUpcoming.value) {
        target.disabled = true;
      }
    }
  }
};

const loadMorePast = async (ev: InfiniteScrollCustomEvent) => {
  const target = ev?.target;
  if (!hasMorePast.value || isLoading.value) {
    if (target) {
      try {
        await target.complete();
      } catch {
        // Ignorer si déjà complété
      }
      target.disabled = true;
    }
    return;
  }
  try {
    const data = await agendaStore.fetchBatch('past', todayStr, pastPage.value);
    if (data && data.length > 0) {
      const dataAsc = [...data].reverse();
      const newItems = dataAsc.filter((newItem) => !events.value.some((existing) => existing.id === newItem.id));
      events.value = [...newItems, ...events.value];
      pastPage.value++;
    } else if (data !== null) {
      hasMorePast.value = false;
    }
  } catch (err) {
    console.error('Erreur chargement historique:', err);
  } finally {
    if (target) {
      try {
        await target.complete();
      } catch {
        // Ignorer si déjà complété
      }
      if (!hasMorePast.value) {
        target.disabled = true;
      }
    }
  }
};

const scrollToCurrentEvent = async () => {
  await nextTick();
  const attemptScroll = (retries = 5) => {
    if (selectedSegment.value !== 'agenda' || agendaViewMode.value !== 'list') return;
    const targetEvent = events.value.find((e) => {
      const refDate = e.meta?._dame_end_date || e.meta?._dame_start_date || '';
      return refDate >= todayStr;
    });
    if (targetEvent) {
      const el = document.getElementById('event-' + targetEvent.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (retries > 0) {
        setTimeout(() => attemptScroll(retries - 1), 120);
      }
    }
  };
  setTimeout(() => attemptScroll(), 150);
};

onIonViewWillEnter(async () => {
  if (route.query.tab) {
    selectedSegment.value = route.query.tab as string;
  }
  loadTabContent();

  if (events.value.length > 0) {
    scrollToCurrentEvent();
  }

  try {
    await agendaStore.fetchAgenda();
  } catch (err) {
    console.error('Erreur chargement agenda:', err);
  } finally {
    scrollToCurrentEvent();
  }
});
</script>
