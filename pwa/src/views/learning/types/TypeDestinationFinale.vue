<template>
  <div class="exercise-stage">
    <TextOrderViewer
      :consigne="config.consigne"
      :couleurJoueur="(config as any).couleur_joueur"
      :etapesCorrectes="(config as any).etapes_texte"
      :fenDepart="(config as any).fen_depart || config.fen"
      :pgnExplication="(config as any).pgn_explication"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { useApprentissageStore } from '@/stores/apprentissage';
import TextOrderViewer from '@/components/shared/TextOrderViewer.vue';
import type { ExerciseType16Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType16Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const onSuccess = () => {
  emit('success');
};
</script>

