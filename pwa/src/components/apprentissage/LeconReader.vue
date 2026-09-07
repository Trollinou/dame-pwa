<template>
  <div class="lecon-reader-wrapper">
    <!-- En-tête Unifié Leçon -->
    <ContentHeader
      :title="title"
      :typeLabel="typeLabel || 'Leçon'"
      :chapitreNiveauLabel="chapitreNiveauLabel"
      :hideSubPanel="true"
    />

    <!-- Contenu HTML de la Leçon hydratant FEN & PGN -->
    <div ref="contentRef" class="lecon-content-wrapper ion-padding-top" v-html="contenuHtml"></div>

    <!-- Footer Fixe Unifié SeriesCardFooter (Carte 1/1) -->
    <SeriesCardFooter
      :currentCard="1"
      :totalCards="1"
      :isSolved="estValide"
      :isAlreadyCompleted="props.isAlreadyCompleted"
      :disabled="!estValide && !canValidate"
      :hideFeedback="true"
      :showActionButtonWhenUnsolved="!estValide"
      :actionButtonText="canValidate ? 'Valider la leçon' : `Valider (${progressPercent}% / ${threshold}%)`"
      :actionButtonColor="canValidate ? 'success' : 'medium'"
      nextText="Valider la leçon"
      finishText="Valider la leçon"
      completedText="🎉 Leçon validée !"
      pendingHint="Faites défiler au moins 95% de la leçon pour valider"
      disabledHint="Faites défiler au moins 95% de la leçon pour débloquer la validation"
      badgePrefix="Leçon"
      @action="validerLecture"
      @next="validerLecture"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, render, createVNode } from 'vue';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter from '@/components/shared/SeriesCardFooter.vue';
import DiagramViewer from '@/components/shared/DiagramViewer.vue';
import PgnViewer from '@/components/shared/PgnViewer.vue';
import type { DrawShape } from 'eg-chessboard';

const props = defineProps<{
  title: string;
  typeLabel?: string;
  chapitreNiveauLabel?: string;
  contenuHtml: string;
  isAlreadyCompleted?: boolean;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const contentRef = ref<HTMLElement | null>(null);
let mountedVNodes: HTMLElement[] = [];

const estValide = ref(props.isAlreadyCompleted ?? false);
const scrollProgress = ref(0);
const threshold = 95;

const progressPercent = computed(() => Math.min(100, Math.round(scrollProgress.value)));
const canValidate = computed(() => estValide.value || progressPercent.value >= threshold);

const validerLecture = () => {
  if (canValidate.value) {
    estValide.value = true;
    emit('success');
  }
};

const checkScrollProgress = () => {
  if (estValide.value) {
    scrollProgress.value = 100;
    return;
  }

  // Vérifier le défilement dans le ion-content parent ou la fenêtre
  const ionScroll = document.querySelector('ion-content::part(scroll)') as HTMLElement | null;
  const ionContent = document.querySelector('ion-content');

  let scrollTop = 0;
  let scrollHeight = 0;
  let clientHeight = 0;

  if (ionContent) {
    const customScrollEl = ionContent.shadowRoot?.querySelector('.inner-scroll') as HTMLElement | null;
    if (customScrollEl) {
      scrollTop = customScrollEl.scrollTop;
      scrollHeight = customScrollEl.scrollHeight;
      clientHeight = customScrollEl.clientHeight;
    } else {
      scrollTop = ionContent.scrollTop || window.scrollY || 0;
      scrollHeight = ionContent.scrollHeight || document.documentElement.scrollHeight;
      clientHeight = ionContent.clientHeight || window.innerHeight;
    }
  } else {
    scrollTop = window.scrollY || document.documentElement.scrollTop;
    scrollHeight = document.documentElement.scrollHeight;
    clientHeight = window.innerHeight;
  }

  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 10) {
    // Si la page est très courte ou tient sans défilement, elle est considérée comme lue
    scrollProgress.value = 100;
  } else {
    const current = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
    if (current > scrollProgress.value) {
      scrollProgress.value = current;
    }
  }
};

const hydraterBlocs = () => {
  if (!contentRef.value) return;

  // 1. Hydrater les FEN
  const fenElements = contentRef.value.querySelectorAll('.roi-bloc-fen');
  fenElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const fen = htmlEl.dataset.fen || '';
    const orientation = (htmlEl.dataset.orientation || 'white') as 'white' | 'black';
    let shapes: DrawShape[] = [];
    if (htmlEl.dataset.shapes) {
      try {
        shapes = JSON.parse(htmlEl.dataset.shapes);
      } catch (e) {
        console.error('Erreur lors du parsing des shapes :', e);
        shapes = [];
      }
    }

    const vnode = createVNode(DiagramViewer, { fen, orientation, shapes });
    render(vnode, htmlEl);
    mountedVNodes.push(htmlEl);
  });

  // 2. Hydrater les PGN
  const pgnElements = contentRef.value.querySelectorAll('.roi-bloc-pgn');
  pgnElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const pgn = htmlEl.dataset.pgn || '';
    const vnode = createVNode(PgnViewer, { pgnString: pgn });
    render(vnode, htmlEl);
    mountedVNodes.push(htmlEl);
  });

  checkScrollProgress();
};

const nettoyerVNodes = () => {
  mountedVNodes.forEach((el) => {
    render(null, el);
  });
  mountedVNodes = [];
};

let scrollListener: (() => void) | null = null;

onMounted(() => {
  hydraterBlocs();
  scrollListener = () => checkScrollProgress();
  window.addEventListener('scroll', scrollListener, { passive: true });

  const ionContent = document.querySelector('ion-content');
  if (ionContent) {
    ionContent.addEventListener('ionScroll', scrollListener as EventListener, { passive: true });
    const innerScroll = ionContent.shadowRoot?.querySelector('.inner-scroll');
    if (innerScroll) {
      innerScroll.addEventListener('scroll', scrollListener, { passive: true });
    }
  }

  // Vérification initiale différée le temps du rendu
  setTimeout(checkScrollProgress, 300);
});

watch(() => props.contenuHtml, async () => {
  nettoyerVNodes();
  await nextTick();
  hydraterBlocs();
  checkScrollProgress();
});

watch(() => props.isAlreadyCompleted, (val) => {
  if (val) {
    estValide.value = true;
    scrollProgress.value = 100;
  }
});

onBeforeUnmount(() => {
  nettoyerVNodes();
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
    const ionContent = document.querySelector('ion-content');
    if (ionContent) {
      ionContent.removeEventListener('ionScroll', scrollListener as EventListener);
      const innerScroll = ionContent.shadowRoot?.querySelector('.inner-scroll');
      if (innerScroll) {
        innerScroll.removeEventListener('scroll', scrollListener);
      }
    }
  }
});
</script>

<style>
/* Style global pour les blocs de la leçon */
.roi-bloc-fen, .roi-bloc-pgn {
  margin: 16px auto;
  display: block;
  max-width: 400px;
  width: 100%;
}
.roi-bloc-pgn .board-container {
  border-radius: 0 !important;
  box-shadow: none !important;
}
</style>

<style scoped>
.lecon-reader-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.lecon-content-wrapper {
  line-height: 1.6;
  font-size: 1rem;
  color: var(--ion-color-dark, #222);
  margin-bottom: 24px;
}
</style>
