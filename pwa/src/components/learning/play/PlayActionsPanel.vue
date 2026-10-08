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
