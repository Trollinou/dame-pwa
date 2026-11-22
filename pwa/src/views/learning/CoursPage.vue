<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/apprentissage/cours"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ cours ? `N${cours.niveau} · ${shortChapterLabel}` : 'Cours' }}</ion-title>
      </ion-toolbar>

      <ion-toolbar
        v-if="cours && !apprentissageStore.isLoading"
        :color="cours.chapitre_couleur || 'primary'"
        class="cours-compact-toolbar"
      >
        <div class="cours-compact-header">
          <div class="cours-compact-meta-row">
            <h2 class="cours-compact-title">{{ decodeHtmlEntities(cours.titre) }}</h2>
            <div class="cours-compact-actions">
              <ion-badge
                :color="isCourseCompleted ? 'success' : undefined"
                class="cours-progress-badge"
                :class="{ 'cours-progress-pill': !isCourseCompleted }"
              >
                {{ validatedCount }}/{{ cours.playlist.length }}
              </ion-badge>
              <ion-button
                v-if="prochainElementCours"
                size="small"
                color="light"
                :router-link="`/contenu/${prochainElementCours.id}`"
                class="cours-continue-btn"
              >
                <ion-icon slot="start" :icon="playOutline"></ion-icon>
                {{ hasAnyValidated ? 'Continuer' : 'Commencer' }}
              </ion-button>
            </div>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <!-- Refresher pour le tirage vers le bas (pull-to-refresh) -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="safe-area-wrapper">
        <div v-if="apprentissageStore.isLoading" class="ion-text-center ion-padding spinner-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Chargement du cours...</p>
        </div>

        <div v-else-if="!cours" class="ion-text-center ion-padding error-container">
          <p>Cours introuvable.</p>
        </div>

        <div v-else class="playlist-container">
          <ion-list lines="inset" class="playlist-list">
            <ion-item
              v-for="(item, i) in cours.playlist"
              :key="item.id"
              :button="isUnlocked(i)"
              :disabled="!isUnlocked(i)"
              :router-link="isUnlocked(i) ? `/contenu/${item.id}` : undefined"
              class="playlist-item"
            >
              <ion-icon
                slot="start"
                :icon="item.type === 'roi_lecon' ? bookOutline : (item.type === 'roi_video' ? videocamOutline : extensionPuzzleOutline)"
                color="primary"
              ></ion-icon>
              
              <ion-label>
                <h2>{{ decodeHtmlEntities(item.titre) || (item.type === 'roi_lecon' ? 'Leçon' : 'Exercice') + ' #' + (i + 1) }}</h2>
                <p class="type-subtitle">{{ getContenuTypeLabel(item) }}</p>
              </ion-label>

              <ion-icon
                v-if="!isUnlocked(i)"
                slot="end"
                :icon="lockClosedOutline"
                color="medium"
              ></ion-icon>
              <ion-icon
                v-else-if="isValidated(item.id)"
                slot="end"
                :icon="checkmarkCircleOutline"
                color="success"
              ></ion-icon>
              <ion-icon
                v-else
                slot="end"
                :icon="chevronForwardOutline"
                color="medium"
              ></ion-icon>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  type RefresherCustomEvent
} from '@ionic/vue';
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useApprentissageStore } from '@/stores/apprentissage';
import type { CoursItem, PlaylistItem } from '@/types/roi';
import { decodeHtmlEntities, getContenuTypeLabel } from '@/utils/stringUtils';
import {
  lockClosedOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  bookOutline,
  extensionPuzzleOutline,
  videocamOutline,
  playOutline
} from 'ionicons/icons';

const route = useRoute();
const apprentissageStore = useApprentissageStore();

const coursId = computed(() => {
  const idVal = route.params.id;
  return parseInt(Array.isArray(idVal) ? idVal[0] : idVal, 10);
});

const coursIndex = computed(() => {
  return apprentissageStore.parcours.findIndex(c => c.id === coursId.value);
});

const cours = computed<CoursItem | null>(() => {
  if (coursIndex.value !== -1) {
    return apprentissageStore.parcours[coursIndex.value] || null;
  }
  return null;
});

watch(
  () => cours.value,
  (newCours) => {
    if (newCours?.id) {
      apprentissageStore.prefetchCoursContenus(newCours.id);
    }
  },
  { immediate: true }
);

const isUnlocked = (playlistIndex: number): boolean => {
  if (coursIndex.value === -1) return false;
  return apprentissageStore.isElementUnlocked(coursIndex.value, playlistIndex);
};

const isValidated = (itemId: number): boolean => {
  return apprentissageStore.elementsValides.includes(itemId);
};

const shortChapterLabel = computed(() => {
  const nom = decodeHtmlEntities(cours.value?.chapitre_nom || '').trim();
  if (!nom) return 'Chapitre';
  return nom.split(/\s+/)[0] || nom;
});

const validatedCount = computed(() => {
  if (!cours.value?.playlist) return 0;
  return cours.value.playlist.filter((item) => isValidated(item.id)).length;
});

const hasAnyValidated = computed(() => {
  return validatedCount.value > 0;
});

const isCourseCompleted = computed(() => {
  const total = cours.value?.playlist?.length ?? 0;
  return total > 0 && validatedCount.value >= total;
});

const prochainElementCours = computed<PlaylistItem | null>(() => {
  if (!cours.value?.playlist) return null;
  for (let i = 0; i < cours.value.playlist.length; i++) {
    const item = cours.value.playlist[i];
    if (item && isUnlocked(i) && !isValidated(item.id)) {
      return item;
    }
  }
  return null;
});

const handleRefresh = async (event: RefresherCustomEvent) => {
  await Promise.all([
    apprentissageStore.fetchParcours(true),
    apprentissageStore.fetchProgression(true)
  ]);
  if (coursId.value) {
    apprentissageStore.prefetchCoursContenus(coursId.value);
  }
  event.target.complete();
};

onMounted(async () => {
  if (apprentissageStore.parcours.length === 0) {
    await apprentissageStore.fetchParcours();
  }
  await apprentissageStore.fetchProgression();
  if (coursId.value) {
    apprentissageStore.prefetchCoursContenus(coursId.value);
  }
});
</script>
