<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('update:isOpen', false)"
    :initial-breakpoint="0.5"
    :breakpoints="[0, 0.5, 0.8]"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Nouvelle Partie</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('update:isOpen', false)">Annuler</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list lines="none">
        <!-- Choix du Mode -->
        <ion-item>
          <ion-label position="stacked">Mode de jeu</ion-label>
          <ion-select v-model="gameSettings.gameMode" interface="popover">
            <ion-select-option value="1player">1 Joueur (vs Ordinateur / Stockfish)</ion-select-option>
            <ion-select-option value="2players">2 Joueurs (Pass & Play local)</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Choix de la couleur / orientation -->
        <ion-item class="ion-margin-top">
          <ion-label position="stacked">{{ gameSettings.gameMode === '1player' ? 'Ta couleur' : 'Orientation de départ' }}</ion-label>
          <ion-select v-model="gameSettings.playerColor" interface="popover">
            <ion-select-option value="white">Blancs</ion-select-option>
            <ion-select-option value="black">Noirs</ion-select-option>
            <ion-select-option value="random">Aléatoire</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Niveau ELO (Uniquement en mode 1 joueur) -->
        <ion-item v-if="gameSettings.gameMode === '1player'" class="ion-margin-top">
          <ion-label position="stacked">Niveau de l'ordinateur ({{ gameSettings.level }} ELO)</ion-label>
          <ion-range
            v-model="gameSettings.level"
            :min="1320"
            :max="2800"
            :step="10"
            snaps
            ticks
            color="secondary"
          >
            <ion-icon slot="start" :icon="handRightOutline" size="small"></ion-icon>
            <ion-icon slot="end" :icon="handRightOutline"></ion-icon>
          </ion-range>
        </ion-item>

        <ion-button expand="block" class="ion-margin-top" @click="$emit('start-game')">
          Lancer la partie
        </ion-button>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonIcon
} from '@ionic/vue';
import { handRightOutline } from 'ionicons/icons';

interface GameSettingsState {
  gameMode: '1player' | '2players';
  playerColor: 'white' | 'black' | 'random';
  level: number;
}

const gameSettings = inject<GameSettingsState>('gameSettings')!;

defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
  (e: 'start-game'): void;
}>();
</script>
