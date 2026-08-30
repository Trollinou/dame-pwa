<template>
  <div class="exercice-type-posi-plan">
    <ExerciseHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneActuelle"
      :stepBadgeText="`Étape ${etapeCouranteIndex + 1} / ${config.etapes?.length || 1}`"
    />

    <InteractiveQcmViewer
      :fenDepart="config.fen_depart"
      :couleurJoueur="config.couleur_joueur"
      :etapes="config.etapes"
      :shapes="config.shapes"
      :hideQuestion="true"
      @etape-change="(idx) => etapeCouranteIndex = idx"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import InteractiveQcmViewer from '@/components/shared/InteractiveQcmViewer.vue';
import ExerciseHeader from '@/components/shared/ExerciseHeader.vue';
import type { DrawShape } from 'eg-chessboard';

interface Choix {
  texte: string;
  san: string;
  explication: string;
}

interface Etape {
  question: string;
  choix: Choix[];
  bonne_reponse: number;
  reponse_ordinateur?: string;
}

interface ConfigPosiPlan {
  fen_depart: string;
  couleur_joueur: 'white' | 'black';
  etapes: Etape[];
  shapes?: DrawShape[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigPosiPlan;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const etapeCouranteIndex = ref(0);

const consigneActuelle = computed(() => {
  return props.config?.etapes?.[etapeCouranteIndex.value]?.question || 'Évaluez la position et choisissez le meilleur plan.';
});

const headerMeta = computed(() => {
  return {
    title: props.config?.metaTitre || 'T5 - Posi-Plan',
    typeLabel: props.config?.metaTypeLabel || 'Posi-Plan',
    chapitreNiveauLabel: props.config?.metaChapitreNiveauLabel || '',
  };
});

const onSuccess = () => {
  emit('success');
};
</script>

<style scoped>
.exercice-type-posi-plan {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>
