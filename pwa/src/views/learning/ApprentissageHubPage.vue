<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Apprentissage</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <ion-header collapse="condense">
          <ion-toolbar>
            <ion-title size="large">Apprentissage</ion-title>
          </ion-toolbar>
        </ion-header>

        <div class="hub-container">
          <!-- PANNEAU 1 : COURS & EXERCICES TACTIQUES (Soumis à autorisation) -->
          <ion-card
            class="hub-panel-card cours-panel"
            :button="canAccessCours"
            :router-link="canAccessCours ? '/tabs/apprentissage/cours' : undefined"
          >

            <ion-card-header>
              <div class="panel-header">
                <div class="panel-icon-wrapper cours-icon">
                  <ion-icon :icon="schoolOutline"></ion-icon>
                </div>
                <div class="panel-badge-wrapper">
                  <ion-badge v-if="canAccessCours && apprentissageStore.coursAssignes.length > 0" color="primary">
                    📌 {{ apprentissageStore.coursAssignes.length }} assigné{{ apprentissageStore.coursAssignes.length > 1 ? 's' : '' }}
                  </ion-badge>
                  <ion-badge v-else-if="canAccessCours" color="success">Accès autorisé</ion-badge>
                  <ion-badge v-else color="warning">
                    <ion-icon :icon="constructOutline" class="mini-lock"></ion-icon> En développement
                  </ion-badge>
                </div>
              </div>
              <ion-card-title class="panel-title">Cours, Leçons & Exercices</ion-card-title>
            </ion-card-header>

            <ion-card-content>
              <div v-if="canAccessCours" class="panel-status-ok">
                <p>Accédez à tous vos chapitres, leçons et exercices tactiques progressifs (accès développeur / encadrant).</p>
                <div class="action-link">
                  <span>Ouvrir les cours</span>
                  <ion-icon :icon="arrowForwardOutline"></ion-icon>
                </div>
              </div>

              <!-- Si connecté mais rôle non autorisé -->
              <div v-else-if="authStore.isAuthenticated" class="panel-status-locked dev-notice">
                <div class="dev-status-tag">
                  <ion-icon :icon="constructOutline"></ion-icon>
                  <strong>Module en cours de développement</strong>
                </div>
                <p class="dev-desc">
                  L'accès est temporairement restreint aux profils autorisés (administrateurs, entraîneurs...).
                </p>
                <ion-button fill="outline" size="small" router-link="/tabs/profil" class="ion-margin-top">
                  <ion-icon slot="start" :icon="personOutline"></ion-icon>
                  Changer de profil
                </ion-button>
              </div>

              <!-- Si visiteur non connecté -->
              <div v-else class="panel-status-locked dev-notice">
                <div class="dev-status-tag">
                  <ion-icon :icon="constructOutline"></ion-icon>
                  <strong>Module en cours de développement</strong>
                </div>
                <p class="dev-desc">
                  L'accès est actuellement réservé aux profils autorisés.
                </p>
                <ion-button fill="outline" size="small" router-link="/tabs/profil" class="ion-margin-top">
                  <ion-icon slot="start" :icon="logInOutline"></ion-icon>
                  Se connecter
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- PANNEAU 2 : ESPACE DE JEU & ÉCHIQUIER (Libre d'accès pour tous) -->
          <ion-card
            class="hub-panel-card play-panel"
            button
            router-link="/play"
          >
            <ion-card-header>
              <div class="panel-header">
                <div class="panel-icon-wrapper play-icon">
                  <ion-icon :icon="gameControllerOutline"></ion-icon>
                </div>
                <div class="panel-badge-wrapper">
                  <ion-badge color="primary">Échiquier</ion-badge>
                </div>
              </div>
              <ion-card-title class="panel-title">Partie d'Échecs</ion-card-title>
            </ion-card-header>

            <ion-card-content>
              <p>Jouez une partie complète contre l'ordinateur (Stockfish) ou à 2 joueurs sur le même écran.</p>
              <div class="action-link ion-margin-top">
                <span>Lancer l'échiquier</span>
                <ion-icon :icon="arrowForwardOutline"></ion-icon>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- PANNEAU 3 : ANALYSE DE PARTIE (En développement) -->
          <ion-card
            class="hub-panel-card analysis-panel card-in-dev"
            :button="false"
          >
            <div class="dev-ribbon-wrapper">
              <div class="dev-ribbon">En dev</div>
            </div>

            <ion-card-header>
              <div class="panel-header">
                <div class="panel-icon-wrapper analysis-icon">
                  <ion-icon :icon="analyticsOutline"></ion-icon>
                </div>
                <div class="panel-badge-wrapper">
                  <ion-badge color="warning">
                    <ion-icon :icon="constructOutline" class="mini-lock"></ion-icon> En développement
                  </ion-badge>
                </div>
              </div>
              <ion-card-title class="panel-title">Analyse de partie</ion-card-title>
            </ion-card-header>

            <ion-card-content>
              <p>Saisissez et analysez vos parties, puis transmettez-les à votre entraîneur.</p>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonButton
} from '@ionic/vue';
import { useAuthStore } from '@/stores/auth';
import { useApprentissageStore } from '@/stores/apprentissage';
import {
  schoolOutline,
  gameControllerOutline,
  analyticsOutline,
  arrowForwardOutline,
  personOutline,
  logInOutline,
  constructOutline
} from 'ionicons/icons';

const authStore = useAuthStore();
const apprentissageStore = useApprentissageStore();

const canAccessCours = computed(() => {
  return authStore.isAuthenticated && authStore.canAccessApprentissage;
});
</script>
