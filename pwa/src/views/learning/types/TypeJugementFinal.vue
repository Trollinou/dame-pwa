<template>
  <div class="exercise-stage">
    <JugementFinalViewer
      :consigne="config.consigne"
      :couleurJoueur="(config as any).couleur_joueur"
      :fenDepart="(config as any).fen_depart || config.fen"
      :pgnExplication="(config as any).pgn_explication"
      :scenarios="(config as any).scenarios"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import JugementFinalViewer from '@/components/learning/viewers/JugementFinalViewer.vue';
import type { ExerciseType15Config } from '@/types/roi';

defineProps<{
  config: ExerciseType15Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const onSuccess = () => {
  emit('success');
};
</script>

