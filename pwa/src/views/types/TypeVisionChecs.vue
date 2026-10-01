<template>
  <VisionViewer
    :consigne="config.consigne"
    :diagrammes="(config as any).diagrammes"
    :metaTitre="(config as any).metaTitre"
    :metaTypeLabel="(config as any).metaTypeLabel"
    :metaChapitreNiveauLabel="(config as any).metaChapitreNiveauLabel"
    :legacy-config="(config as any)"
    @success="$emit('success')"
  />
</template>

<script setup lang="ts">
import VisionViewer from '@/components/shared/VisionViewer.vue';
import type { ExerciseType8Config } from '@/types/roi';

defineProps<{
  config: ExerciseType8Config;
  id: number;
}>();

defineEmits<{
  (e: 'success'): void;
}>();
</script>
