<template>
  <div class="exercise-stage">
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="(config as any).questions?.[0]?.texte || `Évaluez la position (${(config as any).theme || 'Échec & Éval'})`"
      :stepBadgeText="`Question 1 / ${(config as any).questions?.length || 1}`"
    />

    <EvalViewer
      :couleurJoueur="(config as any).couleur_joueur"
      :fenDepart="(config as any).fen_depart || config.fen"
      :pgnExplication="(config as any).pgn_explication"
      :questions="(config as any).questions"
      :shapes="(config as any).shapes || []"
      :solutionMoves="(config as any).solution_moves"
      :theme="(config as any).theme"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import EvalViewer, { type QuestionEval } from '@/components/learning/viewers/EvalViewer.vue';
import ContentHeader from '@/components/learning/ContentHeader.vue';
import type { ExerciseType10Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType10Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const headerMeta = computed(() => {
  return {
    title: (props.config as any)?.metaTitre || 'T10 - Échec & Éval',
    typeLabel: (props.config as any)?.metaTypeLabel || 'Échec & Éval',
    chapitreNiveauLabel: (props.config as any)?.metaChapitreNiveauLabel || '',
  };
});

const onSuccess = () => {
  emit('success');
};
</script>

