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
                <div class="news-subtitle-row">
                  <ion-card-subtitle>{{ formatDate(post.date) }}</ion-card-subtitle>
                  <ion-badge v-if="unreadStore.isNewsUnread(post)" color="danger" class="news-unread-badge">
                    Nouveau
                  </ion-badge>
                </div>
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
  IonCardContent,
  IonBadge
} from '@ionic/vue';
import { useNewsStore, type Post } from '@/stores/news';
import { useUnreadStore } from '@/stores/unread';
import { removeAccents } from '@/utils/stringUtils';
import { useIsTabletLandscape } from '@/composables/useIsTabletLandscape';
import SplitMasterDetail from '@/components/shared/SplitMasterDetail.vue';
import NewsDetailContent from '@/components/agenda/detail/NewsDetailContent.vue';

const newsStore = useNewsStore();
const unreadStore = useUnreadStore();
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
      const first = filteredNews.value[0];
      selectedPostId.value = first.id;
      if (isTabletLandscape.value) {
        unreadStore.markNewsAsSeen(first.id, first.modified);
      }
    }
  } else {
    selectedPostId.value = null;
  }
};

const handlePostClick = (post: Post) => {
  selectedPostId.value = post.id;
  unreadStore.markNewsAsSeen(post.id, post.modified);
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
