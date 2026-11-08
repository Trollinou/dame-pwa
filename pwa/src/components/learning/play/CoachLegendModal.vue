<template>
  <ion-modal
    :is-open="isOpen"
    :initial-breakpoint="0.75"
    :breakpoints="[0, 0.75, 1.0]"
    class="coach-legend-modal"
    @didDismiss="$emit('update:isOpen', false)"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Légende du Coach</ion-title>
        <ion-buttons slot="end">
          <ion-button
            color="primary"
            @click="$emit('update:isOpen', false)"
          >
            Fermer
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding coach-legend-content">
      <p class="coach-legend-intro">
        En mode Coach et lors de l'analyse, l'échiquier affiche des repères visuels pour évaluer vos coups et signaler les alertes tactiques en direct.
      </p>

      <!-- Section 1 : Évaluation des coups -->
      <div class="coach-legend-section">
        <h3 class="coach-legend-section__title">
          Évaluation des coups
        </h3>
        <ion-list lines="inset" class="coach-legend-list">
          <ion-item
            v-for="item in moveJudgements"
            :key="item.id"
            class="coach-legend-item"
          >
            <div slot="start" class="coach-legend-badge">
              <svg viewBox="0 0 100 100" class="coach-legend-svg" aria-hidden="true">
                <circle cx="50" cy="50" r="48" :fill="item.fill" />
                <path
                  :d="item.svgPath"
                  :fill="item.isStroke ? 'none' : '#ffffff'"
                  :stroke="item.isStroke ? '#ffffff' : 'none'"
                  :stroke-width="item.strokeWidth ?? 0"
                  :fill-rule="item.fillRule"
                />
              </svg>
            </div>
            <ion-label class="ion-text-wrap">
              <div class="coach-legend-item__header">
                <span class="coach-legend-item__symbol">{{ item.glyph }}</span>
                <span class="coach-legend-item__name">{{ item.title }}</span>
              </div>
              <p class="coach-legend-item__desc">{{ item.description }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Section 2 : Alertes & Motifs tactiques -->
      <div class="coach-legend-section">
        <h3 class="coach-legend-section__title">
          Alertes & Motifs tactiques
        </h3>
        <ion-list lines="inset" class="coach-legend-list">
          <ion-item
            v-for="item in tacticalGlyphs"
            :key="item.id"
            class="coach-legend-item"
          >
            <div slot="start" class="coach-legend-badge">
              <svg viewBox="0 0 100 100" class="coach-legend-svg" aria-hidden="true">
                <circle cx="50" cy="50" r="48" :fill="item.fill" />
                <path
                  :d="item.svgPath"
                  :fill="item.isStroke ? 'none' : '#ffffff'"
                  :stroke="item.isStroke ? '#ffffff' : 'none'"
                  :stroke-width="item.strokeWidth ?? 0"
                  :fill-rule="item.fillRule"
                />
              </svg>
            </div>
            <ion-label class="ion-text-wrap">
              <div class="coach-legend-item__header">
                <span class="coach-legend-item__name">{{ item.title }}</span>
              </div>
              <p class="coach-legend-item__desc">{{ item.description }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
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
} from '@ionic/vue';

defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
}>();

interface LegendGlyphItem {
  id: string;
  glyph?: string;
  title: string;
  description: string;
  fill: string;
  svgPath: string;
  isStroke?: boolean;
  strokeWidth?: number;
  fillRule?: 'nonzero' | 'evenodd';
}

const moveJudgements: LegendGlyphItem[] = [
  {
    id: 'brilliant',
    glyph: '!!',
    title: 'Coup brillant',
    description: 'Coup exceptionnel impliquant souvent un sacrifice payant ou une idée tactique profonde.',
    fill: '#168226',
    svgPath: 'M71.967 62.349h-9.75l-2.049-39.083h13.847zM60.004 76.032q0-3.77 2.049-5.244 2.048-1.557 4.998-1.557 2.867 0 4.916 1.557 2.048 1.475 2.048 5.244 0 3.605-2.048 5.244-2.049 1.556-4.916 1.556-2.95 0-4.998-1.556-2.049-1.64-2.049-5.244zM37.967 62.349h-9.75l-2.049-39.083h13.847zM26.004 76.032q0-3.77 2.049-5.244 2.048-1.557 4.998-1.557 2.867 0 4.916 1.557 2.048 1.475 2.048 5.244 0 3.605-2.048 5.244-2.049 1.556-4.916 1.556-2.95 0-4.998-1.556-2.049-1.64-2.049-5.244z',
  },
  {
    id: 'good',
    glyph: '!',
    title: 'Bon coup / Coup validé',
    description: 'Coup solide et précis sans menace majeure créée, validé directement par le coach.',
    fill: '#22ac38',
    svgPath: 'M54.967 62.349h-9.75l-2.049-39.083h13.847zM43.004 76.032q0-3.77 2.049-5.244 2.048-1.557 4.998-1.557 2.867 0 4.916 1.557 2.048 1.475 2.048 5.244 0 3.605-2.048 5.244-2.049 1.556-4.916 1.556-2.95 0-4.998-1.556-2.049-1.64-2.049-5.244z',
  },
  {
    id: 'interesting',
    glyph: '!?',
    title: 'Coup intéressant',
    description: 'Coup créatif et audacieux qui ouvre des perspectives tactiques ou complique la position.',
    fill: '#ea45d8',
    svgPath: 'M60.823 58.9q0-4.098 1.72-6.883 1.721-2.786 5.9-5.818 3.687-2.622 5.243-4.506 1.64-1.966 1.64-4.588t-1.967-3.933q-1.885-1.393-5.326-1.393t-6.8 1.065q-3.36 1.065-6.883 2.868l-4.343-8.767q4.015-2.212 8.685-3.605 4.67-1.393 10.242-1.393 8.521 0 13.192 4.097 4.752 4.096 4.752 10.405 0 3.36-1.065 5.818-1.066 2.458-3.196 4.588-2.13 2.048-5.326 4.424-2.376 1.72-3.687 2.95-1.31 1.229-1.802 2.376-.41 1.147-.41 2.868v2.376h-10.57zm-1.311 16.632q0-3.77 2.048-5.244 2.049-1.557 4.998-1.557 2.868 0 4.916 1.557 2.049 1.475 2.049 5.244 0 3.605-2.049 5.244-2.048 1.556-4.916 1.556-2.95 0-4.998-1.556-2.048-1.64-2.048-5.244zM36.967 61.849h-9.75l-2.049-39.083h13.847zM25.004 75.532q0-3.77 2.049-5.244 2.048-1.557 4.998-1.557 2.867 0 4.916 1.557 2.048 1.475 2.048 5.244 0 3.605-2.048 5.244-2.049 1.556-4.916 1.556-2.95 0-4.998-1.556-2.049-1.64-2.049-5.244z',
  },
  {
    id: 'inaccuracy',
    glyph: '?!',
    title: 'Imprécision',
    description: 'Coup jouable mais légèrement sous-optimal, laissant échapper une partie de l\'avantage.',
    fill: '#56b4e9',
    svgPath: 'M37.734 21.947c-3.714 0-7.128.464-10.242 1.393-3.113.928-6.009 2.13-8.685 3.605l4.343 8.766c2.35-1.202 4.644-2.157 6.883-2.867a22.366 22.366 0 0 1 6.799-1.065c2.294 0 4.07.464 5.326 1.393 1.311.874 1.967 2.186 1.967 3.933 0 1.748-.546 3.277-1.639 4.588-1.038 1.257-2.786 2.758-5.244 4.506-2.786 2.021-4.751 3.961-5.898 5.819-1.147 1.857-1.721 4.15-1.721 6.88v2.952h10.568v-2.377c0-1.147.137-2.103.41-2.868.328-.764.93-1.557 1.803-2.376.874-.82 2.104-1.803 3.688-2.95 2.13-1.584 3.906-3.058 5.326-4.424 1.42-1.42 2.485-2.95 3.195-4.59.71-1.638 1.065-3.576 1.065-5.816 0-4.206-1.584-7.675-4.752-10.406-3.114-2.731-7.51-4.096-13.192-4.096zm24.745.819 2.048 39.084h9.75l2.047-39.084zM35.357 68.73c-1.966 0-3.632.52-4.998 1.557-1.365.983-2.047 2.732-2.047 5.244 0 2.404.682 4.152 2.047 5.244 1.366 1.038 3.032 1.557 4.998 1.557 1.912 0 3.55-.519 4.916-1.557 1.366-1.092 2.05-2.84 2.05-5.244 0-2.512-.684-4.26-2.05-5.244-1.365-1.038-3.004-1.557-4.916-1.557zm34.004 0c-1.966 0-3.632.52-4.998 1.557-1.365.983-2.049 2.732-2.049 5.244 0 2.404.684 4.152 2.05 5.244 1.365 1.038 3.03 1.557 4.997 1.557 1.912 0 3.55-.519 4.916-1.557 1.366-1.092 2.047-2.84 2.047-5.244 0-2.512-.681-4.26-2.047-5.244-1.365-1.038-3.004-1.557-4.916-1.557z',
  },
  {
    id: 'mistake',
    glyph: '?',
    title: 'Erreur',
    description: 'Coup affaiblissant nettement la position ou cédant un avantage tangible à l\'adversaire.',
    fill: '#e69f00',
    svgPath: 'M40.436 60.851q0-4.66 1.957-7.83 1.958-3.17 6.712-6.619 4.195-2.983 5.967-5.127 1.864-2.237 1.864-5.22 0-2.983-2.237-4.475-2.144-1.585-6.06-1.585-3.915 0-7.737 1.212t-7.83 3.263l-4.941-9.975q4.568-2.517 9.881-4.101 5.314-1.585 11.653-1.585 9.695 0 15.008 4.661 5.407 4.661 5.407 11.839 0 3.822-1.212 6.619-1.212 2.796-3.635 5.22-2.424 2.33-6.06 5.034-2.703 1.958-4.195 3.356-1.491 1.398-2.05 2.703-.467 1.305-.467 3.263v2.703H40.436zm-1.492 18.924q0-4.288 2.33-5.966 2.331-1.771 5.687-1.771 3.263 0 5.594 1.771 2.33 1.678 2.33 5.966 0 4.102-2.33 5.966-2.331 1.772-5.594 1.772-3.356 0-5.686-1.772-2.33-1.864-2.33-5.966z',
  },
  {
    id: 'blunder',
    glyph: '??',
    title: 'Gaffe / Coup risqué',
    description: 'Erreur majeure (perte matérielle ou opportunité décisive manquée). Le coach intervient pour proposer de rejouer.',
    fill: '#df5353',
    svgPath: 'M31.8 22.22c-3.675 0-7.052.46-10.132 1.38-3.08.918-5.945 2.106-8.593 3.565l4.298 8.674c2.323-1.189 4.592-2.136 6.808-2.838a22.138 22.138 0 0 1 6.728-1.053c2.27 0 4.025.46 5.268 1.378 1.297.865 1.946 2.16 1.946 3.89s-.541 3.242-1.622 4.539c-1.027 1.243-2.756 2.73-5.188 4.458-2.756 2-4.7 3.918-5.836 5.755-1.134 1.837-1.702 4.107-1.702 6.808v2.92h10.457v-2.35c0-1.135.135-2.082.406-2.839.324-.756.918-1.54 1.783-2.35.864-.81 2.079-1.784 3.646-2.918 2.107-1.568 3.863-3.026 5.268-4.376 1.405-1.405 2.46-2.92 3.162-4.541.703-1.621 1.054-3.54 1.054-5.755 0-4.161-1.568-7.592-4.702-10.294-3.08-2.702-7.43-4.052-13.05-4.052zm38.664 0c-3.675 0-7.053.46-10.133 1.38-3.08.918-5.944 2.106-8.591 3.565l4.295 8.674c2.324-1.189 4.593-2.136 6.808-2.838a22.138 22.138 0 0 1 6.728-1.053c2.27 0 4.026.46 5.269 1.378 1.297.865 1.946 2.16 1.946 3.89s-.54 3.242-1.62 4.539c-1.027 1.243-2.757 2.73-5.189 4.458-2.756 2-4.7 3.918-5.835 5.755-1.135 1.837-1.703 4.107-1.703 6.808v2.92h10.457v-2.35c0-1.135.134-2.082.404-2.839.324-.756.918-1.54 1.783-2.35.865-.81 2.081-1.784 3.648-2.918 2.108-1.568 3.864-3.026 5.269-4.376 1.405-1.405 2.46-2.92 3.162-4.541.702-1.621 1.053-3.54 1.053-5.755 0-4.161-1.567-7.592-4.702-10.294-3.08-2.702-7.43-4.052-13.05-4.052zM29.449 68.504c-1.945 0-3.593.513-4.944 1.54-1.351.973-2.027 2.703-2.027 5.188 0 2.378.676 4.108 2.027 5.188 1.35 1.027 3 1.54 4.944 1.54 1.892 0 3.512-.513 4.863-1.54 1.35-1.08 2.026-2.81 2.026-5.188 0-2.485-.675-4.215-2.026-5.188-1.351-1.027-2.971-1.54-4.863-1.54zm38.663 0c-1.945 0-3.592.513-4.943 1.54-1.35.973-2.026 2.703-2.026 5.188 0 2.378.675 4.108 2.026 5.188 1.351 1.027 2.998 1.54 4.943 1.54 1.891 0 3.513-.513 4.864-1.54 1.351-1.08 2.027-2.81 2.027-5.188 0-2.485-.676-4.215-2.027-5.188-1.35-1.027-2.973-1.54-4.864-1.54z',
  },
  {
    id: 'forced',
    glyph: '□',
    title: 'Coup forcé',
    description: 'Seul coup légal ou unique coup rationnel permettant d\'éviter la défaite immédiate.',
    fill: '#a04048',
    svgPath: 'M30,30 H70 V70 H30 z',
    isStroke: true,
    strokeWidth: 7,
  },
];

const tacticalGlyphs: LegendGlyphItem[] = [
  {
    id: 'pin',
    title: 'Clouage',
    description: 'La pièce clouée ne peut bouger sans exposer une pièce de valeur supérieure ou le Roi.',
    fill: '#333333',
    svgPath: 'M31 21V28L37 30 34 47 27 50V57H45V77L50 86 55 77V57H73V50L66 47 63 30 69 28V21Z',
  },
  {
    id: 'undefended',
    title: 'Pièce non défendue / En prise',
    description: 'La pièce ciblée ne dispose d\'aucun défenseur allié et peut être capturée.',
    fill: '#df5353',
    svgPath: 'M50 17 80 27v25c0 25-30 36-30 36S20 77 20 52V27ZM44 51 34 61 40 67 50 57 60 67 66 61 56 51 66 41 60 35 50 45 40 35 34 41Z',
  },
  {
    id: 'checkable',
    title: 'Menace d\'échec',
    description: 'Indique qu\'un coup d\'échec direct au Roi adverse est immédiatement possible.',
    fill: '#2660a4',
    svgPath: 'M46 28H54V46H72V54H54V72H46V54H28V46H46Z',
  },
  {
    id: 'trapped',
    title: 'Pièce piégée',
    description: 'La pièce est assiégée sans case de repli sécurisée disponible.',
    fill: '#df5353',
    svgPath: 'M32 46V36A18 18 0 0 1 68 36V46H76V82H24V46ZM40 46H60V36A10 10 0 0 0 40 36ZM55 59A1 1 0 0 0 45 59V72H55Z',
    fillRule: 'evenodd',
  },
];
</script>
