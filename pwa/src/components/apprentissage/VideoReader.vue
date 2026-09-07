<template>
  <div class="video-reader-wrapper">
    <!-- En-tête Unifié Vidéo -->
    <ContentHeader
      :title="title"
      :typeLabel="typeLabel || 'Vidéo'"
      :chapitreNiveauLabel="chapitreNiveauLabel"
      :hideSubPanel="true"
    />

    <!-- Conteneur Vidéo Principal -->
    <div class="video-reader-container" ref="containerRef">
      <!-- Lecteur YouTube plein format 16:9 -->
      <div class="video-responsive-wrapper">
        <iframe
          v-if="videoId"
          ref="iframeRef"
          :id="`roi-yt-${videoId}`"
          :src="embedUrl"
          class="video-iframe"
          title="Vidéo pédagogique"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          @load="onIframeLoaded"
        ></iframe>
        <div v-else class="video-placeholder">
          <ion-icon :icon="videocamOutline" class="placeholder-icon"></ion-icon>
          <p>URL vidéo indisponible</p>
        </div>
      </div>

      <!-- Barre d'outils vidéo : Durée et Passage Plein Écran / Paysage -->
      <div class="video-actions-bar">
        <div v-if="duree" class="video-badge-duree">
          <ion-icon :icon="timeOutline" class="duree-icon"></ion-icon>
          <span>{{ duree }}</span>
        </div>

        <ion-button
          fill="outline"
          size="small"
          class="fullscreen-toggle-btn"
          @click="toggleFullscreen"
        >
          <ion-icon slot="start" :icon="isFullscreen ? contractOutline : expandOutline"></ion-icon>
          {{ isFullscreen ? 'Quitter plein écran' : 'Plein écran / Paysage' }}
        </ion-button>
      </div>

      <!-- Notice de fallback si l'API YouTube n'a pas pu se charger -->
      <div v-if="apiError && !estValide" class="video-fallback-notice ion-padding-horizontal">
        <ion-icon :icon="informationCircleOutline" />
        <span>Suivi automatique restreint. Vous pouvez valider directement la vidéo.</span>
      </div>

      <!-- Notes ou texte d'accompagnement de la vidéo si présent -->
      <div v-if="contenuHtml" class="video-accompanying-text ion-padding" v-html="contenuHtml"></div>
    </div>

    <!-- Footer Fixe Unifié SeriesCardFooter (Carte 1/1) -->
    <SeriesCardFooter
      :currentCard="1"
      :totalCards="1"
      :isSolved="estValide"
      :isAlreadyCompleted="props.isAlreadyCompleted"
      :disabled="!estValide && !canValidate"
      :hideFeedback="true"
      :showActionButtonWhenUnsolved="!estValide"
      :actionButtonText="canValidate ? 'Valider la vidéo' : `Valider (${progressPercent}% / ${threshold}%)`"
      :actionButtonColor="canValidate ? 'success' : 'medium'"
      nextText="Valider la vidéo"
      finishText="Valider la vidéo"
      completedText="🎉 Vidéo validée !"
      pendingHint="Visionnez au moins 95% de la vidéo pour valider"
      disabledHint="Visionnez au moins 95% de la vidéo pour débloquer la validation"
      badgePrefix="Vidéo"
      @action="validerVisionnage"
      @next="validerVisionnage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import {
  videocamOutline,
  timeOutline,
  expandOutline,
  contractOutline,
  checkmarkCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter from '@/components/shared/SeriesCardFooter.vue';
import { useYouTubePlayer } from '@/composables/useYouTubePlayer';

const props = defineProps<{
  title: string;
  typeLabel?: string;
  chapitreNiveauLabel?: string;
  consigne?: string;
  videoId?: string;
  videoUrl?: string;
  duree?: string;
  contenuHtml?: string;
  isAlreadyCompleted?: boolean;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const isFullscreen = ref(false);
const estValide = ref(props.isAlreadyCompleted ?? false);

const {
  progressPercent,
  hasReachedThreshold,
  apiError,
  canValidate,
  threshold,
  bindIframe,
  destroyPlayer
} = useYouTubePlayer({
  thresholdPercent: 95
});

const onIframeLoaded = () => {
  if (iframeRef.value) {
    bindIframe(iframeRef.value);
  }
};

const embedUrl = computed(() => {
  if (!props.videoId) return '';
  const origin = typeof window !== 'undefined' && window.location?.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  return `https://www.youtube.com/embed/${props.videoId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1${origin}`;
});

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  if (iframeRef.value) {
    bindIframe(iframeRef.value);
  }
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
  destroyPlayer();
});

const toggleFullscreen = async () => {
  if (!containerRef.value) return;

  try {
    if (!document.fullscreenElement) {
      if (containerRef.value.requestFullscreen) {
        await containerRef.value.requestFullscreen();
      } else if ((containerRef.value as any).webkitRequestFullscreen) {
        await (containerRef.value as any).webkitRequestFullscreen();
      }

      // Tentative de verrouillage en paysage si disponible sur PWA mobile
      if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch {
          // Si le navigateur ne supporte pas le lock d'orientation, ignorer sans bloquer
        }
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }

      if ('orientation' in screen && 'unlock' in (screen.orientation as any)) {
        try {
          (screen.orientation as any).unlock();
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('Erreur passage plein écran:', err);
  }
};

const validerVisionnage = () => {
  estValide.value = true;
  emit('success');
};
</script>

<style scoped>
.video-reader-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.video-reader-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--ion-card-background, #fff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-top: 4px;
}

.video-responsive-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
  height: 0;
  background: #000;
}

.video-mount-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-iframe-mount {
  width: 100%;
  height: 100%;
}

.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.video-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--ion-color-step-50, #f8f9fa);
  border-bottom: 1px solid var(--ion-color-step-150, #e9ecef);
}

.video-badge-duree {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ion-color-medium, #6c757d);
  background: var(--ion-color-step-100, #e9ecef);
  padding: 3px 8px;
  border-radius: 6px;
}

.duree-icon {
  font-size: 14px;
}

.fullscreen-toggle-btn {
  --border-radius: 8px;
  font-size: 12px;
  margin: 0;
}

.video-fallback-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  padding-bottom: 8px;
  font-size: 12px;
  color: var(--ion-color-warning-shade, #e0a800);
}

.video-accompanying-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ion-text-color, #212529);
}

/* Mode Plein écran Natif du conteneur */
:fullscreen .video-reader-container,
.video-reader-container:fullscreen {
  max-width: 100vw;
  height: 100vh;
  border-radius: 0;
  justify-content: center;
  background: #000;
}

:fullscreen .video-responsive-wrapper,
.video-reader-container:fullscreen .video-responsive-wrapper {
  padding-bottom: 0;
  height: 100vh;
}
</style>
