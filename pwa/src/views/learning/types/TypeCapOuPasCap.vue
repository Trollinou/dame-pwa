<template>
  <div class="exercise-stage">
    <CapOuPasCapViewer
      :consigne="config.consigne"
      :variante="(config as any).variante || (config as any).type_reponse"
      :mode_clic="(config as any).mode_clic"
      :mode_setup="(config as any).mode_setup"
      :options_reponse="(config as any).options_reponse"
      :propositions="(config as any).propositions"
      :question="(config as any).question"
      :exercices="(config as any).exercices || (config as any).diagrammes"
      :metaTitre="(config as any).metaTitre"
      :metaTypeLabel="(config as any).metaTypeLabel"
      :metaChapitreNiveauLabel="(config as any).metaChapitreNiveauLabel"
      @success="onSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import CapOuPasCapViewer from '@/components/shared/CapOuPasCapViewer.vue';
import type { ExerciseType14Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType14Config;
  id?: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const onSuccess = () => {
  emit('success');
};
</script>

