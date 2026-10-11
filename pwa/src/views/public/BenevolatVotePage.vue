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
  IonBackButton,
  onIonViewWillEnter
} from '@ionic/vue';
import { computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useBenevolatStore } from '@/stores/benevolat';
import { useUnreadStore } from '@/stores/unread';
import BenevolatDetailContent from '@/components/public/agenda/detail/BenevolatDetailContent.vue';

const route = useRoute();
const benevolatStore = useBenevolatStore();
const unreadStore = useUnreadStore();

const benevolatId = computed(() => parseInt(route.params.id as string));
const benevolat = computed(() => benevolatStore.benevolats.find((b) => b.id === benevolatId.value));

const markAsSeen = () => {
  if (benevolatId.value) {
    unreadStore.markBenevolatAsSeen(benevolatId.value, benevolat.value?.modified);
  }
};

onMounted(markAsSeen);
onIonViewWillEnter(markAsSeen);
watch(benevolatId, markAsSeen);
</script>
