<template>
  <div>
    <div v-if="newsStore.isLoading && newsStore.posts.length === 0" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Chargement des actualités...</p>
    </div>

    <div v-else-if="filteredNews.length > 0">
      <SplitMasterDetail :has-selection="!!selectedPost" empty-title="Aucun article sélectionné" empty-message="Sélectionnez une actualité dans la liste pour lire son contenu.">
        <!-- 1/3 GAUCHE : Liste des actualités -->
        <template #master>
          <div class="news-list">
            <ion-card
              v-for="post in filteredNews"
              :key="post.id"
              :class="['news-card', 'ion-no-margin', 'ion-margin-bottom', { 'is-active': isTabletLandscape && post.id === selectedPostId }]"
              button
              @click="handlePostClick(post)"
            >
              <img
                v-if="getFeaturedImage(post)"
                :src="getFeaturedImage(post) || undefined"
                :alt="post.title.rendered"
                class="featured-image"
              />
              <ion-card-header class="news-card-header">
                <ion-card-subtitle>{{ formatDate(post.date) }}</ion-card-subtitle>
                <ion-card-title class="news-card-title" v-safe-html="post.title.rendered"></ion-card-title>
              </ion-card-header>
            </ion-card>
          </div>
        </template>

        <!-- 2/3 DROITE : Panneau de détails en mode paysage / desktop -->
        <template #detail>
          <NewsDetailContent
            v-if="selectedPost"
            :post="selectedPost"
            :post-id="selectedPost.id"
          />
        </template>
      </SplitMasterDetail>
    </div>

    <div v-else class="ion-text-center ion-padding">
      <p v-if="searchQuery">Aucune actualité ne correspond à "{{ searchQuery }}".</p>
      <p v-else>Aucune actualité trouvée.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent
} from '@ionic/vue';
import { useNewsStore, type Post } from '@/stores/news';
import { removeAccents } from '@/utils/stringUtils';
import { useIsTabletLandscape } from '@/composables/useIsTabletLandscape';
import SplitMasterDetail from '@/components/shared/SplitMasterDetail.vue';
import NewsDetailContent from '@/components/agenda/detail/NewsDetailContent.vue';

const newsStore = useNewsStore();
const { isTabletLandscape } = useIsTabletLandscape();

const props = defineProps<{
  searchQuery: string;
}>();

const emit = defineEmits<{
  (e: 'go-to-news-detail', id: number): void;
}>();

const selectedPostId = ref<number | null>(null);

const filteredNews = computed(() => {
  if (!props.searchQuery.trim()) return newsStore.posts;
  const query = removeAccents(props.searchQuery.toLowerCase());
  return newsStore.posts.filter((post: Post) =>
    removeAccents((post.title?.rendered || '').toLowerCase()).includes(query)
  );
});

const selectedPost = computed(() => {
  if (!selectedPostId.value) return null;
  return filteredNews.value.find((p) => p.id === selectedPostId.value) || null;
});

// Sélectionne automatiquement le 1er article si aucun sélectionné ou filtre modifié
const autoSelectFirst = () => {
  if (filteredNews.value.length > 0) {
    const exists = filteredNews.value.some((p) => p.id === selectedPostId.value);
    if (!exists) {
      selectedPostId.value = filteredNews.value[0].id;
    }
  } else {
    selectedPostId.value = null;
  }
};

const handlePostClick = (post: Post) => {
  selectedPostId.value = post.id;
  if (!isTabletLandscape.value) {
    emit('go-to-news-detail', post.id);
  }
};

const getFeaturedImage = (post: Post): string | null => {
  return post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

watch(filteredNews, () => {
  if (isTabletLandscape.value) {
    autoSelectFirst();
  }
});

watch(isTabletLandscape, (landscape) => {
  if (landscape) {
    autoSelectFirst();
  }
});

onMounted(() => {
  autoSelectFirst();
});
</script>

<style scoped>
.news-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  border: 2px solid transparent;
}

.news-card.is-active {
  border-color: var(--ion-color-primary, #3880ff);
  box-shadow: 0 4px 16px rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.2);
  transform: scale(1.01);
}

.featured-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.news-card-header {
  padding: 10px 14px 14px 14px;
}

.news-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 4px;
}
</style>
