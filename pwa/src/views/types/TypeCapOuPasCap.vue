<template>
  <div class="exercice-type-cap-ou-pas-cap">
    <CapOuPasCapViewer
      :consigne="config.consigne"
      :variante="config.variante || config.type_reponse"
      :propositions="config.propositions"
      :question="config.question"
      :exercices="config.exercices || config.diagrammes"
      :metaTitre="config.metaTitre"
      :metaTypeLabel="config.metaTypeLabel"
      :metaChapitreNiveauLabel="config.metaChapitreNiveauLabel"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import CapOuPasCapViewer, { type ExerciceCapOuPasCap } from '@/components/shared/CapOuPasCapViewer.vue';

export interface ConfigCapOuPasCap {
  consigne?: string;
  variante?: 'qcm_multiple' | 'qcm_oui_non' | 'move' | string;
  type_reponse?: 'qcm_multiple' | 'qcm_oui_non' | 'move' | string;
  propositions?: string[];
  question?: string;
  exercices?: ExerciceCapOuPasCap[];
  diagrammes?: ExerciceCapOuPasCap[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigCapOuPasCap;
  id?: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const onSuccess = () => {
  emit('success');
};
</script>

<style scoped>
.exercice-type-cap-ou-pas-cap {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>
