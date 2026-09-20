<template>
  <div class="exercise-stage">
    <div v-if="config.consigne" class="learning-callout learning-callout--info ion-text-center" style="width: 100%;">
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
import OrderViewer from '@/components/shared/OrderViewer.vue';
import type { DrawShape } from 'eg-chessboard';

interface PositionItem {
  fen: string;
  couleur_joueur: 'white' | 'black';
  shapes?: DrawShape[];
}

interface ConfigClassEchecs {
  consigne?: string;
  positions: PositionItem[];
}

const props = defineProps<{
  config: ConfigClassEchecs;
  id: number;
}>();

defineEmits<{
  (e: 'success'): void;
}>();

const itemsAOrdonner = computed(() => {
  if (!props.config?.positions || !Array.isArray(props.config.positions)) {
    return [];
  }
  return props.config.positions.map((pos, index) => ({
    id: index,
    fen: pos.fen,
    orientation: pos.couleur_joueur,
    shapes: pos.shapes || []
  }));
});
</script>

