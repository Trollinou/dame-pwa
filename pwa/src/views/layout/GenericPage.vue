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
  IonBackButton,
  onIonViewWillEnter
} from '@ionic/vue';
import { computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUnreadStore } from '@/stores/unread';
import TournamentDetailContent from '@/components/public/agenda/detail/TournamentDetailContent.vue';

const route = useRoute();
const unreadStore = useUnreadStore();
const pageId = computed(() => route.params.id as string);

const markAsSeen = () => {
  const id = Number(pageId.value);
  if (id) {
    unreadStore.markTournamentAsSeen(id);
  }
};

onMounted(markAsSeen);
onIonViewWillEnter(markAsSeen);
watch(pageId, markAsSeen);
</script>
