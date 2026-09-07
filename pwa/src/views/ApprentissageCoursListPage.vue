<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/apprentissage"></ion-back-button>
        </ion-buttons>
        <ion-title>Cours & Parcours</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/tabs/apprentissage" router-direction="back">
            <ion-icon slot="icon-only" :icon="homeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <ion-header collapse="condense">
          <ion-toolbar>
            <ion-title size="large">Cours & Parcours</ion-title>
          </ion-toolbar>
        </ion-header>

        <!-- État de chargement -->
        <div v-if="apprentissageStore.isLoading" class="ion-text-center ion-padding spinner-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Chargement des parcours...</p>
        </div>

        <!-- Aucun cours -->
        <div v-else-if="apprentissageStore.parcours.length === 0" class="ion-text-center ion-padding empty-container">
          <ion-icon :icon="schoolOutline" size="large" color="medium"></ion-icon>
          <p class="ion-margin-top">Aucun cours disponible pour le moment.</p>
        </div>

        <!-- Liste des cours -->
        <div v-else class="courses-wrapper">
          <!-- SECTION 1 : COURS ASSIGNÉS PAR LES ENTRAÎNEURS -->
          <div v-if="apprentissageStore.coursAssignes.length > 0" class="assigned-section">
            <div class="section-title-wrapper">
              <h2 class="section-title">
                <ion-icon :icon="bookmarkOutline" class="section-icon"></ion-icon>
                Cours assignés
              </h2>
              <span class="section-badge">{{ apprentissageStore.coursAssignes.length }}</span>
            </div>
            <p class="section-subtitle">Sélectionnés et prescrits par vos entraîneurs</p>

            <div class="list-container">
              <ion-card
                v-for="cours in apprentissageStore.coursAssignes"
                :key="'assigned-' + cours.id"
                :color="cours.chapitre_couleur"
                :button="true"
                :router-link="`/cours/${cours.id}`"
                class="cours-card assigned-card"
              >
                <ion-card-header>
                  <div class="cours-header-wrapper">
                    <div>
                      <ion-card-subtitle>
                        <span class="assigned-tag">📌 Assigné</span>
                        Niveau {{ cours.niveau }} — {{ decodeHtmlEntities(cours.chapitre_nom) }}
                      </ion-card-subtitle>
                      <ion-card-title>{{ decodeHtmlEntities(cours.titre) }}</ion-card-title>
                    </div>
                    <div class="progress-pill">
                      {{ getCourseProgress(cours) }}
                    </div>
                  </div>
                </ion-card-header>
              </ion-card>
            </div>
          </div>

          <!-- SECTION 2 : MÉTHODE EEF (TRONC COMMUN) -->
          <div class="tronc-section">
            <div class="section-title-wrapper" :class="{ 'ion-margin-top': apprentissageStore.coursAssignes.length > 0 }">
              <h2 class="section-title">
                <ion-icon :icon="schoolOutline" class="section-icon"></ion-icon>
                Méthode EEF
              </h2>
            </div>
            <p class="section-subtitle">École d'Échecs à la Française</p>

            <div class="list-container">
              <ion-card
                v-for="cours in apprentissageStore.coursTroncCommun"
                :key="cours.id"
                :color="cours.chapitre_couleur"
                :class="{ 'locked': !isCourseUnlocked(cours) }"
                :button="isCourseUnlocked(cours)"
                :router-link="isCourseUnlocked(cours) ? `/cours/${cours.id}` : undefined"
                class="cours-card"
              >
                <ion-card-header>
                  <div class="cours-header-wrapper">
                    <div>
                      <ion-card-subtitle>Niveau {{ cours.niveau }} — {{ decodeHtmlEntities(cours.chapitre_nom) }}</ion-card-subtitle>
                      <ion-card-title>{{ decodeHtmlEntities(cours.titre) }}</ion-card-title>
                    </div>
                    <ion-icon
                      v-if="!isCourseUnlocked(cours)"
                      :icon="lockClosedOutline"
                      class="lock-icon"
                    ></ion-icon>
                    <div v-else class="progress-pill">
                      {{ getCourseProgress(cours) }}
                    </div>
                  </div>
                </ion-card-header>
              </ion-card>
            </div>
          </div>
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
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonSpinner,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle
} from '@ionic/vue';
import { onMounted, watch } from 'vue';
import { useApprentissageStore, type Cours } from '@/stores/apprentissage';
import { useAuthStore } from '@/stores/auth';
import { decodeHtmlEntities } from '@/utils/stringUtils';
import {
  schoolOutline,
  homeOutline,
  lockClosedOutline,
  bookmarkOutline
} from 'ionicons/icons';

const authStore = useAuthStore();
const apprentissageStore = useApprentissageStore();

const getCourseProgress = (cours: Cours): string => {
  const playlist = cours.playlist || [];
  if (playlist.length === 0) return '0/0';
  const validated = playlist.filter((item) =>
    apprentissageStore.elementsValides.includes(item.id)
  ).length;
  return `${validated}/${playlist.length}`;
};

const isCourseUnlocked = (cours: Cours): boolean => {
  const idx = apprentissageStore.parcours.findIndex((c) => c.id === cours.id);
  if (idx < 0) return true;
  return apprentissageStore.isCoursUnlocked(idx);
};

const loadData = async () => {
  if (authStore.isAuthenticated && authStore.canAccessApprentissage) {
    await Promise.all([
      apprentissageStore.fetchParcours(),
      apprentissageStore.fetchProgression()
    ]);
  }
};

watch(() => [authStore.isAuthenticated, authStore.canAccessApprentissage], () => {
  loadData();
});

onMounted(async () => {
  await loadData();
});
</script>

<style scoped>
.safe-area-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.spinner-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
}

.courses-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.assigned-section {
  margin-bottom: 8px;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.section-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ion-text-color, #1d2327);
}

.section-icon {
  font-size: 1.25rem;
  color: var(--ion-color-primary, #0073aa);
}

.section-badge {
  background: var(--ion-color-primary, #0073aa);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.section-subtitle {
  margin: 0 0 10px 0;
  font-size: 0.85rem;
  color: var(--ion-color-step-600, #666);
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
}

.cours-card {
  margin: 0;
  border-radius: 12px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.cours-card:not(.locked):active {
  transform: scale(0.98);
}

.cours-card.locked {
  opacity: 0.6;
  filter: grayscale(80%);
  cursor: not-allowed;
}

.cours-header-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assigned-tag {
  display: inline-block;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 6px;
  font-weight: 700;
  font-size: 0.75rem;
}

.progress-pill {
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.35);
  padding: 3px 8px;
  border-radius: 12px;
  flex-shrink: 0;
  margin-left: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.lock-icon {
  font-size: 1.5rem;
  color: var(--ion-color-step-600, #666);
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
