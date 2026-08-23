<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/agenda"></ion-back-button>
        </ion-buttons>
        <ion-title v-if="post" v-safe-html="post.title.rendered"></ion-title>
        <ion-title v-else>Actualité</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <NewsDetailContent :post-id="postId" />
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
import { useNewsStore } from '@/stores/news';
import NewsDetailContent from '@/components/agenda/detail/NewsDetailContent.vue';

const route = useRoute();
const newsStore = useNewsStore();

const postId = computed(() => Number(route.params.id));
const post = computed(() => newsStore.getPostById(postId.value));
</script>

<style scoped>
.safe-area-wrapper {
  padding-left: var(--ion-safe-area-left, 0);
  padding-right: var(--ion-safe-area-right, 0);
}
</style>
