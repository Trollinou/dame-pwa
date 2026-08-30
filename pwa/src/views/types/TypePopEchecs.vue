<template>
  <div class="exercice-type-popechecs">
    <PlacementViewer
      :consigne="config.consigne"
      :diagrammes="config.diagrammes"
      :metaTitre="config.metaTitre"
      :metaTypeLabel="config.metaTypeLabel"
      :metaChapitreNiveauLabel="config.metaChapitreNiveauLabel"
      @success="gererSucces"
    />
  </div>
</template>

<script setup lang="ts">
import PlacementViewer, { type DiagrammePopEchecs } from '@/components/shared/PlacementViewer.vue';
import { useApprentissageStore } from '@/stores/apprentissage';

export interface ConfigPopEchecs {
  consigne?: string;
  diagrammes?: DiagrammePopEchecs[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

const props = defineProps<{
  config: ConfigPopEchecs;
  id: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const gererSucces = () => {
  emit('success');
};
</script>

<style scoped>
.exercice-type-popechecs {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>
