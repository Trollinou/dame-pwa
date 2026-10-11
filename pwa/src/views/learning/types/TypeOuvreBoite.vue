<template>
  <div class="exercise-stage">
    <OuvreBoiteViewer
      :consigne="config.consigne"
      :exercices="(config as any).exercices"
      :pgn="(config as any).pgn"
      :metaTitre="(config as any).metaTitre"
      :metaTypeLabel="(config as any).metaTypeLabel"
      :metaChapitreNiveauLabel="(config as any).metaChapitreNiveauLabel"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import OuvreBoiteViewer from '@/components/learning/viewers/OuvreBoiteViewer.vue';
import type { ExerciseType13Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType13Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const onSuccess = () => {
  emit('success');
};
</script>

