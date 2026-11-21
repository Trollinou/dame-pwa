<template>
  <div class="exercise-stage">
    <OrderViewer
      v-if="itemsAOrdonner && itemsAOrdonner.length > 0"
      :correct-items="itemsAOrdonner"
      :consigne="config.consigne"
      @success="$emit('success')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import OrderViewer from '@/components/learning/viewers/OrderViewer.vue';
import type { DrawShape } from 'eg-chessboard';
import type { ClassEchecsPositionItem, ExerciseType11Config } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType11Config;
  id: number;
}>();

defineEmits<{
  (e: 'success'): void;
}>();

const itemsAOrdonner = computed(() => {
  const positions = props.config?.positions;
  if (!positions || !Array.isArray(positions)) {
    return [];
  }
  return positions.map((pos: ClassEchecsPositionItem, index: number) => ({
    id: index,
    fen: pos.fen,
    orientation: pos.couleur_joueur || 'white',
    shapes: (pos.shapes as DrawShape[]) || [],
    commentaire: pos.commentaire,
  }));
});
</script>

