<template>
  <div class="news-detail-content">
    <div v-if="isLoading" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
    </div>

    <div v-else-if="currentPost" class="news-detail-content__body">
      <img v-if="featuredImage" :src="featuredImage" class="detail-image" alt="" />
      <h1 v-safe-html="currentPost.title.rendered"></h1>
      <p class="date">{{ formatDate(currentPost.date) }}</p>

      <div
        class="content"
        v-safe-html="processedContent.cleanHtml"
        @click="handleInternalLinks"
      ></div>
    </div>

    <div v-else class="ion-text-center ion-padding offline-container">
      <div v-if="error">
        <ion-icon :icon="cloudOfflineOutline" size="large" color="medium"></ion-icon>
        <p class="ion-margin-top">{{ error }}</p>
        <ion-button fill="solid" class="ion-margin-top" @click="loadPost">Réessayer</ion-button>
      </div>
      <p v-else>Actualité introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  IonSpinner,
  IonButton,
  IonIcon
} from '@ionic/vue';
import { cloudOfflineOutline } from 'ionicons/icons';
import { useNewsStore, type Post } from '@/stores/news';
import { useInternalLinks } from '@/composables/useInternalLinks';
import { safeFetch } from '@/utils/safeFetch';

const props = defineProps<{
  post?: Post | null;
  postId?: number | null;
}>();

const newsStore = useNewsStore();
const { handleInternalLinks } = useInternalLinks();

const localPost = ref<Post | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const currentPost = computed(() => {
  if (props.post) return props.post;
  return localPost.value;
});

const featuredImage = computed(() => {
  return currentPost.value?._embedded?.['wp:featuredmedia']?.[0]?.source_url;
});

const processedContent = computed(() => {
  let cleanHtml = currentPost.value?.content?.rendered || '';

  const helloAssoRegex = /\[helloasso\s+campaign=(?:&nbsp;|\s)*[»"']*(https?:\/\/[^&"'\s»\]]+)(?:&nbsp;|\s)*[»"']*[^\]]*\]/gi;
  cleanHtml = cleanHtml.replace(helloAssoRegex, (match: string, url: string) => {
    return `<ion-button expand="block" class="ion-margin-top ion-margin-bottom" href="${url}" target="_blank">S'inscrire à l'événement</ion-button>`;
  });

  const surveyRegex = /<form[^>]+id="dame-benevolat-form-(\d+)"[^>]*>[\s\S]*?<\/form>/gi;
  cleanHtml = cleanHtml.replace(surveyRegex, (match: string, surveyId: string) => {
    return `
      <div class="survey-action-container ion-padding ion-margin-vertical">
        <h3 style="margin-top: 0;">Bénévolat disponible</h3>
        <p style="font-size: 0.9em; opacity: 0.8;">Proposez votre aide directement depuis l'application.</p>
        <ion-button expand="block" color="secondary" class="internal-benevolat-btn" data-path="/tabs/benevolat/participation/${surveyId}">
          Proposer mon aide
        </ion-button>
      </div>
    `;
  });

  return { cleanHtml };
});

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const loadPost = async () => {
  if (props.post) {
    localPost.value = null;
    isLoading.value = false;
    error.value = null;
    return;
  }

  if (!props.postId) {
    localPost.value = null;
    return;
  }

  const cached = newsStore.getPostById(props.postId);
  if (cached) {
    localPost.value = cached;
    isLoading.value = false;
    error.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;

  if (!navigator.onLine) {
    error.value = "Vous êtes hors-ligne. Cet article n'est pas encore disponible en cache.";
    isLoading.value = false;
    return;
  }

  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    const response = await safeFetch(`${apiUrl}/wp/v2/posts/${props.postId}?_embed`, {}, 4000);

    if (response.ok) {
      const data = await response.json();
      localPost.value = data;
      newsStore.savePost(data);
    } else {
      if (response.status >= 500) {
        throw new Error('Le serveur est momentanément indisponible.');
      }
      throw new Error("Impossible de charger l'article.");
    }
  } catch (err: unknown) {
    console.error('Erreur NewsDetailContent:', err);
    if (!navigator.onLine) {
      error.value = "Vous êtes hors-ligne. Cet article n'est pas encore disponible en cache.";
    } else {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj.message || 'Une erreur réseau est survenue.';
    }
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.postId, () => {
  loadPost();
});

watch(() => props.post, (newVal) => {
  if (newVal) {
    localPost.value = null;
    isLoading.value = false;
    error.value = null;
  }
});

onMounted(() => {
  loadPost();
});
</script>

<style scoped>
.news-detail-content {
  width: 100%;
}

.detail-image {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 16px;
}

.offline-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
}

h1 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0;
}

.date {
  color: var(--ion-color-medium);
  margin-bottom: 16px;
}

.content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.content :deep(p) {
  margin-bottom: 12px;
  line-height: 1.6;
}

.content :deep(.survey-action-container) {
  background: var(--ion-color-light);
  border-radius: 12px;
  border: 1px solid var(--ion-color-light-shade);
  text-align: center;
}
</style>
