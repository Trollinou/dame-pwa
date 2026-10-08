<template>
  <div class="split-master-detail">
    <!-- Colonne Master (1/3 sur grand écran, pleine largeur sur mobile) -->
    <div class="split-master-detail__master">
      <slot name="master"></slot>
    </div>

    <!-- Colonne Detail (2/3 sur grand écran, masquée sur mobile/portrait) -->
    <div class="split-master-detail__detail">
      <div v-if="hasSelection" class="split-master-detail__detail-content">
        <slot name="detail"></slot>
      </div>
      <div v-else class="split-master-detail__empty-state">
        <ion-icon :icon="informationCircleOutline" class="empty-icon"></ion-icon>
        <h3>{{ emptyTitle || 'Aucun élément sélectionné' }}</h3>
        <p>{{ emptyMessage || 'Sélectionnez un élément dans la liste pour afficher ses détails.' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { informationCircleOutline } from 'ionicons/icons';

withDefaults(
  defineProps<{
    hasSelection?: boolean;
    emptyTitle?: string;
    emptyMessage?: string;
  }>(),
  {
    hasSelection: true,
    emptyTitle: '',
    emptyMessage: ''
  }
);
</script>
