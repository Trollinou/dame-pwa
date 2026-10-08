<template>
  <div class="exercice-type-100commandements">
    <ContentHeader
      :title="headerMeta.title"
      :typeLabel="headerMeta.typeLabel"
      :chapitreNiveauLabel="headerMeta.chapitreNiveauLabel"
      :consigne="consigneActive"
      :stepBadgeText="`Question ${qcmIndex + 1} / ${qcmsList.length}`"
    />

    <QcmViewer
      v-if="qcmActuel"
      :key="qcmIndex"
      :question="qcmActuel.question || (qcmActuel as any).consigne || ''"
      :hideQuestion="true"
      :choix="qcmActuel.reponses || (qcmActuel as any).choix || []"
      :bonneReponse="qcmActuel.bonne_reponse ?? (qcmActuel as any).bonneReponse ?? 0"
      :shapes="(qcmActuel as any).shapes || (props.config as any)?.shapes"
      :fen="(qcmActuel as any).fen || (props.config as any)?.fen"
      :currentCard="qcmIndex + 1"
      :totalCards="qcmsList.length"
      @success="gererSucces"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import QcmViewer from '@/components/shared/QcmViewer.vue';
import ContentHeader from '@/components/shared/ContentHeader.vue';
import { useApprentissageStore } from '@/stores/apprentissage';
import type { ExerciseType1Config, QcmItem } from '@/types/roi';

const props = defineProps<{
  config: ExerciseType1Config;
  id?: number;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const headerMeta = computed(() => {
  const cfg = props.config as Record<string, any>;
  return {
    title: (cfg?.metaTitre as string) || 'T1 - 100 Commandements',
    typeLabel: (cfg?.metaTypeLabel as string) || '100 Commandements',
    chapitreNiveauLabel: (cfg?.metaChapitreNiveauLabel as string) || '',
  };
});

const store = useApprentissageStore();
const qcmIndex = ref(0);

const qcmsList = computed<QcmItem[]>(() => {
  if (props.config?.qcms && Array.isArray(props.config.qcms) && props.config.qcms.length > 0) {
    return props.config.qcms;
  }
  const cfg = props.config as Record<string, any>;
  if (cfg?.question) {
    return [
      {
        question: cfg.question,
        reponses: cfg.reponses || cfg.choix || [],
        bonne_reponse: cfg.bonne_reponse ?? cfg.bonneReponse ?? 0,
        shapes: cfg.shapes,
        fen: cfg.fen
      } as unknown as QcmItem
    ];
  }
  return [];
});

const qcmActuel = computed<QcmItem | null>(() => {
  if (qcmsList.value.length === 0) return null;
  return qcmsList.value[qcmIndex.value] || qcmsList.value[0];
});

const consigneActive = computed<string>(() => {
  return (
    (qcmActuel.value as any)?.consigne ||
    qcmActuel.value?.question ||
    props.config?.consigne ||
    'Sélectionne la bonne réponse.'
  );
});

const estDernierQcm = computed(() => {
  return qcmIndex.value >= qcmsList.value.length - 1;
});

watch(
  () => props.config,
  () => {
    qcmIndex.value = 0;
  },
  { deep: true }
);

const gererSucces = () => {
  if (!estDernierQcm.value) {
    qcmIndex.value++;
  } else {
    emit('success');
  }
};
</script>
