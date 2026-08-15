<template>
  <div class="side-section">
    <!-- Zone de statut / résultat épurée -->
    <div class="message-zone ion-text-center">
      <div v-if="gameStatusMessage" :class="['status-banner', gameStatusColor]">
        {{ gameStatusMessage }}
      </div>
      <div v-else class="status-placeholder">
        <span class="turn-dot" :class="turnColor"></span>
        C'est au tour des {{ turnColor === 'white' ? 'Blancs' : 'Noirs' }}
      </div>
    </div>

    <!-- Barre d'actions épurée -->
    <div class="actions-container">
      <ion-grid class="ion-no-padding">
        <ion-row class="actions-row">
          <!-- Bouton Nouvelle partie / Options -->
          <ion-col :size="isLandscape ? '12' : (gameMode === '2players' ? '4' : '3')">
            <ion-button
              expand="block"
              fill="outline"
              color="primary"
              class="action-btn"
              @click="$emit('reset-game')"
            >
              <ion-icon slot="start" :icon="optionsOutline"></ion-icon>
              <span>Nouv.</span>
            </ion-button>
          </ion-col>

          <!-- Bouton Aide -->
          <ion-col v-if="gameMode !== '2players'" :size="isLandscape ? '12' : '3'">
            <ion-button
              expand="block"
              :fill="isHintEnabled ? 'solid' : 'outline'"
              :color="isHintEnabled ? 'success' : 'medium'"
              class="action-btn"
              @click="$emit('toggle-hint')"
            >
              <ion-icon slot="start" :icon="bulbOutline"></ion-icon>
              <span>Aide</span>
              <ion-badge v-if="helpCount > 0" color="success" class="btn-counter-badge">{{ helpCount }}</ion-badge>
            </ion-button>
          </ion-col>

          <!-- Bouton Oups / Annuler -->
          <ion-col :size="isLandscape ? '12' : (gameMode === '2players' ? '4' : '3')">
            <ion-button
              expand="block"
              fill="outline"
              color="warning"
              :disabled="viewOnly"
              class="action-btn"
              @click="$emit('undo-move')"
            >
              <ion-icon slot="start" :icon="arrowUndoOutline"></ion-icon>
              <span>Oups</span>
              <ion-badge v-if="oupsCount > 0" color="warning" class="btn-counter-badge">{{ oupsCount }}</ion-badge>
            </ion-button>
          </ion-col>

          <!-- Bouton Analyse -->
          <ion-col :size="isLandscape ? '12' : (gameMode === '2players' ? '4' : '3')">
            <ion-button
              expand="block"
              fill="outline"
              color="tertiary"
              class="action-btn"
              @click="$emit('go-to-analysis')"
            >
              <ion-icon slot="start" :icon="analyticsOutline"></ion-icon>
              <span>Analyse</span>
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonGrid, IonRow, IonCol, IonButton, IonIcon, IonBadge } from '@ionic/vue';
import {
  optionsOutline,
  bulbOutline,
  arrowUndoOutline,
  analyticsOutline
} from 'ionicons/icons';

withDefaults(
  defineProps<{
    isLandscape: boolean;
    gameStatusMessage: string;
    gameStatusColor: string;
    turnColor: 'white' | 'black';
    isHintEnabled: boolean;
    helpCount: number;
    oupsCount: number;
    viewOnly: boolean;
    gameMode?: '1player' | '2players';
  }>(),
  {
    gameMode: '1player'
  }
);

defineEmits<{
  (e: 'reset-game'): void;
  (e: 'toggle-hint'): void;
  (e: 'undo-move'): void;
  (e: 'go-to-analysis'): void;
}>();
</script>

<style scoped>
.side-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.message-zone {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-banner {
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.status-banner.warning {
  background: rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.15);
  color: #b45309;
  border: 1px solid rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.4);
}

.status-banner.danger {
  background: rgba(var(--ion-color-danger-rgb, 235, 68, 90), 0.12);
  color: var(--ion-color-danger, #eb445a);
  border: 1px solid rgba(var(--ion-color-danger-rgb, 235, 68, 90), 0.3);
}

.status-banner.medium {
  background: var(--ion-color-step-100, #f3f4f6);
  color: var(--ion-color-step-800, #1f2937);
  border: 1px solid var(--ion-color-step-200, #e5e7eb);
}

.status-placeholder {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ion-color-step-600, #6b7280);
  font-size: 0.85rem;
  font-weight: 500;
  background: var(--ion-color-step-50, #f9fafb);
  padding: 4px 12px;
  border-radius: 16px;
  border: 1px solid var(--ion-color-step-100, #f3f4f6);
}

.turn-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.turn-dot.white {
  background: #ffffff;
  border: 1.5px solid #4b5563;
}

.turn-dot.black {
  background: #111827;
  border: 1.5px solid #111827;
}

.actions-row {
  margin: 0 -4px;
}

.actions-row ion-col {
  padding: 0 4px;
}

.action-btn {
  --border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  height: 38px;
  margin: 0;
  --padding-start: 6px;
  --padding-end: 6px;
}

.action-btn ion-icon {
  font-size: 1rem;
  margin-right: 4px;
}

.btn-counter-badge {
  font-size: 0.65rem;
  padding: 2px 5px;
  margin-left: 4px;
  border-radius: 10px;
}
</style>
