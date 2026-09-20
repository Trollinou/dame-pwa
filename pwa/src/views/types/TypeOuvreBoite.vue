<template>
  <div class="exercise-stage">
    <OuvreBoiteViewer
      :consigne="config.consigne"
      :exercices="config.exercices"
      :metaTitre="config.metaTitre"
      :metaTypeLabel="config.metaTypeLabel"
      :metaChapitreNiveauLabel="config.metaChapitreNiveauLabel"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import OuvreBoiteViewer, { type ExerciceItem } from '@/components/shared/OuvreBoiteViewer.vue';

export interface ConfigOuvreBoite {
  consigne?: string;
  exercices?: Array<ExerciceItem | string>;
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigOuvreBoite;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const onSuccess = () => {
  emit('success');
};
</script>

