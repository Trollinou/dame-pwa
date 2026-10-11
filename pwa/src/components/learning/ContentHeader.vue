<template>
  <div class="content-unified-header">
    <!-- Panel 1: Métadonnées Compactes -->
    <ion-card class="header-card meta-card ion-no-margin">
      <ion-card-content class="meta-card-content">
        <div class="meta-title">{{ title }}</div>
        <div class="meta-bottom-row">
          <span class="meta-type">{{ typeLabel }}</span>
          <span v-if="chapitreNiveauLabel" class="meta-chapitre-niveau">{{ chapitreNiveauLabel }}</span>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Panel 2: Consigne / Question + Badge Compact (Optionnel / Masquable) -->
    <ion-card
      v-if="!hideSubPanel && (consigne || stepBadgeText)"
      class="header-card consigne-card ion-no-margin"
    >
      <ion-card-content class="consigne-card-content">
        <div class="consigne-row">
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
  }>(),
  {
    typeLabel: 'Exercice',
    chapitreNiveauLabel: undefined,
    consigne: undefined,
    stepBadgeText: undefined,
    hideSubPanel: false
  }
);
</script>
