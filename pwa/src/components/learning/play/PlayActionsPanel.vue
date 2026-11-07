<template>
  <div class="side-section">
    <!-- Zone de statut / résultat épurée -->
    <div class="message-zone ion-text-center">
      <div v-if="gameStatusMessage" :class="['status-banner', gameStatusColor]">
        {{ gameStatusMessage }}
      </div>
      <div v-else-if="engineStatus === 'searching' && gameMode === '1player'" class="status-placeholder status-thinking">
        <ion-spinner name="dots" class="thinking-spinner"></ion-spinner>
        <span>L'ordinateur réfléchit...</span>
      </div>
      <div v-else class="status-placeholder">
        <span class="turn-dot" :class="turnColor"></span>
        C'est au tour des {{ turnColor === 'white' ? 'Blancs' : 'Noirs' }}
      </div>
    </div>

    <!-- Barre d'actions épurée -->
    <div class="actions-container">
      <ion-grid class="ion-no-padding">
        <!-- Interruption bienveillante lors d'une gaffe en Mode Coach -->
        <ion-row v-if="isAwaitingCoachConfirmation" class="coach-confirmation-row">
          <ion-col :size="isLandscape ? '12' : '6'">
            <ion-button
              expand="block"
              fill="solid"
              color="warning"
              class="game-action-btn coach-undo-btn"
              @click="$emit('coach-undo')"
            >
              <ion-icon slot="start" :icon="arrowUndoOutline"></ion-icon>
              <span>Reprendre</span>
            </ion-button>
          </ion-col>
          <ion-col :size="isLandscape ? '12' : '6'">
            <ion-button
              expand="block"
              fill="outline"
              color="medium"
              class="game-action-btn coach-proceed-btn"
              @click="$emit('coach-proceed')"
            >
              <ion-icon slot="start" :icon="playForwardOutline"></ion-icon>
              <span>Laisser jouer</span>
            </ion-button>
          </ion-col>
        </ion-row>

        <ion-row v-else class="actions-row">
          <!-- Bouton Nouvelle partie / Options -->
          <ion-col :size="isLandscape ? '12' : (gameMode === '2players' ? '4' : '3')">
            <ion-button
              expand="block"
              fill="outline"
              color="primary"
              class="game-action-btn"
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
              class="game-action-btn"
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
              class="game-action-btn"
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
              class="game-action-btn"
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
import {
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner
} from '@ionic/vue';
import type { EngineStatus } from 'eg-chessboard';
import {
  optionsOutline,
  bulbOutline,
  arrowUndoOutline,
  analyticsOutline,
  playForwardOutline
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
    engineStatus?: EngineStatus;
    isCoachMode?: boolean;
    isAwaitingCoachConfirmation?: boolean;
  }>(),
  {
    gameMode: '1player',
    engineStatus: 'uninitialized',
    isCoachMode: false,
    isAwaitingCoachConfirmation: false
  }
);

defineEmits<{
  (e: 'reset-game'): void;
  (e: 'toggle-hint'): void;
  (e: 'undo-move'): void;
  (e: 'go-to-analysis'): void;
  (e: 'coach-undo'): void;
  (e: 'coach-proceed'): void;
}>();
</script>
