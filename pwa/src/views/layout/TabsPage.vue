<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Accueil</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="agenda" href="/tabs/agenda">
          <ion-icon :icon="calendarOutline" />
          <ion-label>Le Club</ion-label>
          <ion-badge v-if="unreadStore.clubUnreadCount > 0" color="danger" class="tab-badge">
            {{ unreadStore.clubUnreadCount }}
          </ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="apprentissage" href="/tabs/apprentissage">
          <ion-icon :icon="schoolOutline" />
          <ion-label>Apprentissage</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profil" href="/tabs/profil" :class="{ 'tab-authenticated': authStore.isAuthenticated }">
          <ion-icon :icon="authStore.isAuthenticated ? personCircle : logInOutline" />
          <ion-label>{{ authStore.isAuthenticated ? (authStore.selectedIdentity?.firstname || 'Profil') : 'Connexion' }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUnreadStore } from '@/stores/unread';
import {
  IonPage,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
  onIonViewWillEnter
} from '@ionic/vue';
import {
  homeOutline,
  calendarOutline,
  schoolOutline,
  personCircle,
  logInOutline
} from 'ionicons/icons';

const route = useRoute();
const authStore = useAuthStore();
const unreadStore = useUnreadStore();

const syncState = () => {
  if (route.path.startsWith('/tabs')) {
    authStore.adminMode = false;
  }
};

onIonViewWillEnter(() => {
  syncState();
});

watch(
  () => route.path,
  () => {
    syncState();
  },
  { immediate: true }
);
</script>
