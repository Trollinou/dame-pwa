<template>
  <div class="video-reader-wrapper">
    <!-- En-tête Unifié Vidéo (masqué si plein écran immersif) -->
    <ContentHeader
      v-show="!isImmersiveFullscreen"
      :title="title"
      :typeLabel="typeLabel || 'Vidéo'"
      :chapitreNiveauLabel="chapitreNiveauLabel"
      :hideSubPanel="true"
    />

    <!-- Conteneur Vidéo Principal -->
    <div
      class="video-reader-container"
      :class="{ 'is-pseudo-fullscreen': isPseudoFullscreen, 'is-immersive': isImmersiveFullscreen }"
      ref="containerRef"
    >
      <!-- Bouton flottant de fermeture plein écran immersif (utile sur iPhone et en mode paysage) -->
      <button
        v-if="isImmersiveFullscreen"
        type="button"
        class="floating-exit-fullscreen-btn"
        aria-label="Quitter le plein écran"
        @click="exitAllFullscreen"
      >
        <ion-icon :icon="closeOutline" class="exit-icon"></ion-icon>
        <span class="exit-text">Quitter</span>
      </button>

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

      <!-- Barre d'outils vidéo : Durée et Passage Plein Écran / Paysage (masquée en plein écran immersif) -->
      <div v-show="!isImmersiveFullscreen" class="video-actions-bar">
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
          <ion-icon slot="start" :icon="isImmersiveFullscreen ? contractOutline : expandOutline"></ion-icon>
          {{ isImmersiveFullscreen ? 'Quitter plein écran' : 'Plein écran / Paysage' }}
        </ion-button>
      </div>

      <!-- Notice de fallback si l'API YouTube n'a pas pu se charger -->
      <div v-if="apiError && !estValide && !isImmersiveFullscreen" class="video-fallback-notice ion-padding-horizontal">
        <ion-icon :icon="informationCircleOutline" />
        <span>Suivi automatique restreint. Vous pouvez valider directement la vidéo.</span>
      </div>

      <!-- Notes ou texte d'accompagnement de la vidéo si présent -->
      <div v-if="contenuHtml && !isImmersiveFullscreen" class="video-accompanying-text ion-padding" v-html="contenuHtml"></div>
    </div>

    <!-- Footer Fixe Unifié SeriesCardFooter (Carte 1/1 - masqué si plein écran immersif) -->
    <SeriesCardFooter
      v-show="!isImmersiveFullscreen"
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
  informationCircleOutline,
  closeOutline
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
const isNativeFullscreen = ref(false);
const isPseudoFullscreen = ref(false);
const estValide = ref(props.isAlreadyCompleted ?? false);

// État combiné : vrai si fullscreen natif ou pseudo-fullscreen actif
const isImmersiveFullscreen = computed(() => isNativeFullscreen.value || isPseudoFullscreen.value);

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
  isNativeFullscreen.value = !!document.fullscreenElement;
};

// Gestion de l'orientation paysage mobile (Option 2 : auto-fullscreen en paysage)
let landscapeMediaQuery: MediaQueryList | null = null;

const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
  const isLandscape = e.matches;
  const isSmallDevice = typeof window !== 'undefined' && (window.innerHeight <= 600 || window.innerWidth <= 900);

  if (isLandscape && isSmallDevice) {
    // Si on passe en paysage sur mobile, basculer en mode immersif automatique
    isPseudoFullscreen.value = true;
  } else if (!isLandscape && !isNativeFullscreen.value) {
    // Si on repasse en portrait et que le fullscreen natif n'est pas actif, quitter le pseudo-fullscreen
    isPseudoFullscreen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  if (iframeRef.value) {
    bindIframe(iframeRef.value);
  }

  // Écoute des changements d'orientation
  if (typeof window !== 'undefined' && window.matchMedia) {
    landscapeMediaQuery = window.matchMedia('(orientation: landscape)');
    try {
      landscapeMediaQuery.addEventListener('change', handleOrientationChange);
    } catch {
      // Fallback pour anciens navigateurs WebKit
      landscapeMediaQuery.addListener(handleOrientationChange);
    }

    // Vérification initiale si déjà chargé en paysage
    if (landscapeMediaQuery.matches && window.innerHeight <= 600) {
      isPseudoFullscreen.value = true;
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange);

  if (landscapeMediaQuery) {
    try {
      landscapeMediaQuery.removeEventListener('change', handleOrientationChange);
    } catch {
      landscapeMediaQuery.removeListener(handleOrientationChange);
    }
  }

  destroyPlayer();
});

const supportsNativeFullscreen = (): boolean => {
  if (!containerRef.value) return false;
  return typeof containerRef.value.requestFullscreen === 'function' ||
    typeof (containerRef.value as any).webkitRequestFullscreen === 'function';
};

const enterNativeFullscreen = async () => {
  if (!containerRef.value) return;
  if (containerRef.value.requestFullscreen) {
    await containerRef.value.requestFullscreen();
  } else if ((containerRef.value as any).webkitRequestFullscreen) {
    await (containerRef.value as any).webkitRequestFullscreen();
  }

  // Tentative optionnelle d'orientation lock sur PWA Android
  if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
    try {
      await (screen.orientation as any).lock('landscape');
    } catch {
      // Silencieux si non supporté
    }
  }
};

const exitNativeFullscreen = async () => {
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    }
  }

  if ('orientation' in screen && 'unlock' in (screen.orientation as any)) {
    try {
      (screen.orientation as any).unlock();
    } catch {
      // ignore
    }
  }
};

const toggleFullscreen = async () => {
  if (isImmersiveFullscreen.value) {
    await exitAllFullscreen();
  } else {
    // Si l'API native est supportée (Android, Desktop), l'utiliser
    if (supportsNativeFullscreen()) {
      try {
        await enterNativeFullscreen();
      } catch (err) {
        console.warn('Fallback pseudo-fullscreen après échec requestFullscreen:', err);
        isPseudoFullscreen.value = true;
      }
    } else {
      // Sur iOS Safari / iPhone : activation du pseudo-fullscreen CSS
      isPseudoFullscreen.value = true;
    }
  }
};

const exitAllFullscreen = async () => {
  isPseudoFullscreen.value = false;
  try {
    await exitNativeFullscreen();
  } catch (err) {
    console.warn('Erreur sortie plein écran:', err);
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
  padding-bottom: 24px;
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
  position: relative;
  transition: all 0.25s ease-in-out;
}

/* Bouton flottant semi-transparent pour quitter le plein écran immersif */
.floating-exit-fullscreen-btn {
  position: absolute;
  top: max(12px, env(safe-area-inset-top, 12px));
  right: max(12px, env(safe-area-inset-right, 12px));
  z-index: 100000;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.floating-exit-fullscreen-btn:active {
  background: rgba(0, 0, 0, 0.85);
  transform: scale(0.96);
}

.exit-icon {
  font-size: 18px;
}

.video-responsive-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
  height: 0;
  background: #000;
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

/* Mode Pseudo-Fullscreen CSS (Universal iPhone / WebKit & Mobile Landscape) */
.video-reader-container.is-pseudo-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  z-index: 999999 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  background: #000000 !important;
  justify-content: center !important;
  align-items: center !important;
}

.video-reader-container.is-pseudo-fullscreen .video-responsive-wrapper {
  width: 100vw;
  height: 100vh;
  padding-bottom: 0;
}

.video-reader-container.is-pseudo-fullscreen .video-iframe {
  width: 100%;
  height: 100%;
}

/* Mode Plein écran Natif du conteneur (Android / Desktop) */
:fullscreen .video-reader-container,
.video-reader-container:fullscreen {
  max-width: 100vw;
  height: 100vh;
  border-radius: 0;
  justify-content: center;
  align-items: center;
  background: #000;
}

:fullscreen .video-responsive-wrapper,
.video-reader-container:fullscreen .video-responsive-wrapper {
  padding-bottom: 0;
  width: 100vw;
  height: 100vh;
}
</style>
