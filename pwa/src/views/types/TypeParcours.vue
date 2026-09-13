<template>
  <div class="exercice-type-parcours">
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneCourante"
      :stepBadgeText="`Parcours ${indexCourant + 1} / ${totalParcours}`"
    />

    <ParcoursViewer
      ref="viewerRef"
      :key="indexCourant"
      :fenDepart="currentParcours.fen_depart"
      :couleurJoueur="currentParcours.couleur_joueur"
      :variante="currentParcours.variante"
      :caseDepart="currentParcours.case_depart"
      :caseArrivee="currentParcours.case_arrivee"
      :pieceAttendue="currentParcours.piece_attendue"
      :shapes="computedShapes"
      :isSolved="isSolved"
      @solved="handleSolved"
      @feedback="handleFeedback"
    />

    <SeriesCardFooter
      :currentCard="indexCourant + 1"
      :totalCards="totalParcours"
      :isSolved="isSolved"
      :feedback="feedback"
      :pendingHint="pendingHint"
      :nextText="indexCourant < totalParcours - 1 ? 'Parcours suivant' : 'Terminer l\'exercice'"
      @next="passerParcoursSuivant"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ParcoursViewer from '@/components/shared/ParcoursViewer.vue';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import SeriesCardFooter, { type CardFeedback } from '@/components/shared/SeriesCardFooter.vue';
import { getParcoursVariant } from '@/utils/parcoursVariants';
import type { DrawShape } from 'eg-chessboard';

export interface ParcoursItemConfig {
  variante: string;
  description?: string;
  fen_depart: string;
  couleur_joueur: 'white' | 'black';
  case_depart?: string;
  case_arrivee?: string;
  piece_attendue?: string;
  shapes?: DrawShape[];
}

export interface ConfigTypeParcours {
  consigne?: string;
  series?: ParcoursItemConfig[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigTypeParcours;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const indexCourant = ref(0);
const isSolved = ref(false);
const feedback = ref<CardFeedback | null>(null);
const viewerRef = ref<InstanceType<typeof ParcoursViewer> | null>(null);

const seriesList = computed<ParcoursItemConfig[]>(() => {
  if (props.config?.series && Array.isArray(props.config.series) && props.config.series.length > 0) {
    return props.config.series;
  }
  return [
    {
      variante: 'standard',
      fen_depart: '8/8/8/8/8/8/8/8 w - - 0 1',
      couleur_joueur: 'white',
      case_depart: 'a1',
      case_arrivee: 'h8',
      shapes: [],
    },
  ];
});

const totalParcours = computed(() => seriesList.value.length);

const currentParcours = computed<ParcoursItemConfig>(() => {
  return seriesList.value[indexCourant.value] || seriesList.value[0];
});

const isCurrentLoop = computed(() => {
  return (
    !!currentParcours.value.case_depart &&
    (!currentParcours.value.case_arrivee ||
      currentParcours.value.case_depart.toLowerCase() ===
        currentParcours.value.case_arrivee.toLowerCase())
  );
});

const currentVariant = computed(() => {
  return getParcoursVariant(currentParcours.value.variante);
});

const consigneCourante = computed(() => {
  if (currentParcours.value.description && currentParcours.value.description.trim() !== '') {
    return currentParcours.value.description;
  }
  return currentVariant.value.getDefaultConsigne(
    currentParcours.value.case_arrivee || '',
    currentParcours.value.couleur_joueur,
    isCurrentLoop.value
  );
});

const pendingHint = computed(() => {
  return currentVariant.value.getPendingHint(
    currentParcours.value.case_arrivee || '',
    isCurrentLoop.value
  );
});

const headerMeta = computed(() => {
  return {
    title: props.config?.metaTitre || 'T9 - Parcours',
    typeLabel: props.config?.metaTypeLabel || 'Parcours',
    chapitreNiveauLabel: props.config?.metaChapitreNiveauLabel || '',
  };
});

const computedShapes = computed<DrawShape[]>(() => {
  const baseShapes: DrawShape[] = currentParcours.value.shapes ? [...currentParcours.value.shapes] : [];

  // Pour la variante traces, on conserve uniquement les traces sans ajouter automatiquement de repères
  if (currentParcours.value.variante === 'traces') {
    return baseShapes;
  }

  if (currentParcours.value.case_depart) {
    const dep = currentParcours.value.case_depart.toLowerCase() as DrawShape['orig'];
    const alreadyDep = baseShapes.some((s) => s.orig === dep && !s.dest);
    if (!alreadyDep) {
      baseShapes.push({ orig: dep, brush: 'blue' });
    }
  }

  if (currentParcours.value.case_arrivee && !isCurrentLoop.value) {
    const arr = currentParcours.value.case_arrivee.toLowerCase() as DrawShape['orig'];
    const alreadyArr = baseShapes.some((s) => s.orig === arr && !s.dest);
    if (!alreadyArr) {
      baseShapes.push({ orig: arr, brush: 'green' });
    }
  }

  return baseShapes;
});

const handleFeedback = (fb: CardFeedback | null) => {
  feedback.value = fb;
};

const handleSolved = () => {
  isSolved.value = true;
};

const passerParcoursSuivant = () => {
  if (indexCourant.value < seriesList.value.length - 1) {
    indexCourant.value++;
    isSolved.value = false;
    feedback.value = null;
  } else {
    emit('success');
  }
};
</script>

<style scoped>
.exercice-type-parcours {
  width: 100%;
}
</style>
