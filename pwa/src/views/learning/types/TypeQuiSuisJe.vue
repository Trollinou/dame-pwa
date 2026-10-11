<template>
  <div class="exercise-stage">
    <QuiSuisJeViewer
      :consigne="config.consigne"
      :variante="config.variante"
      :series="(config as any).series"
      :metaTitre="(config as any).metaTitre"
      :metaTypeLabel="(config as any).metaTypeLabel"
      :metaChapitreNiveauLabel="(config as any).metaChapitreNiveauLabel"
      @success="$emit('success')"
    />
  </div>
</template>

<script setup lang="ts">
import QuiSuisJeViewer from '@/components/learning/viewers/QuiSuisJeViewer.vue';
import type { ExerciseType12Config } from '@/types/roi';

defineProps<{
  config: ExerciseType12Config;
  id?: number;
}>();

defineEmits<{
  (e: 'success'): void;
}>();
</script>


