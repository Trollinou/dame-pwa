<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/agenda"></ion-back-button>
        </ion-buttons>
        <ion-title v-if="event" v-safe-html="event.title.rendered"></ion-title>
        <ion-title v-else>Détails Événement</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <ion-header collapse="condense">
          <ion-toolbar>
            <ion-title size="large">
              <div class="multiline-large-title" v-if="event" v-safe-html="event.title.rendered"></div>
              <div class="multiline-large-title" v-else>Détails Événement</div>
            </ion-title>
          </ion-toolbar>
        </ion-header>

        <AgendaDetailContent :event-id="eventId" />
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
import { useAgendaStore } from '@/stores/agenda';
import AgendaDetailContent from '@/components/agenda/detail/AgendaDetailContent.vue';

const route = useRoute();
const agendaStore = useAgendaStore();

const eventId = computed(() => parseInt(route.params.id as string));
const event = computed(() => agendaStore.events.find((e) => e.id === eventId.value));
</script>

<style scoped>
.safe-area-wrapper {
  padding-left: var(--ion-safe-area-left, 0);
  padding-right: var(--ion-safe-area-right, 0);
}

.multiline-large-title {
  white-space: normal;
  line-height: 1.2;
}
</style>
