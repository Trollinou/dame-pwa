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
  IonBackButton,
  onIonViewWillEnter
} from '@ionic/vue';
import { computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useNewsStore } from '@/stores/news';
import { useUnreadStore } from '@/stores/unread';
import NewsDetailContent from '@/components/agenda/detail/NewsDetailContent.vue';

const route = useRoute();
const newsStore = useNewsStore();
const unreadStore = useUnreadStore();

const postId = computed(() => Number(route.params.id));
const post = computed(() => newsStore.getPostById(postId.value));

const markAsSeen = () => {
  if (postId.value) {
    unreadStore.markNewsAsSeen(postId.value, post.value?.modified);
  }
};

onMounted(markAsSeen);
onIonViewWillEnter(markAsSeen);
watch(postId, markAsSeen);
</script>
