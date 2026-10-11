<template>
  <ContentHeader
    :title="props.title"
    :typeLabel="props.typeLabel"
    :chapitreNiveauLabel="props.chapitreNiveauLabel"
    :consigne="props.consigne"
    :stepBadgeText="props.stepBadgeText"
    :hideSubPanel="props.hideSubPanel"
  />
</template>

<script setup lang="ts">
import ContentHeader from './ContentHeader.vue';

const props = withDefaults(
  defineProps<{
    title: string;
    typeLabel?: string;
    chapitreNiveauLabel?: string;
    consigne?: string;
    stepBadgeText?: string;
    hideSubPanel?: boolean;
  }>(),
  {
    typeLabel: 'Exercice',
    chapitreNiveauLabel: undefined,
    consigne: undefined,
    stepBadgeText: undefined,
    hideSubPanel: false,
  }
);
</script>
