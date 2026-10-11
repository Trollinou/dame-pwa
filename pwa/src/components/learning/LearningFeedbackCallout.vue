<template>
  <div
    class="learning-callout animate-fade-in"
    :class="calloutClass"
    role="region"
    aria-live="polite"
  >
    <div v-if="displayTitle || displayIcon" class="learning-callout__title">
      <span v-if="displayIcon" class="learning-callout__icon" aria-hidden="true">{{ displayIcon }}</span>
      <span v-if="displayTitle">{{ displayTitle }}</span>
    </div>
    <slot>
      <p class="learning-callout-text">{{ text }}</p>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type CalloutType = 'success' | 'error' | 'info' | 'tip' | 'quote' | 'warning';

const props = withDefaults(
  defineProps<{
    type?: CalloutType;
    title?: string;
    text?: string;
    icon?: string;
  }>(),
  {
    type: 'success',
    title: '',
    text: '',
    icon: '',
  }
);

const calloutClass = computed(() => {
  return `learning-callout--${props.type}`;
});

const defaultIcons: Record<CalloutType, string> = {
  success: '💡',
  tip: '💡',
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  quote: '💬',
};

const displayIcon = computed(() => {
  if (props.icon) return props.icon;
  if (props.title) return defaultIcons[props.type] || '';
  return '';
});

const displayTitle = computed(() => {
  return props.title;
});
</script>
