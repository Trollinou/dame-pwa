<template>
  <div class="exercise-stage">
    <div v-if="config.consigne" class="learning-callout learning-callout--info ion-text-center">
      <span>{{ config.consigne }}</span>
    </div>

    <OrderViewer
      v-if="itemsAOrdonner && itemsAOrdonner.length > 0"
      :correct-items="itemsAOrdonner"
      @success="$emit('success')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import OrderViewer from '@/components/learning/viewers/OrderViewer.vue';
import type { DrawShape } from 'eg-chessboard';
import type { ExerciseType11Config } from '@/types/roi';

interface PositionItem {
  fen: string;
  couleur_joueur: 'white' | 'black';
  shapes?: DrawShape[];
}

const props = defineProps<{
  config: ExerciseType11Config;
  id: number;
}>();

defineEmits<{
  (e: 'success'): void;
}>();

const itemsAOrdonner = computed(() => {
  const positions = (props.config as any)?.positions;
  if (!positions || !Array.isArray(positions)) {
    return [];
  }
  return (positions as PositionItem[]).map((pos, index) => ({
    id: index,
    fen: pos.fen,
    orientation: pos.couleur_joueur,
    shapes: pos.shapes || []
  }));
});
</script>

