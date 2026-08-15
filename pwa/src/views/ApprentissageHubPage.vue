<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Apprentissage & Pratique</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <ion-header collapse="condense">
          <ion-toolbar>
            <ion-title size="large">Apprentissage & Pratique</ion-title>
          </ion-toolbar>
        </ion-header>

        <div class="hub-container">
          <!-- PANNEAU 1 : COURS & EXERCICES TACTIQUES (Soumis à autorisation) -->
          <ion-card
            class="hub-panel-card cours-panel"
            :class="{ 'card-in-dev': true }"
            :button="canAccessCours"
            :router-link="canAccessCours ? '/apprentissage/cours' : undefined"
          >
            <!-- Stamp / Ribbon diagonal En développement -->
            <div class="dev-ribbon-wrapper">
              <div class="dev-ribbon">En dev</div>
            </div>

            <ion-card-header>
              <div class="panel-header">
                <div class="panel-icon-wrapper cours-icon">
                  <ion-icon :icon="schoolOutline"></ion-icon>
                </div>
                <div class="panel-badge-wrapper">
                  <ion-badge v-if="canAccessCours" color="success">Accès autorisé</ion-badge>
                  <ion-badge v-else color="warning">
                    <ion-icon :icon="constructOutline" class="mini-lock"></ion-icon> En développement
                  </ion-badge>
                </div>
              </div>
              <ion-card-title class="panel-title">Cours, Leçons & Exercices</ion-card-title>
              <ion-card-subtitle class="panel-subtitle">Entraînement théorique et exercices interactifs</ion-card-subtitle>
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
                  Ce module fait actuellement l'objet de développements et de tests. L'accès est temporairement restreint aux profils autorisés (administrateurs, entraîneurs...).
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
                  L'accès est actuellement réservé aux profils autorisés durant la phase de développement.
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
              <ion-card-subtitle class="panel-subtitle">Jouer sur un échiquier interactif</ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <p>Jouez une partie complète contre l'ordinateur (Stockfish) ou à 2 joueurs sur le même écran.</p>
              
              <div class="play-features-chips ion-margin-top">
                <span class="feature-chip">🤖 Solo vs Stockfish</span>
                <span class="feature-chip">👥 À 2 joueurs (Pass & Play)</span>
                <span class="feature-chip disabled">🌐 En ligne (À l'étude)</span>
              </div>

              <div class="action-link ion-margin-top">
                <span>Lancer l'échiquier</span>
                <ion-icon :icon="arrowForwardOutline"></ion-icon>
              </div>
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
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonButton
} from '@ionic/vue';
import { useAuthStore } from '@/stores/auth';
import {
  schoolOutline,
  gameControllerOutline,
  lockClosedOutline,
  arrowForwardOutline,
  personOutline,
  logInOutline,
  constructOutline
} from 'ionicons/icons';

const authStore = useAuthStore();

const canAccessCours = computed(() => {
  return authStore.isAuthenticated && authStore.canAccessApprentissage;
});
</script>

<style scoped>
.safe-area-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.hub-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 10px;
}

.hub-panel-card {
  position: relative;
  margin: 0;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

/* --- Ribbon diagonal En développement --- */
.dev-ribbon-wrapper {
  position: absolute;
  top: 0;
  right: 0;
  width: 110px;
  height: 110px;
  overflow: hidden;
  pointer-events: none;
  z-index: 10;
}

.dev-ribbon {
  position: absolute;
  top: 22px;
  right: -32px;
  transform: rotate(45deg);
  width: 140px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  padding: 4px 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.card-in-dev {
  border: 1px dashed rgba(245, 158, 11, 0.4);
}

.dev-notice {
  background: rgba(245, 158, 11, 0.08);
  border-left: 3px solid #f59e0b;
}

.dev-status-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b45309;
  font-size: 0.92rem;
  margin-bottom: 6px;
}

.dev-desc {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.4;
  color: var(--ion-color-step-700, #444);
}

.hub-panel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}

.cours-icon {
  background: rgba(var(--ion-color-tertiary-rgb, 112, 68, 255), 0.15);
  color: var(--ion-color-tertiary, #7044ff);
}

.play-icon {
  background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.15);
  color: var(--ion-color-primary, #3880ff);
}

.panel-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 4px;
}

.panel-subtitle {
  font-size: 0.9rem;
  color: var(--ion-color-step-600, #666);
  margin-top: 2px;
}

.mini-lock {
  font-size: 0.8rem;
  vertical-align: -1px;
}

.action-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--ion-color-primary, #3880ff);
  margin-top: 10px;
}

.play-features-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feature-chip {
  font-size: 0.8rem;
  padding: 4px 10px;
  background: var(--ion-color-step-100, #f4f5f8);
  border-radius: 20px;
  color: var(--ion-color-step-800, #222);
}

.feature-chip.disabled {
  opacity: 0.6;
  font-style: italic;
}

.panel-status-locked {
  background: var(--ion-color-step-50, #fafafa);
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  color: var(--ion-color-step-700, #555);
}
</style>
