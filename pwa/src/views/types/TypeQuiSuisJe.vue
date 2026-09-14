<template>
  <div class="exercice-type-qui-suis-je">
    <QuiSuisJeViewer
      :consigne="config.consigne"
      :variante="config.variante"
      :series="config.series"
      :metaTitre="config.metaTitre"
      :metaTypeLabel="config.metaTypeLabel"
      :metaChapitreNiveauLabel="config.metaChapitreNiveauLabel"
      @success="$emit('success')"
    />
  </div>
</template>

<script setup lang="ts">
import QuiSuisJeViewer, { type SerieQuiSuisJe } from '@/components/shared/QuiSuisJeViewer.vue';

export interface ConfigQuiSuisJe {
  consigne?: string;
  variante?: 'pieces' | 'cases' | string;
  series?: SerieQuiSuisJe[];
  metaTitre?: string;
  metaTypeLabel?: string;
  metaChapitreNiveauLabel?: string;
}

defineProps<{
  config: ConfigQuiSuisJe;
  id?: number;
}>();

defineEmits<{
  (e: 'success'): void;
}>();
</script>

<style scoped>
.exercice-type-qui-suis-je {
  width: 100%;
}
</style>

