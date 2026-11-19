<template>
  <div class="exercise-stage">
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
import EvalViewer from '@/components/learning/viewers/EvalViewer.vue';
import type { ExerciseType10Config } from '@/types/roi';

defineProps<{
  config: ExerciseType10Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const onSuccess = () => {
  emit('success');
};
</script>

