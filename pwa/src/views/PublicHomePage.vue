<template>
  <ion-page>
    <!-- Header Global -->
    <ion-header :translucent="true">
      <ion-toolbar>
        <!-- Logo à gauche -->
        <ion-buttons slot="start">
          <div style="display: flex; align-items: center; padding-left: 12px;">
            <img src="/assets/icon/logo.png" style="height: 20px; margin-right: 8px;" alt="Logo" />
            <span style="font-weight: 800; letter-spacing: 0.5px; color: var(--ion-color-dark);">Echiquier Lédonien</span>
          </div>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <!-- Refresher pour le tirage vers le bas (doit être enfant direct de ion-content) -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Wrapper respectant la Dynamic Island -->
      <div class="safe-area-wrapper">

        <ion-header collapse="condense">
          <ion-toolbar>
            <ion-title size="large">Echiquier Lédonien</ion-title>
          </ion-toolbar>
        </ion-header>

        <!-- Carte Préinscription Saison -->
        <ion-card v-if="!authStore.isAuthenticated || hasUnregisteredTargets" class="pre-inscription-card ion-no-margin">
          <ion-card-header>
            <ion-card-title style="display: flex; align-items: center; gap: 8px; font-size: 1.15em; font-weight: bold; color: var(--ion-color-primary);">
              ✍️ Préinscription {{ authStore.currentSeason ? authStore.currentSeason : 'Saison' }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <template v-if="!authStore.isAuthenticated">
              <p>Remplissez votre dossier de préinscription en ligne pour la nouvelle saison.</p>
              <ion-button expand="block" router-link="/pre-inscription" color="primary" class="pre-inscription-btn ion-margin-top">
                Commencer ma préinscription
              </ion-button>
            </template>
            <template v-else-if="authStore.selectedIdentity?.type === 'representative'">
              <p>Effectuez la préinscription de vos enfants associés ou créez une nouvelle fiche.</p>
              <ion-button expand="block" router-link="/pre-inscription" color="primary" class="pre-inscription-btn ion-margin-top">
                Préinscrire / Réinscrire
              </ion-button>
            </template>
            <template v-else>
              <p>Réinscrivez-vous rapidement en confirmant ou mettant à jour vos coordonnées.</p>
              <ion-button expand="block" router-link="/pre-inscription" color="primary" class="pre-inscription-btn ion-margin-top">
                Me réinscrire
              </ion-button>
            </template>
          </ion-card-content>
        </ion-card>

        <!-- Section Dernières Nouvelles -->
        <ion-list lines="full" class="home-section" style="margin: 0;">
          <ion-list-header>
            <ion-label color="primary">Dernières Nouvelles</ion-label>
            <ion-button fill="clear" router-link="/tabs/agenda?tab=actualites">Actualités</ion-button>
          </ion-list-header>

          <div v-if="isLoadingNews" class="ion-text-center ion-padding">
            <ion-spinner name="dots"></ion-spinner>
          </div>
          
          <ion-item v-for="post in latestPosts" :key="post.id" button @click="goToNews(post.id)">
            <ion-icon slot="start" :icon="newspaperOutline" color="primary"></ion-icon>
            <ion-thumbnail slot="start" v-if="getFeaturedImage(post)">
              <img :src="getFeaturedImage(post) || undefined" alt="Thumbnail" />
            </ion-thumbnail>
            <ion-label>
              <h3 v-safe-html="post.title.rendered" class="ion-text-wrap"></h3>
              <p>{{ formatDate(post.date) }}</p>
            </ion-label>
          </ion-item>

          <ion-item v-if="!isLoadingNews && latestPosts.length === 0" lines="none">
            <ion-label class="ion-text-center">Aucune actualité</ion-label>
          </ion-item>
        </ion-list>

        <!-- Section Prochains Événements -->
        <ion-list lines="full" class="home-section" style="margin: 0;">
          <ion-list-header>
            <ion-label color="primary">Prochains Événements</ion-label>
            <ion-button fill="clear" router-link="/tabs/agenda?tab=agenda">Agenda</ion-button>
          </ion-list-header>

          <div v-if="agendaStore.isLoading" class="ion-text-center ion-padding">
            <ion-spinner name="dots"></ion-spinner>
          </div>

          <ion-item v-for="event in upcomingEvents" :key="event.id" button @click="goToAgenda(event.id)">
            <ion-icon slot="start" :icon="calendarOutline" color="primary"></ion-icon>
            <ion-label>
              <h3 v-safe-html="event.title.rendered" class="ion-text-wrap"></h3>
              <p>{{ formatEventDate(event) }}</p>
            </ion-label>
            <ion-badge v-if="isToday(event)" color="warning" slot="end">Actuellement</ion-badge>
          </ion-item>

          <ion-item v-if="!agendaStore.isLoading && upcomingEvents.length === 0" lines="none">
            <ion-label class="ion-text-center">Aucun événement à venir</ion-label>
          </ion-item>
        </ion-list>

        <!-- Section Appel à bénévoles -->
        <ion-list lines="full" class="home-section" style="margin: 0;">
          <ion-list-header>
            <ion-label color="primary">Appel à bénévoles</ion-label>
            <ion-button fill="clear" router-link="/tabs/agenda?tab=benevolat">Bénévolat</ion-button>
          </ion-list-header>

          <div v-if="benevolatStore.isLoading" class="ion-text-center ion-padding">
            <ion-spinner name="dots"></ion-spinner>
          </div>

          <ion-item v-for="benevolat in latestBenevolats" :key="benevolat.id" button @click="goToBenevolat(benevolat.id)">
            <ion-icon slot="start" :icon="handRightOutline" color="secondary"></ion-icon>
            <ion-label>
              <h3 v-safe-html="benevolat.title?.rendered || benevolat.title?.raw || 'Appel en cours'" class="ion-text-wrap"></h3>
              <p>{{ formatBenevolatDates(benevolat) }}</p>
            </ion-label>
            <div slot="end" style="display: flex; align-items: center; gap: 8px;">
              <ion-badge v-if="benevolatStore.hasUserVoted(benevolat.id) && !authStore.adminMode" color="success">Inscrit</ion-badge>
              <ion-badge v-if="isBenevolatExpired(benevolat)" color="danger">Terminé</ion-badge>
            </div>
          </ion-item>

          <ion-item v-if="!benevolatStore.isLoading && latestBenevolats.length === 0" lines="none">
            <ion-label class="ion-text-center">Aucun appel actif</ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonList,
  IonListHeader,
  IonLabel,
  IonItem,
  IonThumbnail,
  IonIcon,
  IonButton,
  IonSpinner,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  onIonViewWillEnter,
  type RefresherCustomEvent
} from '@ionic/vue';
import {
  calendarOutline,
  handRightOutline,
  newspaperOutline
} from 'ionicons/icons';
import { ref, computed, watch } from 'vue';
import { useAuthStore, type Identity, type AssociatedMember } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useAgendaStore, type AgendaEvent } from '@/stores/agenda';
import { useBenevolatStore, type Benevolat } from '@/stores/benevolat';
import { useNewsStore, type Post } from '@/stores/news';

const authStore = useAuthStore();
const router = useRouter();
const agendaStore = useAgendaStore();
const benevolatStore = useBenevolatStore();
const newsStore = useNewsStore();

const latestPosts = computed(() => newsStore.posts.slice(0, 3));
const isLoadingNews = computed(() => newsStore.isLoading);

const todayStr = computed(() => agendaStore.getTodayLocal());

const hasUnregisteredTargets = ref(!authStore.isAuthenticated);

const checkUnregisteredTargets = async () => {
  if (!authStore.isAuthenticated) {
    hasUnregisteredTargets.value = true;
    return;
  }
  try {
    const identities = await authStore.fetchMyIdentities();
    let hasAny = false;
      identities.forEach((identity: Identity) => {
        if (identity.type === 'member' && identity.member_id > 0 && !identity.already_registered) {
          hasAny = true;
        }
        if (identity.type === 'representative' && identity.associated_members) {
          identity.associated_members.forEach((child: AssociatedMember) => {
            if (!child.already_registered) {
              hasAny = true;
            }
          });
        }
      });
      hasUnregisteredTargets.value = hasAny;
  } catch (err) {
    console.error("Erreur lors de la vérification des adhérents non-inscrits:", err);
    hasUnregisteredTargets.value = true; // Par précaution, afficher la carte
  }
};

const loadAllData = async () => {
  const tasks = [
    fetchLatestNews(),
    agendaStore.fetchAgenda(),
    authStore.fetchPwaConfig()
  ];

  if (authStore.isAuthenticated) {
    tasks.push(benevolatStore.fetchBenevolatsData(true));
    tasks.push(checkUnregisteredTargets());
  } else {
    // CRITIQUE : Purge des données de session pour éviter la persistance
    benevolatStore.clearData();
    hasUnregisteredTargets.value = true;
  }

  await Promise.all(tasks);
};

/**
 * Gère le rafraîchissement manuel (Pull-to-refresh)
 */
const handleRefresh = async (event: RefresherCustomEvent) => {
  await loadAllData();
  event.target.complete();
};

/**
 * Surveille les changements de connexion pour rafraîchir les données
 */
watch(() => authStore.isAuthenticated, (newVal) => {
  hasUnregisteredTargets.value = !newVal;
  loadAllData();
});

/**
 * Récupère les 3 dernières actualités (via le store)
 */
const fetchLatestNews = async () => {
  try {
    await newsStore.fetchPosts();
  } catch {
    console.warn("Échec refresh news home (serveur coupé ?), utilisation du cache.");
  }
};

/**
 * Filtre les 3 prochains événements (non passés)
 */
const upcomingEvents = computed(() => {
  return agendaStore.events
    .filter(e => !isPast(e))
    .slice(0, 3);
});

const isPast = (event: AgendaEvent): boolean => {
  const referenceDate = event.meta?._dame_end_date || event.meta?._dame_start_date || '';
  return referenceDate < todayStr.value;
};

/**
 * Prend les appels à bénévolat actifs, triés par date la plus proche
 */
const latestBenevolats = computed(() => {
  return benevolatStore.benevolats
    .filter(b => !isBenevolatExpired(b)) // Uniquement les non-terminés
    .sort((a, b) => {
      const dateA = a.dame_benevolat_data?.[0]?.date || '';
      const dateB = b.dame_benevolat_data?.[0]?.date || '';
      return dateA.localeCompare(dateB); // Ordre chronologique
    })
    .slice(0, 2);
});

/**
 * Formate la plage de dates
 */
const formatBenevolatDates = (benevolat: Benevolat): string => {
  const data = benevolat.dame_benevolat_data;
  
  if (Array.isArray(data) && data.length > 0) {
    const firstDate = data[0].date;
    const lastDate = data[data.length - 1].date;

    const format = (d: string) => d ? d.split('-').reverse().join('/') : '?';
    
    return `Du ${format(firstDate)} au ${format(lastDate)}`;
  }

  return 'Dates non définies';
};

/**
 * Vérifie si un appel est expiré
 */
const isBenevolatExpired = (benevolat: Benevolat): boolean => {
  const data = benevolat.dame_benevolat_data;
  if (Array.isArray(data) && data.length > 0) {
    const dates = data.map((d) => d.date).filter(Boolean);
    if (dates.length === 0) return false;
    const maxDate = dates.reduce((max: string, d: string) => d > max ? d : max, dates[0]);
    return maxDate < todayStr.value;
  }
  return false;
};

const getFeaturedImage = (post: Post): string | null => {
  return post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
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

const isToday = (event: AgendaEvent): boolean => {
  const startDate = event.meta?._dame_start_date;
  const endDate = event.meta?._dame_end_date;

  if (!startDate) return false;

  // Cas 1 : Événement sur une période (plusieurs jours)
  if (endDate && startDate !== endDate) {
    return todayStr.value >= startDate && todayStr.value <= endDate;
  }

  // Cas 2 : Événement sur une seule journée
  return startDate === todayStr.value;
};

const goToNews = (id: number) => router.push(`/news/${id}`);
const goToAgenda = (id: number) => router.push(`/agenda/${id}`);
const goToBenevolat = (id: number) => {
  if (authStore.adminMode) {
    router.push(`/admin/benevolat/${id}`);
  } else {
    if (authStore.isAuthenticated) {
      router.push(`/benevolat/participation/${id}`);
    } else {
      router.push({ 
        path: '/login', 
        query: { message: 'Identification requise pour proposer votre aide.' } 
      });
    }
  }
};

onIonViewWillEnter(() => {
  loadAllData();
});
</script>

<style scoped>
.safe-area-wrapper {
  padding-left: var(--ion-safe-area-left, 0);
  padding-right: var(--ion-safe-area-right, 0);
}

.pre-inscription-card {
  border-radius: 16px;
  margin-bottom: var(--app-section-gap);
  border: 1px solid var(--ion-color-step-150, rgba(255, 255, 255, 0.08));
}

.pre-inscription-btn {
  --min-height: clamp(48px, 5.5vh, 54px);
  font-size: 1.05rem;
  font-weight: 600;
  --border-radius: 12px;
}

.home-section {
  margin-bottom: var(--app-section-gap) !important;
}

ion-list-header {
  --background: transparent;
  font-size: 1.15em;
  font-weight: bold;
  padding-top: 4px;
  padding-bottom: 4px;
}

ion-item {
  --min-height: var(--app-item-min-height);
  --padding-start: 12px;
  --inner-padding-end: 12px;
}

h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 4px;
  line-height: 1.35;
}

p {
  color: var(--ion-color-medium);
  font-size: 0.95rem;
  line-height: 1.35;
}

ion-thumbnail {
  --size: var(--app-thumbnail-size);
  border-radius: 10px;
  overflow: hidden;
  margin-right: 12px;
}

ion-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
