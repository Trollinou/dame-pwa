<template>
  <div class="diagram-viewer-container">
    <div class="main-board">
      <Chessboard
        :fen="props.fen"
        :shapes="props.shapes"
        :orientation="props.orientation"
        :last-move="props.lastMove"
        :highlight-last-move="props.highlightLastMove"
        :view-only="true"
        :zoomable="props.zoomable"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chessboard } from '@/components/shared/Chessboard';
import type { DrawShape, Key } from 'eg-chessboard';

const props = withDefaults(
  defineProps<{
    fen: string;
    orientation?: 'white' | 'black';
    shapes?: DrawShape[];
    lastMove?: Key[];
    highlightLastMove?: boolean;
    zoomable?: boolean;
  }>(),
  {
    orientation: 'white',
    shapes: () => [],
    highlightLastMove: true,
    zoomable: true
  }
);
</script>
