<template>
  <div class="exercise-stage">
    <PlacementViewer
      :consigne="config.consigne"
      :diagrammes="(config as any).diagrammes"
      :metaTitre="(config as any).metaTitre"
      :metaTypeLabel="(config as any).metaTypeLabel"
      :metaChapitreNiveauLabel="(config as any).metaChapitreNiveauLabel"
      @success="gererSucces"
    />
  </div>
</template>

<script setup lang="ts">
import PlacementViewer, { type DiagrammePopEchecs } from '@/components/shared/PlacementViewer.vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import type { ExerciseType2Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType2Config;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const gererSucces = () => {
  emit('success');
};
</script>

