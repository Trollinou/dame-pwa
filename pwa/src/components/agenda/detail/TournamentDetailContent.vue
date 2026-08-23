<template>
  <div class="tournament-detail-content">
    <div v-if="isLoading" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Chargement des informations du tournoi...</p>
    </div>

    <div v-else-if="currentPage" class="tournament-detail-content__body">
      <h1 v-safe-html="currentPage.title.rendered"></h1>

      <!-- Contenu de la page avec boutons injectés et interception des liens -->
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
        <ion-button fill="solid" class="ion-margin-top" @click="loadPage">Réessayer</ion-button>
      </div>
      <p v-else>Tournoi ou page introuvable.</p>
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
import { useTournamentStore } from '@/stores/tournament';
import { useInternalLinks } from '@/composables/useInternalLinks';
import type { WpPage } from '@/types/wp';

const props = defineProps<{
  page?: WpPage | null;
  pageId?: number | string | null;
}>();

const tournamentStore = useTournamentStore();
const { handleInternalLinks } = useInternalLinks();

const localPage = ref<WpPage | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const currentPage = computed(() => {
  if (props.page) return props.page;
  return localPage.value;
});

const processedContent = computed(() => {
  const rawHtml = currentPage.value?.content?.rendered || '';

  const regex = /\[helloasso\s+campaign=(?:&nbsp;|\s)*[»"']*(https?:\/\/[^&"'\s»\]]+)(?:&nbsp;|\s)*[»"']*[^\]]*\]/gi;

  const cleanHtml = rawHtml.replace(regex, (match: string, url: string) => {
    return `<ion-button expand="block" class="ion-margin-top ion-margin-bottom" href="${url}" target="_blank">S'inscrire à l'événement</ion-button>`;
  });

  return { cleanHtml };
});

const loadPage = async () => {
  if (props.page) {
    localPage.value = null;
    isLoading.value = false;
    error.value = null;
    return;
  }

  if (!props.pageId) {
    localPage.value = null;
    return;
  }

  isLoading.value = true;
  localPage.value = null;
  error.value = null;

  const idOrSlug = props.pageId;
  const isId = /^\d+$/.test(String(idOrSlug));

  if (isId) {
    const numericId = Number(idOrSlug);
    const result = await tournamentStore.fetchPage(numericId);
    if (result) {
      localPage.value = result;
      isLoading.value = false;
      if (!navigator.onLine) return;
    }
  }

  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    let url = `${apiUrl}/wp/v2/pages/`;

    if (isId) {
      url += idOrSlug;
    } else {
      url += `?slug=${idOrSlug}`;
    }

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      localPage.value = isId ? data : data[0];
      if (!localPage.value) {
        error.value = 'Page introuvable.';
      }
    } else if (!localPage.value) {
      error.value = 'Impossible de charger la page.';
    }
  } catch (err) {
    console.error(err);
    if (!localPage.value) {
      if (!navigator.onLine) {
        error.value = 'Vous êtes hors-ligne. Cette page nécessite une connexion internet pour être affichée.';
      } else {
        error.value = 'Une erreur réseau est survenue.';
      }
    }
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.pageId, () => {
  loadPage();
});

watch(() => props.page, (newVal) => {
  if (newVal) {
    localPage.value = null;
    isLoading.value = false;
    error.value = null;
  }
});

onMounted(() => {
  loadPage();
});
</script>

<style scoped>
.tournament-detail-content {
  width: 100%;
}

h1 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 20px;
}

.offline-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
}

.content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.content :deep(th),
.content :deep(td) {
  border: 1px solid var(--ion-color-light);
  padding: 8px;
  text-align: left;
}

.content :deep(p) {
  margin-bottom: 12px;
  line-height: 1.6;
}
</style>
