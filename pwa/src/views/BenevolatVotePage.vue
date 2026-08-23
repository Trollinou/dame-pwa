<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/agenda"></ion-back-button>
        </ion-buttons>
        <ion-title v-if="benevolat" v-safe-html="benevolat.title.rendered"></ion-title>
        <ion-title v-else>Participation</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <BenevolatDetailContent :benevolat-id="benevolatId" />
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
import { useBenevolatStore } from '@/stores/benevolat';
import BenevolatDetailContent from '@/components/agenda/detail/BenevolatDetailContent.vue';

const route = useRoute();
const benevolatStore = useBenevolatStore();

const benevolatId = computed(() => parseInt(route.params.id as string));
const benevolat = computed(() => benevolatStore.benevolats.find((b) => b.id === benevolatId.value));
</script>

<style scoped>
.safe-area-wrapper {
  padding-left: var(--ion-safe-area-left, 0);
  padding-right: var(--ion-safe-area-right, 0);
}
</style>
