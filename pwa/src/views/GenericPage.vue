<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/agenda"></ion-back-button>
        </ion-buttons>
        <ion-title>Tournois</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <TournamentDetailContent :page-id="pageId" />
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
  IonBackButton
} from '@ionic/vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import TournamentDetailContent from '@/components/agenda/detail/TournamentDetailContent.vue';

const route = useRoute();
const pageId = computed(() => route.params.id as string);
</script>

<style scoped>
.safe-area-wrapper {
  padding-left: var(--ion-safe-area-left, 0);
  padding-right: var(--ion-safe-area-right, 0);
}
</style>
