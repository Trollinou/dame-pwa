<template>
  <div class="content-unified-header">
    <ion-card class="header-card ion-no-margin">
      <ion-card-content class="header-card-content">
        <div v-if="showTitle && title" class="meta-title">{{ title }}</div>
        <div class="meta-bottom-row">
          <span class="meta-type">{{ typeLabel }}</span>
          <span v-if="chapitreNiveauLabel" class="meta-chapitre-niveau">{{ chapitreNiveauLabel }}</span>
        </div>
        <div
          v-if="!hideSubPanel && (consigne || stepBadgeText)"
          class="consigne-row consigne-row--merged"
        >
          <div v-if="consigne" class="consigne-text">{{ consigne }}</div>
          <ion-badge v-if="stepBadgeText" color="primary" class="step-badge">
            {{ stepBadgeText }}
          </ion-badge>
        </div>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonBadge } from '@ionic/vue';

withDefaults(
  defineProps<{
    title: string;
    typeLabel?: string;
    chapitreNiveauLabel?: string;
    consigne?: string;
    stepBadgeText?: string;
    hideSubPanel?: boolean;
    showTitle?: boolean;
  }>(),
  {
    typeLabel: 'Exercice',
    chapitreNiveauLabel: undefined,
    consigne: undefined,
    stepBadgeText: undefined,
    hideSubPanel: false,
    showTitle: false
  }
);
</script>
