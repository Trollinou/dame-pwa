<template>
  <div class="diagram-viewer-container">
    <div class="main-board">
      <Chessboard
        :fen="props.fen"
        :shapes="props.shapes"
        :orientation="props.orientation"
        :view-only="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chessboard } from '@/components/shared/Chessboard';
import type { DrawShape } from 'eg-chessboard';

const props = withDefaults(
  defineProps<{
    fen: string;
    orientation?: 'white' | 'black';
    shapes?: DrawShape[];
  }>(),
  {
    orientation: 'white',
    shapes: () => []
  }
);
</script>

<style scoped>
.diagram-viewer-container {
  width: 100%;
  max-width: 400px;
  margin: 16px auto;
}
</style>
