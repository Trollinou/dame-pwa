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

<style scoped>
.split-master-detail {
  display: block;
  width: 100%;
}

.split-master-detail__detail {
  display: none;
}

/* Mode écran large / Tablette paysage : affichage en grille 1/3 - 2/3 */
@media (min-width: 1024px), ((min-width: 768px) and (min-height: 600px) and (orientation: landscape)) {
  .split-master-detail {
    display: grid;
    grid-template-columns: minmax(320px, 1fr) 2fr;
    gap: 1.25rem;
    align-items: start;
  }

  .split-master-detail__master {
    height: 100%;
  }

  .split-master-detail__detail {
    display: block;
    position: sticky;
    top: 0;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    background: var(--ion-card-background, var(--ion-background-color, #ffffff));
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.08);
  }

  .split-master-detail__detail-content {
    animation: fadeIn 0.2s ease-in-out;
  }

  .split-master-detail__empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 1.5rem;
    color: var(--ion-color-medium);
  }

  .split-master-detail__empty-state .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .split-master-detail__empty-state h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--ion-text-color);
  }

  .split-master-detail__empty-state p {
    margin: 0;
    font-size: 0.9rem;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
