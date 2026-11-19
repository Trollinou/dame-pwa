<template>
  <VisionViewer
    :consigne="config.consigne"
    :diagrammes="(config as any).diagrammes"
    :legacy-config="(config as any)"
    @success="$emit('success')"
  />
</template>

<script setup lang="ts">
import VisionViewer from '@/components/learning/viewers/VisionViewer.vue';
import type { ExerciseType8Config } from '@/types/roi';

defineProps<{
  config: ExerciseType8Config;
  id: number;
}>();

defineEmits<{
  (e: 'success'): void;
}>();
</script>
