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
        <div v-else class="list-container">
          <ion-card
            v-for="(cours, index) in apprentissageStore.parcours"
            :key="cours.id"
            :color="cours.chapitre_couleur"
            :class="{ 'locked': !apprentissageStore.isCoursUnlocked(index) }"
            :button="apprentissageStore.isCoursUnlocked(index)"
            :router-link="apprentissageStore.isCoursUnlocked(index) ? `/cours/${cours.id}` : undefined"
            class="cours-card"
          >
            <ion-card-header>
              <div class="cours-header-wrapper">
                <div>
                  <ion-card-subtitle>Niveau {{ cours.niveau }} — {{ decodeHtmlEntities(cours.chapitre_nom) }}</ion-card-subtitle>
                  <ion-card-title>{{ decodeHtmlEntities(cours.titre) }}</ion-card-title>
                </div>
                <ion-icon
                  v-if="!apprentissageStore.isCoursUnlocked(index)"
                  :icon="lockClosedOutline"
                  class="lock-icon"
                ></ion-icon>
              </div>
            </ion-card-header>
          </ion-card>
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
import { useApprentissageStore } from '@/stores/apprentissage';
import { useAuthStore } from '@/stores/auth';
import { decodeHtmlEntities } from '@/utils/stringUtils';
import {
  schoolOutline,
  homeOutline,
  lockClosedOutline
} from 'ionicons/icons';

const authStore = useAuthStore();
const apprentissageStore = useApprentissageStore();

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

.list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
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

.lock-icon {
  font-size: 1.5rem;
  color: var(--ion-color-step-600, #666);
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
