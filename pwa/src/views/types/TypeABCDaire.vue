<template>
  <div class="exercice-type-abcdaire">
    <ABCDaireTactiqueViewer
      :consigne="config.consigne"
      :exercices="config.exercices"
      :metaTitre="config.metaTitre"
      :metaTypeLabel="config.metaTypeLabel"
      :metaChapitreNiveauLabel="config.metaChapitreNiveauLabel"
      :fen="config.fen"
      :solution="config.solution"
      :couleurJoueur="config.couleur_joueur"
      :shapes="config.shapes"
      @success="gererSucces"
    />
  </div>
</template>

<script setup lang="ts">
import ABCDaireTactiqueViewer, { type ExerciceABCDaire } from '@/components/shared/ABCDaireTactiqueViewer.vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import type { DrawShape } from 'eg-chessboard';

export interface ConfigABCDaire {
  consigne?: string;
  exercices?: ExerciceABCDaire[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
  id?: number;
  // Rétrocompatibilité
  fen?: string;
  solution?: string[];
  couleur_joueur?: 'white' | 'black';
  shapes?: DrawShape[];
}

const props = defineProps<{
  config: ConfigABCDaire;
  id?: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const gererSucces = () => {
  emit('success');
};
</script>

<style scoped>
.exercice-type-abcdaire {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>
