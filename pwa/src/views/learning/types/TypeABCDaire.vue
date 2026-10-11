<template>
  <div class="exercise-stage">
    <ABCDaireTactiqueViewer
      :consigne="config.consigne"
      :exercices="(config as any).exercices"
      :metaTitre="(config as any).metaTitre"
      :metaTypeLabel="(config as any).metaTypeLabel"
      :metaChapitreNiveauLabel="(config as any).metaChapitreNiveauLabel"
      :fen="config.fen"
      :solution="(config as any).solution"
      :couleurJoueur="(config as any).couleur_joueur"
      :shapes="(config as any).shapes"
      @success="gererSucces"
    />
  </div>
</template>

<script setup lang="ts">
import ABCDaireTactiqueViewer, { type ExerciceABCDaire } from '@/components/learning/viewers/ABCDaireTactiqueViewer.vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import type { ExerciseType3Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType3Config;
  id?: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const gererSucces = () => {
  emit('success');
};
</script>

